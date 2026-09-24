<?php
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

require_once 'config.php';
require_once 'permissions.php';
require_once 'audit.php';

function syncSacramentSchedulesToLivestreams($conn) {
    $scheduleResult = $conn->query("SELECT * FROM parish_schedules WHERE event_title LIKE '%[Sacrament:%' ORDER BY start_datetime DESC");
    if (!$scheduleResult) {
        error_log('Livestream sacrament schedule query failed: ' . $conn->error);
        return;
    }

    $referenceTypes = [
        'baptismal' => ['baptismal_records', 'Baptism'],
        'baptism' => ['baptismal_records', 'Baptism'],
        'baptisms' => ['baptismal_records', 'Baptism'],
        'marriage' => ['marriage_records', 'Wedding'],
        'confirmation' => ['confirmation_records', 'Confirmation'],
        'communion' => ['communion_records', 'Communion'],
        'burial' => ['burial_records', 'Burial'],
    ];

    while ($schedule = $scheduleResult->fetch_assoc()) {
        if (!preg_match('/\[Sacrament:([^:]+):(\d+)\]/', $schedule['event_title'], $marker)) {
            continue;
        }

        $sacramentType = strtolower($marker[1]);
        $recordId = (int)$marker[2];
        if (!isset($referenceTypes[$sacramentType])) {
            continue;
        }

        [$referenceType, $livestreamType] = $referenceTypes[$sacramentType];
        $assignedPriestId = (int)($schedule['assigned_priest'] ?? 0);
        if ($assignedPriestId > 0) {
            $unavailability = findPriestUnavailabilityConflict($conn, $assignedPriestId, $schedule['start_datetime'], $schedule['end_datetime'] ?: $schedule['start_datetime']);
            if ($unavailability) {
                error_log('Skipped unavailable priest sacrament livestream ' . $recordId . ' on ' . $unavailability['unavailable_date']);
                continue;
            }
        }
        $existing = $conn->query("SELECT livestream_id FROM livestream_events
                                  WHERE event_reference_type = '" . $conn->real_escape_string($referenceType) . "'
                                    AND event_reference_id = $recordId LIMIT 1");
        if ($existing && $existing->num_rows > 0) {
            continue;
        }

        $title = trim(preg_replace('/\s*\[Sacrament:[^]]+\]\s*/', ' ', $schedule['event_title']));
        $title = $title !== '' ? $title : $livestreamType;
        $scheduledStart = $conn->real_escape_string($schedule['start_datetime']);
        $scheduledEnd = $schedule['end_datetime'] ? "'" . $conn->real_escape_string($schedule['end_datetime']) . "'" : 'NULL';
        $status = $schedule['status'] === 'Cancelled' ? 'Cancelled' : 'Scheduled';
        $insert = "INSERT INTO livestream_events
                   (event_type, event_reference_id, event_reference_type, title, description, scheduled_start, scheduled_end, status, location)
                   VALUES ('" . $conn->real_escape_string($livestreamType) . "', $recordId,
                           '" . $conn->real_escape_string($referenceType) . "', '" . $conn->real_escape_string($title) . "',
                           'Created automatically from parish schedule " . (int)$schedule['schedule_id'] . "',
                           '$scheduledStart', $scheduledEnd, '$status', '" . $conn->real_escape_string($schedule['location']) . "')";
        if (!$conn->query($insert)) {
            error_log('Failed to create sacrament livestream: ' . $conn->error);
        }
    }
}

$request_method = $_SERVER['REQUEST_METHOD'];

if ($request_method === 'GET') {
    // Get livestreams or a single event
    $id = isset($_GET['id']) ? intval($_GET['id']) : null;

    if ($id) {
                $query = "SELECT le.*, (
                                        SELECT lr.recording_url
                                        FROM livestream_recordings lr
                                        WHERE lr.livestream_id = le.livestream_id AND lr.is_available = 1
                                        ORDER BY lr.created_at DESC LIMIT 1
                                    ) AS recording_url
                                    FROM livestream_events le WHERE le.livestream_id = $id LIMIT 1";
        $result = $conn->query($query);
        if (!$result) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Query failed: ' . $conn->error]);
            exit();
        }
        $event = $result->fetch_assoc();
        http_response_code(200);
        echo json_encode(['success' => true, 'data' => $event]);
        exit();
    }

    syncSacramentSchedulesToLivestreams($conn);

    $query = "SELECT * FROM livestream_events ORDER BY scheduled_start DESC";
    $result = $conn->query($query);
    if (!$result) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Query failed: ' . $conn->error]);
        exit();
    }

    $events = [];
    while ($row = $result->fetch_assoc()) {
        $events[] = $row;
    }

    http_response_code(200);
    echo json_encode(['success' => true, 'data' => $events, 'count' => count($events)]);

} elseif ($request_method === 'POST') {
    // Create livestream event
    $data = json_decode(file_get_contents("php://input"), true);
    $user_id = isset($data['user_id']) ? intval($data['user_id']) : null;

    if (empty($data['title']) || empty($data['scheduled_start'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing required fields: title and scheduled_start']);
        exit();
    }

    $title = $conn->real_escape_string($data['title']);
    $description = $conn->real_escape_string($data['description'] ?? '');
    $event_type = $conn->real_escape_string($data['event_type'] ?? 'Other');
    $scheduled_start = $conn->real_escape_string($data['scheduled_start']);
    $scheduled_end = $conn->real_escape_string($data['scheduled_end'] ?? null);
    $streaming_url = $conn->real_escape_string($data['streaming_url'] ?? null);
    $backup_streaming_url = $conn->real_escape_string($data['backup_streaming_url'] ?? null);
    $location = $conn->real_escape_string($data['location'] ?? 'Parish Church');
    $max_viewers = isset($data['max_viewers']) ? intval($data['max_viewers']) : null;
    $status = $conn->real_escape_string($data['status'] ?? 'Scheduled');
    $event_reference_id = isset($data['event_reference_id']) && $data['event_reference_id'] !== '' ? intval($data['event_reference_id']) : 'NULL';
    $reference_type = $data['event_reference_type'] ?? ($data['event_type'] === 'Baptism' ? 'baptismal_records' : 'marriage_records');
    $event_reference_type = $event_reference_id !== 'NULL' ? "'" . $conn->real_escape_string($reference_type) . "'" : 'NULL';

    $query = "INSERT INTO livestream_events (event_type, event_reference_id, event_reference_type, title, description, scheduled_start, scheduled_end, status, streaming_url, backup_streaming_url, location, max_viewers, created_by) VALUES ('${event_type}', $event_reference_id, $event_reference_type, '${title}', '${description}', '${scheduled_start}', " . ($scheduled_end ? "'${scheduled_end}'" : "NULL") . ", '${status}', " . ($streaming_url ? "'${streaming_url}'" : "NULL") . ", " . ($backup_streaming_url ? "'${backup_streaming_url}'" : "NULL") . ", '${location}', " . ($max_viewers !== null ? $max_viewers : "NULL") . ", " . ($user_id ? $user_id : "NULL") . ")";

    if ($conn->query($query) === TRUE) {
        $livestream_id = $conn->insert_id;
        if ($user_id && $user_id > 0) {
            logAuditAction($user_id, 'CREATE', 'livestream_events', "Created livestream event: $title", $conn);
        }
        http_response_code(201);
        echo json_encode(['success' => true, 'message' => 'Livestream event created', 'livestream_id' => $livestream_id]);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to create event: ' . $conn->error]);
    }

} elseif ($request_method === 'PUT') {
    // Update livestream event
    $data = json_decode(file_get_contents("php://input"), true);
    $id = isset($_GET['id']) ? intval($_GET['id']) : (isset($data['livestream_id']) ? intval($data['livestream_id']) : null);
    $user_id = isset($data['user_id']) ? intval($data['user_id']) : null;

    if (!$id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'livestream_id is required']);
        exit();
    }

    $updates = [];
    if (isset($data['title'])) $updates[] = "title = '" . $conn->real_escape_string($data['title']) . "'";
    if (isset($data['description'])) $updates[] = "description = '" . $conn->real_escape_string($data['description']) . "'";
    if (isset($data['event_type'])) $updates[] = "event_type = '" . $conn->real_escape_string($data['event_type']) . "'";
    if (array_key_exists('event_reference_id', $data)) {
        $reference_id = $data['event_reference_id'] !== '' && $data['event_reference_id'] !== null ? intval($data['event_reference_id']) : 'NULL';
        $updates[] = "event_reference_id = $reference_id";
        $reference_type = $data['event_reference_type'] ?? ((($data['event_type'] ?? '') === 'Baptism') ? 'baptismal_records' : 'marriage_records');
        $updates[] = "event_reference_type = " . ($reference_id === 'NULL' ? 'NULL' : "'" . $conn->real_escape_string($reference_type) . "'");
    }
    if (isset($data['event_reference_type']) && !array_key_exists('event_reference_id', $data)) {
        $updates[] = "event_reference_type = '" . $conn->real_escape_string($data['event_reference_type']) . "'";
    }
    if (isset($data['scheduled_start'])) $updates[] = "scheduled_start = '" . $conn->real_escape_string($data['scheduled_start']) . "'";
    if (isset($data['scheduled_end'])) $updates[] = "scheduled_end = '" . $conn->real_escape_string($data['scheduled_end']) . "'";
    if (isset($data['actual_start'])) $updates[] = "actual_start = '" . $conn->real_escape_string($data['actual_start']) . "'";
    if (isset($data['actual_end'])) $updates[] = "actual_end = '" . $conn->real_escape_string($data['actual_end']) . "'";
    if (isset($data['status'])) $updates[] = "status = '" . $conn->real_escape_string($data['status']) . "'";
    if (isset($data['streaming_url'])) $updates[] = "streaming_url = '" . $conn->real_escape_string($data['streaming_url']) . "'";
    if (isset($data['backup_streaming_url'])) $updates[] = "backup_streaming_url = '" . $conn->real_escape_string($data['backup_streaming_url']) . "'";
    if (isset($data['location'])) $updates[] = "location = '" . $conn->real_escape_string($data['location']) . "'";
    if (isset($data['max_viewers'])) $updates[] = "max_viewers = " . intval($data['max_viewers']);
    if (isset($data['current_viewers'])) $updates[] = "current_viewers = " . intval($data['current_viewers']);
    if (isset($data['updated_by'])) $updates[] = "updated_by = " . intval($data['updated_by']);

    if (empty($updates)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'No fields to update']);
        exit();
    }

    $query = "UPDATE livestream_events SET " . implode(', ', $updates) . " WHERE livestream_id = $id";
    if ($conn->query($query) === TRUE) {
        if (($data['status'] ?? null) === 'Ended') {
            $eventResult = $conn->query("SELECT title, streaming_url FROM livestream_events WHERE livestream_id = $id LIMIT 1");
            $event = $eventResult ? $eventResult->fetch_assoc() : null;
            $recordingUrl = $event['streaming_url'] ?? '';

            // External stream URLs can remain playable after the live event ends.
            // Browser blob URLs are temporary and must not be saved as replays.
            if ($recordingUrl !== '' && !preg_match('/^blob:/i', $recordingUrl)) {
                $recordingUrlEscaped = $conn->real_escape_string($recordingUrl);
                $existingRecording = $conn->query("SELECT recording_id FROM livestream_recordings WHERE livestream_id = $id AND is_available = 1 LIMIT 1");
                if ($existingRecording && $existingRecording->num_rows === 0) {
                    $title = $conn->real_escape_string(($event['title'] ?? 'Livestream') . ' Replay');
                    $createdBy = $user_id ? $user_id : 'NULL';
                    $conn->query("INSERT INTO livestream_recordings (livestream_id, recording_url, recording_quality, is_available, access_level, created_by) VALUES ($id, '$recordingUrlEscaped', '720p', 1, 'Private', $createdBy)");
                }
            }
        }
        if ($user_id && $user_id > 0) {
            logAuditAction($user_id, 'UPDATE', 'livestream_events', "Updated livestream event $id", $conn);
        }
        http_response_code(200);
        echo json_encode(['success' => true, 'message' => 'Livestream event updated']);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to update event: ' . $conn->error]);
    }

} elseif ($request_method === 'DELETE') {
    // Delete livestream event
    $id = isset($_GET['id']) ? intval($_GET['id']) : null;
    $user_id = isset($_GET['user_id']) ? intval($_GET['user_id']) : null;

    if (!$id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'id is required']);
        exit();
    }

    if ($conn->query("DELETE FROM livestream_events WHERE livestream_id = $id") === TRUE) {
        if ($user_id && $user_id > 0) {
            logAuditAction($user_id, 'DELETE', 'livestream_events', "Deleted livestream event $id", $conn);
        }
        http_response_code(200);
        echo json_encode(['success' => true, 'message' => 'Livestream event deleted']);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to delete event: ' . $conn->error]);
    }

} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}

$conn->close();
?>