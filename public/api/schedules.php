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
require_once __DIR__ . '/UserNotificationHelper.php';

function findExistingSacramentSchedule($conn, $recordType, $recordId) {
    $normalizedType = strtolower(trim((string)$recordType));
    $typeMap = [
        'baptismal' => 'Baptismal',
        'baptism' => 'Baptism',
        'baptisms' => 'Baptism',
        'marriage' => 'Marriage',
        'communion' => 'Communion',
        'burial' => 'Burial',
    ];

    $relatedType = $typeMap[$normalizedType] ?? ucfirst($normalizedType);
    $recordIdValue = (int)$recordId;

    $relatedQuery = "SELECT schedule_id FROM parish_schedules WHERE related_record_type = '" . $conn->real_escape_string($relatedType) . "' AND related_record_id = $recordIdValue LIMIT 1";
    $relatedResult = $conn->query($relatedQuery);
    if ($relatedResult && $relatedResult->num_rows > 0) {
        return (int)$relatedResult->fetch_assoc()['schedule_id'];
    }

    $marker = '[Sacrament:' . $normalizedType . ':' . $recordIdValue . ']';
    $markerEscaped = $conn->real_escape_string($marker);
    $titleQuery = "SELECT schedule_id FROM parish_schedules WHERE event_title LIKE '%$markerEscaped%' LIMIT 1";
    $titleResult = $conn->query($titleQuery);
    if ($titleResult && $titleResult->num_rows > 0) {
        return (int)$titleResult->fetch_assoc()['schedule_id'];
    }

    return null;
}

function syncMissingSacramentSchedules($conn) {
    $records = [];
    $queries = [
        "SELECT 'baptismal' AS sacrament_type, b.baptism_id AS record_id, b.baptism_date AS sacrament_date,
                b.priest_id, CONCAT_WS(' ', p.first_name, p.last_name) AS subject_name, 'Baptism' AS event_type,
                'Parish Church' AS location
         FROM baptismal_records b
         LEFT JOIN persons p ON p.person_id = b.person_id",
        "SELECT 'marriage' AS sacrament_type, m.marriage_id AS record_id, m.marriage_date AS sacrament_date,
                m.priest_id, CONCAT_WS(' ', groom.first_name, groom.last_name, ' & ', bride.first_name, bride.last_name) AS subject_name,
                'Wedding' AS event_type, 'Parish Church' AS location
         FROM marriage_records m
         LEFT JOIN persons groom ON groom.person_id = m.groom_id
         LEFT JOIN persons bride ON bride.person_id = m.bride_id",
        "SELECT 'communion' AS sacrament_type, c.communion_id AS record_id, c.communion_date AS sacrament_date,
                c.priest_id, CONCAT_WS(' ', p.first_name, p.last_name) AS subject_name, 'Mass' AS event_type,
                'Parish Church' AS location
         FROM communion_records c
         LEFT JOIN persons p ON p.person_id = c.person_id",
        "SELECT 'burial' AS sacrament_type, b.burial_id AS record_id, b.burial_date AS sacrament_date,
                b.priest_id, CONCAT_WS(' ', p.first_name, p.last_name) AS subject_name, 'Funeral' AS event_type,
                COALESCE(NULLIF(b.place_of_interment, ''), 'Parish Church') AS location
         FROM burial_records b
         LEFT JOIN persons p ON p.person_id = b.person_id",
    ];

    foreach ($queries as $query) {
        $result = $conn->query($query);
        if (!$result) {
            error_log('Sacrament schedule sync query failed: ' . $conn->error);
            continue;
        }

        while ($record = $result->fetch_assoc()) {
            $sacramentType = strtolower(trim((string)($record['sacrament_type'] ?? '')));
            $recordId = (int)($record['record_id'] ?? 0);
            if (empty($record['sacrament_date']) || $recordId <= 0) {
                continue;
            }

            $existingId = findExistingSacramentSchedule($conn, $sacramentType, $recordId);
            if ($existingId !== null) {
                continue;
            }

            $marker = '[Sacrament:' . $sacramentType . ':' . $recordId . ']';
            $startTimestamp = strtotime($record['sacrament_date'] . ' 09:00:00');
            if ($startTimestamp === false) {
                continue;
            }

            $eventTitle = $record['event_type'] . ' - ' . ($record['subject_name'] ?: 'Parishioner') . ' ' . $marker;
            $startDatetime = date('Y-m-d H:i:s', $startTimestamp);
            $endDatetime = date('Y-m-d H:i:s', $startTimestamp + 3600);
            $assignedPriest = ((int)$record['priest_id'] > 0) ? (int)$record['priest_id'] : 'NULL';
            if ((int)$record['priest_id'] > 0) {
                $unavailability = findPriestUnavailabilityConflict($conn, (int)$record['priest_id'], $startDatetime, $endDatetime);
                if ($unavailability) {
                    error_log('Skipped unavailable priest sacrament schedule ' . $recordId . ' on ' . $unavailability['unavailable_date']);
                    continue;
                }
            }
            $relatedTypeMap = [
                'baptismal' => 'Baptismal',
                'marriage' => 'Marriage',
                'communion' => 'Communion',
                'burial' => 'Burial',
            ];
            $relatedType = $relatedTypeMap[$sacramentType] ?? ucfirst($sacramentType);

            $insert = "INSERT INTO parish_schedules (event_title, event_type, start_datetime, end_datetime, location, assigned_priest, status, related_record_type, related_record_id)
                       VALUES ('" . $conn->real_escape_string($eventTitle) . "', '" . $conn->real_escape_string($record['event_type']) . "',
                               '$startDatetime', '$endDatetime', '" . $conn->real_escape_string($record['location']) . "', $assignedPriest, 'Scheduled', '" . $conn->real_escape_string($relatedType) . "', $recordId)";
            if (!$conn->query($insert)) {
                error_log('Failed to backfill sacrament schedule: ' . $conn->error);
            }
        }
    }
}

$request_method = $_SERVER['REQUEST_METHOD'];

if ($request_method === 'GET') {
    // Backfill schedules for sacrament records created before automatic linking was added.
    syncMissingSacramentSchedules($conn);

    $query = "SELECT * FROM parish_schedules 
              ORDER BY start_datetime DESC";

    $result = $conn->query($query);

    if (!$result) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Query failed: ' . $conn->error]);
        exit();
    }

    $schedules = [];
    while ($row = $result->fetch_assoc()) {
        $schedules[] = $row;
    }

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'data' => $schedules,
        'count' => count($schedules)
    ]);

} elseif ($request_method === 'POST') {
    // Create new schedule
    $data = json_decode(file_get_contents("php://input"), true);
    $user_id = isset($data['user_id']) && intval($data['user_id']) > 0 ? intval($data['user_id']) : null;

    if (!isset($data['event_title']) || !isset($data['start_datetime'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing required fields']);
        exit();
    }

    $event_title = $conn->real_escape_string($data['event_title']);
    $event_type = $conn->real_escape_string($data['event_type'] ?? 'Meeting');
    $start_datetime = $conn->real_escape_string($data['start_datetime']);
    $end_datetime = $conn->real_escape_string($data['end_datetime'] ?? $data['start_datetime']);
    $location = $conn->real_escape_string($data['location'] ?? 'Parish Church');
    $assigned_priest_id = isset($data['assigned_priest']) && intval($data['assigned_priest']) > 0 ? intval($data['assigned_priest']) : null;
    $assigned_priest = $assigned_priest_id !== null ? $assigned_priest_id : 'NULL';
    $status = $conn->real_escape_string($data['status'] ?? 'Scheduled');
    $related_record_type = !empty($data['related_record_type']) ? "'" . $conn->real_escape_string($data['related_record_type']) . "'" : 'NULL';
    $related_record_id = !empty($data['related_record_id']) ? (int)$data['related_record_id'] : 'NULL';

    if (strtotime($data['start_datetime']) === false || strtotime($data['end_datetime'] ?? $data['start_datetime']) === false) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid schedule date or time']);
        exit();
    }

    if (strtotime($data['end_datetime'] ?? $data['start_datetime']) <= strtotime($data['start_datetime'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'End date/time must be after start date/time']);
        exit();
    }

    if ($assigned_priest_id && $status !== 'Cancelled') {
        $conflict = findPriestScheduleConflict($conn, $assigned_priest_id, $data['start_datetime'], $data['end_datetime'] ?? $data['start_datetime']);
        if ($conflict) {
            http_response_code(409);
            echo json_encode(['success' => false, 'message' => 'The selected priest is unavailable because another schedule overlaps this time.', 'conflict' => $conflict]);
            exit();
        }

        $unavailability = findPriestUnavailabilityConflict($conn, $assigned_priest_id, $data['start_datetime'], $data['end_datetime'] ?? $data['start_datetime']);
        if ($unavailability) {
            http_response_code(409);
            echo json_encode([
                'success' => false,
                'message' => 'This priest is marked unavailable on the selected date: ' . $unavailability['unavailable_date'] . ' (' . $unavailability['reason'] . ').',
                'conflict' => $unavailability
            ]);
            exit();
        }
    }

    $query = "INSERT INTO parish_schedules (event_title, event_type, start_datetime, end_datetime, location, assigned_priest, status, related_record_type, related_record_id)
              VALUES ('$event_title', '$event_type', '$start_datetime', '$end_datetime', '$location', " . ($assigned_priest_id !== null ? $assigned_priest : 'NULL') . ", '$status', $related_record_type, $related_record_id)";

    if ($conn->query($query) === TRUE) {
        $schedule_id = $conn->insert_id;
        
        // Log the action
        if ($user_id && $user_id > 0) {
            logAuditAction($user_id, 'CREATE', 'parish_schedules', "Created schedule: $event_title at $location", $conn);
        }

        if ($assigned_priest_id) {
            $notificationHelper = new UserNotificationHelper($conn);
            $cleanEventTitle = UserNotificationHelper::sanitizeNotificationText($event_title);
            $message = "May schedule ka: $cleanEventTitle sa $location sa " . date('F j, Y g:i A', strtotime($start_datetime));
            $options = [
                'action_url' => '/schedules',
                'action_type' => 'navigate'
            ];
            $notificationHelper->sendUserNotification($assigned_priest_id, $message, 'Schedules', $options);
            if ($notificationHelper->getErrors()) {
                error_log('Schedule notification error: ' . implode(', ', $notificationHelper->getErrors()));
            }
        }
        // If this is a scheduled livestream or event, create a system announcement and notification
        $lowerType = strtolower($event_type);
        if ($status === 'Scheduled' && (strpos($lowerType, 'live') !== false || strpos($lowerType, 'stream') !== false || strpos($lowerType, 'event') !== false)) {
            $announcementTitle = "Upcoming: $event_title";
            $announcementContent = "Magkakaroon ng $event_type: $event_title sa $location sa " . date('F j, Y g:i A', strtotime($start_datetime)) . ".";
            $created_by = $user_id && $user_id > 0 ? $user_id : 'NULL';
            $ins = "INSERT INTO announcements (title, content, created_by) VALUES ('" . $conn->real_escape_string($announcementTitle) . "', '" . $conn->real_escape_string($announcementContent) . "', " . ($created_by === 'NULL' ? 'NULL' : intval($created_by)) . ")";
            if ($conn->query($ins)) {
                logAuditAction($user_id, 'CREATE', 'announcements', "Auto-created announcement for schedule $schedule_id", $conn);
            } else {
                error_log('Failed to auto-create announcement: ' . $conn->error);
            }

            $notificationHelper = new UserNotificationHelper($conn);
            $sysMessage = "$event_type: $event_title scheduled on " . date('F j, Y g:i A', strtotime($start_datetime));
            $options = ['action_url' => '/announcements', 'action_type' => 'navigate'];
            $notificationHelper->sendSystemAnnouncement($sysMessage, 'Schedules', $options);
            if ($notificationHelper->getErrors()) {
                error_log('Schedule system announcement error: ' . implode(', ', $notificationHelper->getErrors()));
            }
        }
        
        http_response_code(201);
        echo json_encode([
            'success' => true,
            'message' => 'Schedule created successfully',
            'schedule_id' => $schedule_id
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to create schedule: ' . $conn->error]);
    }

} elseif ($request_method === 'PUT') {
    // update existing schedule
    $data = json_decode(file_get_contents("php://input"), true);
    $schedule_id = isset($_GET['id']) ? intval($_GET['id']) : (isset($data['schedule_id']) ? intval($data['schedule_id']) : null);
    $user_id = isset($data['user_id']) ? intval($data['user_id']) : null;

    if (!$schedule_id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'schedule_id is required']);
        exit();
    }

    $existingSchedule = null;
    $existingResult = $conn->query("SELECT * FROM parish_schedules WHERE schedule_id = $schedule_id LIMIT 1");
    if ($existingResult && $existingResult->num_rows > 0) {
        $existingSchedule = $existingResult->fetch_assoc();
    }

    $updates = [];
    if (isset($data['event_title'])) $updates[] = "event_title = '" . $conn->real_escape_string($data['event_title']) . "'";
    if (isset($data['event_type'])) $updates[] = "event_type = '" . $conn->real_escape_string($data['event_type']) . "'";
    if (isset($data['start_datetime'])) $updates[] = "start_datetime = '" . $conn->real_escape_string($data['start_datetime']) . "'";
    if (isset($data['end_datetime'])) $updates[] = "end_datetime = '" . $conn->real_escape_string($data['end_datetime']) . "'";
    if (isset($data['location'])) $updates[] = "location = '" . $conn->real_escape_string($data['location']) . "'";
    if (array_key_exists('related_record_type', $data)) $updates[] = "related_record_type = " . (!empty($data['related_record_type']) ? "'" . $conn->real_escape_string($data['related_record_type']) . "'" : 'NULL');
    if (array_key_exists('related_record_id', $data)) $updates[] = "related_record_id = " . (!empty($data['related_record_id']) ? (int)$data['related_record_id'] : 'NULL');
    if (isset($data['assigned_priest'])) {
        $assigned_priest_id = intval($data['assigned_priest']);
        $updates[] = "assigned_priest = " . ($assigned_priest_id > 0 ? $assigned_priest_id : 'NULL');
    } else {
        $assigned_priest_id = $existingSchedule ? intval($existingSchedule['assigned_priest']) : null;
    }
    if (isset($data['status'])) $updates[] = "status = '" . $conn->real_escape_string($data['status']) . "'";

    $updatedStart = $data['start_datetime'] ?? ($existingSchedule['start_datetime'] ?? null);
    $updatedEnd = $data['end_datetime'] ?? ($existingSchedule['end_datetime'] ?? null);
    $updatedStatus = $data['status'] ?? ($existingSchedule['status'] ?? null);
    if (!$existingSchedule || strtotime($updatedStart) === false || strtotime($updatedEnd) === false) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid schedule date or time']);
        exit();
    }
    if (strtotime($updatedEnd) <= strtotime($updatedStart)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'End date/time must be after start date/time']);
        exit();
    }
    if ($assigned_priest_id && $updatedStatus !== 'Cancelled') {
        $conflict = findPriestScheduleConflict($conn, $assigned_priest_id, $updatedStart, $updatedEnd, $schedule_id);
        if ($conflict) {
            http_response_code(409);
            echo json_encode(['success' => false, 'message' => 'The selected priest is unavailable because another schedule overlaps this time.', 'conflict' => $conflict]);
            exit();
        }

        $unavailability = findPriestUnavailabilityConflict($conn, $assigned_priest_id, $updatedStart, $updatedEnd, $schedule_id);
        if ($unavailability) {
            http_response_code(409);
            echo json_encode([
                'success' => false,
                'message' => 'This priest is marked unavailable on the selected date: ' . $unavailability['unavailable_date'] . ' (' . $unavailability['reason'] . ').',
                'conflict' => $unavailability
            ]);
            exit();
        }
    }

    if (empty($updates)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'No fields to update']);
        exit();
    }

    $query = "UPDATE parish_schedules SET " . implode(', ', $updates) . " WHERE schedule_id = $schedule_id";
    if ($conn->query($query) === TRUE) {
        if ($user_id && $user_id > 0) {
            logAuditAction($user_id, 'UPDATE', 'parish_schedules', "Updated schedule $schedule_id", $conn);
        }

        if ($assigned_priest_id && $existingSchedule) {
            $shouldNotify = false;
            $updatedTitle = isset($data['event_title']) ? $data['event_title'] : $existingSchedule['event_title'];
            $updatedLocation = isset($data['location']) ? $data['location'] : $existingSchedule['location'];
            $updatedStart = isset($data['start_datetime']) ? $data['start_datetime'] : $existingSchedule['start_datetime'];

            $oldPriestId = intval($existingSchedule['assigned_priest'] ?? 0);
            if ($assigned_priest_id !== $oldPriestId) {
                $shouldNotify = true;
            } elseif (isset($data['event_title']) || isset($data['location']) || isset($data['start_datetime']) || isset($data['end_datetime'])) {
                $shouldNotify = true;
            }

            if ($shouldNotify) {
                $notificationHelper = new UserNotificationHelper($conn);
                $cleanUpdatedTitle = UserNotificationHelper::sanitizeNotificationText($updatedTitle);
                $message = "May updated schedule ka: $cleanUpdatedTitle sa $updatedLocation sa " . date('F j, Y g:i A', strtotime($updatedStart));
                $options = [
                    'action_url' => '/schedules',
                    'action_type' => 'navigate'
                ];
                $notificationHelper->sendUserNotification($assigned_priest_id, $message, 'Schedules', $options);
                if ($notificationHelper->getErrors()) {
                    error_log('Schedule notification error: ' . implode(', ', $notificationHelper->getErrors()));
                }
            }
        }

        // If status changed/updated to Scheduled and it's a livestream/event, create announcement and system announcement
        $newStatus = isset($data['status']) ? $data['status'] : ($existingSchedule['status'] ?? null);
        $newEventType = isset($data['event_type']) ? $data['event_type'] : ($existingSchedule['event_type'] ?? '');
        $lowerType = strtolower($newEventType);
        $statusBecameScheduled = false;
        if ($existingSchedule) {
            $oldStatus = $existingSchedule['status'] ?? null;
            if ($oldStatus !== 'Scheduled' && $newStatus === 'Scheduled') {
                $statusBecameScheduled = true;
            }
        } else {
            if ($newStatus === 'Scheduled') $statusBecameScheduled = true;
        }

        if ($statusBecameScheduled && ($newStatus === 'Scheduled') && (strpos($lowerType, 'live') !== false || strpos($lowerType, 'stream') !== false || strpos($lowerType, 'event') !== false)) {
            $announcementTitle = "Upcoming: " . ($data['event_title'] ?? $existingSchedule['event_title'] ?? 'Event');
            $start = isset($data['start_datetime']) ? $data['start_datetime'] : ($existingSchedule['start_datetime'] ?? null);
            $location = isset($data['location']) ? $data['location'] : ($existingSchedule['location'] ?? 'Parish Church');
            $announcementContent = "Magkakaroon ng $newEventType: " . ($data['event_title'] ?? $existingSchedule['event_title'] ?? '') . " sa $location sa " . ($start ? date('F j, Y g:i A', strtotime($start)) : '') . ".";
            $created_by = $user_id && $user_id > 0 ? $user_id : 'NULL';
            $ins = "INSERT INTO announcements (title, content, created_by) VALUES ('" . $conn->real_escape_string($announcementTitle) . "', '" . $conn->real_escape_string($announcementContent) . "', " . ($created_by === 'NULL' ? 'NULL' : intval($created_by)) . ")";
            if ($conn->query($ins)) {
                logAuditAction($user_id, 'CREATE', 'announcements', "Auto-created announcement for schedule $schedule_id", $conn);
            } else {
                error_log('Failed to auto-create announcement (update): ' . $conn->error);
            }

            $notificationHelper = new UserNotificationHelper($conn);
            $sysMessage = "$newEventType: " . ($data['event_title'] ?? $existingSchedule['event_title'] ?? '') . " scheduled on " . ($start ? date('F j, Y g:i A', strtotime($start)) : '');
            $options = ['action_url' => '/announcements', 'action_type' => 'navigate'];
            $notificationHelper->sendSystemAnnouncement($sysMessage, 'Schedules', $options);
            if ($notificationHelper->getErrors()) {
                error_log('Schedule system announcement error (update): ' . implode(', ', $notificationHelper->getErrors()));
            }
        }

        http_response_code(200);
        echo json_encode(['success' => true, 'message' => 'Schedule updated']);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to update schedule: ' . $conn->error]);
    }

} elseif ($request_method === 'DELETE') {
    // delete schedule
    $schedule_id = isset($_GET['id']) ? intval($_GET['id']) : null;
    $user_id = isset($_GET['user_id']) ? intval($_GET['user_id']) : null;

    if (!$schedule_id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'id is required']);
        exit();
    }

    if ($conn->query("DELETE FROM parish_schedules WHERE schedule_id = $schedule_id") === TRUE) {
        if ($user_id && $user_id > 0) {
            logAuditAction($user_id, 'DELETE', 'parish_schedules', "Deleted schedule $schedule_id", $conn);
        }
        http_response_code(200);
        echo json_encode(['success' => true, 'message' => 'Schedule deleted']);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to delete schedule: ' . $conn->error]);
    }

} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}

$conn->close();
?>
