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
require_once 'audit.php';
require_once 'sacrament-participants.php';

header('Content-Type: application/json; charset=utf-8');

function createSacramentSchedule($conn, $type, $recordId, $data, $priestId) {
    $scheduleTypes = [
        'baptismal' => 'Baptism',
        'baptism' => 'Baptism',
        'baptisms' => 'Baptism',
        'marriage' => 'Wedding',
        'communion' => 'Mass',
        'burial' => 'Funeral',
    ];

    if (!isset($scheduleTypes[$type])) {
        return null;
    }

    $dateField = $type === 'marriage' ? 'marriage_date' : ($type === 'communion' ? 'communion_date' : ($type === 'burial' ? 'burial_date' : 'baptism_date'));
    $dateValue = trim((string)($data[$dateField] ?? ''));
    if ($dateValue === '') {
        return null;
    }

    $startValue = trim((string)($data['start_datetime'] ?? ''));
    $endValue = trim((string)($data['end_datetime'] ?? ''));
    $startTimestamp = strtotime($startValue !== '' ? $startValue : $dateValue . ' 09:00:00');
    if ($startTimestamp === false) {
        throw new Exception('Invalid sacrament date for schedule');
    }

    $startDatetime = date('Y-m-d H:i:s', $startTimestamp);
    $endTimestamp = $endValue !== '' ? strtotime($endValue) : $startTimestamp + 3600;
    if ($endTimestamp === false || $endTimestamp <= $startTimestamp) {
        throw new Exception('End Date/Time must be later than Start Date/Time');
    }
    $endDatetime = date('Y-m-d H:i:s', $endTimestamp);
    $eventType = $scheduleTypes[$type];
    $marker = '[Sacrament:' . $type . ':' . $recordId . ']';

    $relatedTypeMap = [
        'baptismal' => 'Baptismal',
        'baptism' => 'Baptism',
        'baptisms' => 'Baptism',
        'marriage' => 'Marriage',
        'communion' => 'Communion',
        'burial' => 'Burial',
    ];
    $relatedType = $relatedTypeMap[strtolower(trim((string)$type))] ?? ucfirst(strtolower(trim((string)$type)));

    $relatedLookup = $conn->query("SELECT schedule_id FROM parish_schedules WHERE related_record_type = '" . $conn->real_escape_string($relatedType) . "' AND related_record_id = " . (int)$recordId . " LIMIT 1");
    if ($relatedLookup && $relatedLookup->num_rows > 0) {
        $existingRow = $relatedLookup->fetch_assoc();
        return (int)$existingRow['schedule_id'];
    }

    $existing = $conn->query("SELECT schedule_id FROM parish_schedules WHERE event_title LIKE '%" . $conn->real_escape_string($marker) . "%' LIMIT 1");
    if ($existing && $existing->num_rows > 0) {
        $existingRow = $existing->fetch_assoc();
        return (int)$existingRow['schedule_id'];
    }

    $personIds = $type === 'marriage'
        ? [(int)($data['groom_id'] ?? 0), (int)($data['bride_id'] ?? 0)]
        : [(int)($data['person_id'] ?? 0)];
    $personIds = array_values(array_filter($personIds, static fn($id) => $id > 0));
    $names = [];
    if ($personIds) {
        $idList = implode(',', $personIds);
        $people = $conn->query("SELECT first_name, last_name FROM persons WHERE person_id IN ($idList) ORDER BY FIELD(person_id, $idList)");
        if ($people) {
            while ($person = $people->fetch_assoc()) {
                $names[] = trim($person['first_name'] . ' ' . $person['last_name']);
            }
        }
    }

    $subject = $names ? implode(' & ', $names) : 'Parishioner';
    $eventTitle = $eventType . ' - ' . $subject . ' ' . $marker;
    $location = $type === 'burial' ? trim((string)($data['place_of_interment'] ?? '')) : '';
    $location = $location !== '' ? $location : 'Parish Church';
    $assignedPriest = ((int)$priestId > 0) ? (int)$priestId : 'NULL';

    if ((int)$priestId > 0) {
        $conflict = findPriestScheduleConflict($conn, (int)$priestId, $startDatetime, $endDatetime);
        if ($conflict) {
            throw new Exception('The selected priest is unavailable because another schedule overlaps this sacrament.');
        }

        $unavailability = findPriestUnavailabilityConflict($conn, (int)$priestId, $startDatetime, $endDatetime);
        if ($unavailability) {
            throw new Exception('This priest is marked unavailable on the selected date: ' . $unavailability['unavailable_date'] . ' (' . $unavailability['reason'] . ').');
        }
    }

    $referenceType = $type === 'marriage' ? 'Marriage' : ($type === 'baptismal' || $type === 'baptism' || $type === 'baptisms' ? 'Baptismal' : ucfirst($type));
    $query = "INSERT INTO parish_schedules (event_title, event_type, start_datetime, end_datetime, location, assigned_priest, status, related_record_type, related_record_id)
              VALUES ('" . $conn->real_escape_string($eventTitle) . "', '$eventType', '$startDatetime', '$endDatetime', '" . $conn->real_escape_string($location) . "', $assignedPriest, 'Scheduled', '" . $conn->real_escape_string($referenceType) . "', " . (int)$recordId . ")";
    if (!$conn->query($query)) {
        throw new Exception('Failed to create parish schedule: ' . $conn->error);
    }

    return $conn->insert_id;
}

function validateSacramentPriestAvailability($conn, $type, $data, $priestId) {
    $priestId = (int)$priestId;
    if ($priestId <= 0) {
        return;
    }

    $dateField = $type === 'marriage' ? 'marriage_date' : ($type === 'communion' ? 'communion_date' : ($type === 'burial' ? 'burial_date' : 'baptism_date'));
    $dateValue = trim((string)($data[$dateField] ?? ''));
    if ($dateValue === '' || strtotime($dateValue) === false) {
        return;
    }

    $startValue = trim((string)($data['start_datetime'] ?? ''));
    $endValue = trim((string)($data['end_datetime'] ?? ''));
    $startTimestamp = strtotime($startValue !== '' ? $startValue : $dateValue . ' 09:00:00');
    $endTimestamp = $endValue !== '' ? strtotime($endValue) : $startTimestamp + 3600;
    if ($startTimestamp === false || $endTimestamp === false || $endTimestamp <= $startTimestamp) {
        throw new Exception('End Date/Time must be later than Start Date/Time');
    }
    $startDatetime = date('Y-m-d H:i:s', $startTimestamp);
    $endDatetime = date('Y-m-d H:i:s', $endTimestamp);
    $unavailability = findPriestUnavailabilityConflict($conn, $priestId, $startDatetime, $endDatetime);
    if ($unavailability) {
        throw new Exception('This priest is marked unavailable on the selected date: ' . $unavailability['unavailable_date'] . ' (' . $unavailability['reason'] . ').');
    }
}

function validateDuplicateSacrament($conn, $type, $data) {
    $type = strtolower(trim((string)$type));
    $personId = (int)($data['person_id'] ?? 0);

    if (in_array($type, ['baptismal', 'baptism', 'baptisms'], true) && $personId > 0) {
        $result = $conn->query("SELECT baptism_id FROM baptismal_records WHERE person_id = $personId LIMIT 1");
        if ($result && $result->num_rows > 0) {
            throw new Exception('This person already has a baptismal record.');
        }
    }

    if ($type === 'confirmation' && $personId > 0) {
        $result = $conn->query("SELECT confirmation_id FROM confirmation_records WHERE person_id = $personId LIMIT 1");
        if ($result && $result->num_rows > 0) {
            throw new Exception('This person already has a confirmation record.');
        }
    }

    if ($type === 'burial' && $personId > 0) {
        $result = $conn->query("SELECT burial_id FROM burial_records WHERE person_id = $personId LIMIT 1");
        if ($result && $result->num_rows > 0) {
            throw new Exception('This person already has a burial record.');
        }
    }

    if ($type === 'marriage') {
        $groomId = (int)($data['groom_id'] ?? 0);
        $brideId = (int)($data['bride_id'] ?? 0);
        if ($groomId > 0 && $brideId > 0 && $groomId === $brideId) {
            throw new Exception('Groom and bride must be different persons.');
        }
        if ($groomId > 0) {
            $result = $conn->query("SELECT marriage_id FROM marriage_records WHERE groom_id = $groomId OR bride_id = $groomId LIMIT 1");
            if ($result && $result->num_rows > 0) {
                throw new Exception('This groom already has a marriage record.');
            }
        }
        if ($brideId > 0) {
            $result = $conn->query("SELECT marriage_id FROM marriage_records WHERE groom_id = $brideId OR bride_id = $brideId LIMIT 1");
            if ($result && $result->num_rows > 0) {
                throw new Exception('This bride already has a marriage record.');
            }
        }
    }
}

// Debug: Check if connection is valid
if (!$conn) {
    http_response_code(500);
    exit(json_encode(['success' => false, 'message' => 'Database connection not available']));
}

$request_method = $_SERVER['REQUEST_METHOD'];

if ($request_method === 'GET') {
    // Get sacrament records with type and person_id filter
    $type = isset($_GET['type']) ? strtolower(trim($_GET['type'])) : 'all';
    $person_id = isset($_GET['person_id']) ? intval($_GET['person_id']) : null;

    $query = null;

    if ($type === 'all') {
        $baptismWhere = $person_id ? "WHERE b.person_id = $person_id" : "";
        $marriageGroomWhere = $person_id ? "WHERE m.groom_id = $person_id" : "";
        $marriageBrideWhere = $person_id ? "WHERE m.bride_id = $person_id" : "";
        $confirmationWhere = $person_id ? "WHERE c.person_id = $person_id" : "";
        $communionWhere = $person_id ? "WHERE co.person_id = $person_id" : "";
        $burialWhere = $person_id ? "WHERE bu.person_id = $person_id" : "";

        $query = "SELECT 'Baptismal' AS sacrament_type, b.baptism_id AS record_id, b.person_id, p.first_name, p.last_name, b.baptism_date AS record_date,
                         b.priest_id, b.father_id, b.mother_id, NULL AS related_person_id, NULL AS license_no, NULL AS witnesses,
                         NULL AS registry_book_no, NULL AS entry_no, NULL AS communion_date, NULL AS death_date, NULL AS burial_date,
                         NULL AS cause_of_death, NULL AS place_of_interment, b.godparents AS remarks
                  FROM baptismal_records b
                  LEFT JOIN persons p ON b.person_id = p.person_id
                  $baptismWhere
                  UNION ALL
                  SELECT 'Marriage' AS sacrament_type, m.marriage_id AS record_id, m.groom_id AS person_id, pg.first_name, pg.last_name, m.marriage_date AS record_date,
                         m.priest_id, NULL AS father_id, NULL AS mother_id, m.bride_id AS related_person_id, m.license_no, m.witnesses,
                         NULL AS registry_book_no, NULL AS entry_no, NULL AS communion_date, NULL AS death_date, NULL AS burial_date,
                         NULL AS cause_of_death, NULL AS place_of_interment, NULL AS remarks
                  FROM marriage_records m
                  LEFT JOIN persons pg ON m.groom_id = pg.person_id
                  $marriageGroomWhere
                  UNION ALL
                  SELECT 'Marriage' AS sacrament_type, m.marriage_id AS record_id, m.bride_id AS person_id, pb.first_name, pb.last_name, m.marriage_date AS record_date,
                         m.priest_id, NULL AS father_id, NULL AS mother_id, m.groom_id AS related_person_id, m.license_no, m.witnesses,
                         NULL AS registry_book_no, NULL AS entry_no, NULL AS communion_date, NULL AS death_date, NULL AS burial_date,
                         NULL AS cause_of_death, NULL AS place_of_interment, NULL AS remarks
                  FROM marriage_records m
                  LEFT JOIN persons pb ON m.bride_id = pb.person_id
                  $marriageBrideWhere
                  UNION ALL
                  SELECT 'Confirmation' AS sacrament_type, c.confirmation_id AS record_id, c.person_id, p.first_name, p.last_name, c.confirmation_date AS record_date,
                         NULL AS priest_id, NULL AS father_id, NULL AS mother_id, NULL AS related_person_id, NULL AS license_no, NULL AS witnesses,
                         c.registry_book_no, c.entry_no, NULL AS communion_date, NULL AS death_date, NULL AS burial_date,
                         NULL AS cause_of_death, NULL AS place_of_interment, c.sponsor_names AS remarks
                  FROM confirmation_records c
                  LEFT JOIN persons p ON c.person_id = p.person_id
                  $confirmationWhere
                  UNION ALL
                  SELECT 'Communion' AS sacrament_type, co.communion_id AS record_id, co.person_id, p.first_name, p.last_name, co.communion_date AS record_date,
                         co.priest_id, NULL AS father_id, NULL AS mother_id, NULL AS related_person_id, NULL AS license_no, NULL AS witnesses,
                         NULL AS registry_book_no, NULL AS entry_no, NULL AS communion_date, NULL AS death_date, NULL AS burial_date,
                         NULL AS cause_of_death, NULL AS place_of_interment, co.remarks AS remarks
                  FROM communion_records co
                  LEFT JOIN persons p ON co.person_id = p.person_id
                  $communionWhere
                  UNION ALL
                  SELECT 'Burial' AS sacrament_type, bu.burial_id AS record_id, bu.person_id, p.first_name, p.last_name, bu.burial_date AS record_date,
                         bu.priest_id, NULL AS father_id, NULL AS mother_id, NULL AS related_person_id, NULL AS license_no, NULL AS witnesses,
                         NULL AS registry_book_no, NULL AS entry_no, NULL AS communion_date, bu.death_date, bu.burial_date,
                         bu.cause_of_death, bu.place_of_interment, NULL AS remarks
                  FROM burial_records bu
                  LEFT JOIN persons p ON bu.person_id = p.person_id
                  $burialWhere
                  ORDER BY record_date DESC";
    } elseif ($type === 'baptismal' || $type === 'baptism') {
        $where_clause = $person_id ? "WHERE b.person_id = $person_id" : "";
        $query = "SELECT 'Baptismal' as sacrament_type, b.*, p.first_name, p.last_name,
                 (SELECT le.streaming_url FROM livestream_events le WHERE le.event_reference_type = 'baptismal_records' AND le.event_reference_id = b.baptism_id ORDER BY le.created_at DESC LIMIT 1) AS ceremony_streaming_url,
                 (SELECT lr.recording_url FROM livestream_recordings lr INNER JOIN livestream_events le ON le.livestream_id = lr.livestream_id WHERE le.event_reference_type = 'baptismal_records' AND le.event_reference_id = b.baptism_id AND lr.is_available = 1 ORDER BY lr.created_at DESC LIMIT 1) AS ceremony_recording_url
                  FROM baptismal_records b
                  LEFT JOIN persons p ON b.person_id = p.person_id
                  $where_clause
                  ORDER BY b.baptism_date DESC";
    } elseif ($type === 'marriage') {
        $where_clause = $person_id ? "WHERE m.groom_id = $person_id OR m.bride_id = $person_id" : "";
        $query = "SELECT 'Marriage' as sacrament_type, m.*, p.first_name, p.last_name 
                  FROM marriage_records m
                  LEFT JOIN persons p ON m.groom_id = p.person_id
                  $where_clause
                  ORDER BY m.marriage_date DESC";
    } elseif ($type === 'confirmation') {
        $where_clause = $person_id ? "WHERE c.person_id = $person_id" : "";
        $query = "SELECT 'Confirmation' as sacrament_type, c.*, p.first_name, p.last_name,
                 (SELECT le.streaming_url FROM livestream_events le WHERE le.event_reference_type = 'confirmation_records' AND le.event_reference_id = c.confirmation_id ORDER BY le.created_at DESC LIMIT 1) AS ceremony_streaming_url,
                 (SELECT lr.recording_url FROM livestream_recordings lr INNER JOIN livestream_events le ON le.livestream_id = lr.livestream_id WHERE le.event_reference_type = 'confirmation_records' AND le.event_reference_id = c.confirmation_id AND lr.is_available = 1 ORDER BY lr.created_at DESC LIMIT 1) AS ceremony_recording_url
                  FROM confirmation_records c
                  LEFT JOIN persons p ON c.person_id = p.person_id
                  $where_clause
                  ORDER BY c.confirmation_date DESC";
    } elseif ($type === 'communion') {
        $where_clause = $person_id ? "WHERE co.person_id = $person_id" : "";
        $query = "SELECT 'Communion' as sacrament_type, co.*, p.first_name, p.last_name,
                 (SELECT le.streaming_url FROM livestream_events le WHERE le.event_reference_type = 'communion_records' AND le.event_reference_id = co.communion_id ORDER BY le.created_at DESC LIMIT 1) AS ceremony_streaming_url,
                 (SELECT lr.recording_url FROM livestream_recordings lr INNER JOIN livestream_events le ON le.livestream_id = lr.livestream_id WHERE le.event_reference_type = 'communion_records' AND le.event_reference_id = co.communion_id AND lr.is_available = 1 ORDER BY lr.created_at DESC LIMIT 1) AS ceremony_recording_url
                  FROM communion_records co
                  LEFT JOIN persons p ON co.person_id = p.person_id
                  $where_clause
                  ORDER BY co.communion_date DESC";
    } elseif ($type === 'burial') {
        $where_clause = $person_id ? "WHERE bu.person_id = $person_id" : "";
        $query = "SELECT 'Burial' as sacrament_type, bu.*, p.first_name, p.last_name,
                 (SELECT le.streaming_url FROM livestream_events le WHERE le.event_reference_type = 'burial_records' AND le.event_reference_id = bu.burial_id ORDER BY le.created_at DESC LIMIT 1) AS ceremony_streaming_url,
                 (SELECT lr.recording_url FROM livestream_recordings lr INNER JOIN livestream_events le ON le.livestream_id = lr.livestream_id WHERE le.event_reference_type = 'burial_records' AND le.event_reference_id = bu.burial_id AND lr.is_available = 1 ORDER BY lr.created_at DESC LIMIT 1) AS ceremony_recording_url
                  FROM burial_records bu
                  LEFT JOIN persons p ON bu.person_id = p.person_id
                  $where_clause
                  ORDER BY bu.burial_date DESC";
    } else {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid sacrament type: ' . htmlspecialchars($type)]);
        exit();
    }

    $result = $conn->query($query);

    if (!$result) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Query failed: ' . $conn->error]);
        exit();
    }

    $records = [];
    while ($row = $result->fetch_assoc()) {
        $records[] = $row;
    }

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'data' => $records,
        'count' => count($records)
    ]);

} elseif ($request_method === 'POST') {
    // Create new sacrament record
    $data = json_decode(file_get_contents("php://input"), true);
    $user_id = isset($data['user_id']) && intval($data['user_id']) > 0 ? intval($data['user_id']) : null;
    $type = $data['type'] ?? null;

    if (!$type) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing sacrament type']);
        exit();
    }

    if ($type === 'baptismal' || $type === 'baptism' || $type === 'baptisms') {
        // Create baptismal record
        $missing_baptism_fields = [];
        foreach (['person_id', 'baptism_date', 'priest_id'] as $required_field) {
            if (!isset($data[$required_field]) || $data[$required_field] === '') {
                $missing_baptism_fields[] = $required_field;
            }
        }

        if (!empty($missing_baptism_fields)) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => 'Missing required fields for baptism: ' . implode(', ', $missing_baptism_fields)
            ]);
            exit();
        }

        $person_id = intval($data['person_id']);
        $baptism_date = $conn->real_escape_string($data['baptism_date']);
        $priest_id = intval($data['priest_id']);
        $father_id = (isset($data['father_id']) && $data['father_id'] !== '' && intval($data['father_id']) > 0) ? intval($data['father_id']) : 'NULL';
        $mother_id = (isset($data['mother_id']) && $data['mother_id'] !== '' && intval($data['mother_id']) > 0) ? intval($data['mother_id']) : 'NULL';
        $father_name = isset($data['father_name']) ? trim((string)$data['father_name']) : '';
        $mother_name = isset($data['mother_name']) ? trim((string)$data['mother_name']) : '';
        $book_no = isset($data['book_no']) ? intval($data['book_no']) : 0;
        $page_no = isset($data['page_no']) ? intval($data['page_no']) : 0;
        $line_no = isset($data['line_no']) ? intval($data['line_no']) : 0;
        $godparents = $conn->real_escape_string($data['godparents'] ?? '');
        $remarks = $conn->real_escape_string($data['remarks'] ?? '');

        $father_name_sql = $father_name !== '' ? "'" . $conn->real_escape_string($father_name) . "'" : "NULL";
        $mother_name_sql = $mother_name !== '' ? "'" . $conn->real_escape_string($mother_name) . "'" : "NULL";

        $duplicate_check = "SELECT baptism_id FROM baptismal_records WHERE person_id = $person_id AND baptism_date = '$baptism_date' AND priest_id = $priest_id LIMIT 1";
        $duplicate_result = $conn->query($duplicate_check);
        if ($duplicate_result && $duplicate_result->num_rows > 0) {
            $existing_record = $duplicate_result->fetch_assoc();
            http_response_code(200);
            echo json_encode([
                'success' => true,
                'duplicate' => true,
                'message' => 'Baptism record already exists for this person and date.',
                'id' => (int)$existing_record['baptism_id']
            ]);
            exit();
        }

        $query = "INSERT INTO baptismal_records (person_id, baptism_date, priest_id, father_id, mother_id, father_name, mother_name, book_no, page_no, line_no, godparents, remarks)
                  VALUES ($person_id, '$baptism_date', $priest_id, $father_id, $mother_id, $father_name_sql, $mother_name_sql, $book_no, $page_no, $line_no, '$godparents', '$remarks')";

    } elseif ($type === 'marriage') {
        // Create marriage record
        if (!isset($data['groom_id']) || !isset($data['bride_id']) || !isset($data['marriage_date'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Missing required fields for marriage']);
            exit();
        }

        $groom_id = intval($data['groom_id']);
        $bride_id = intval($data['bride_id']);
        $marriage_date = $conn->real_escape_string($data['marriage_date']);
        $priest_id = (isset($data['priest_id']) && $data['priest_id'] !== '' && intval($data['priest_id']) > 0) ? intval($data['priest_id']) : 'NULL';
        $license_no = $conn->real_escape_string($data['license_no'] ?? '');
        $witnesses = $conn->real_escape_string($data['witnesses'] ?? '');
        $book_no = isset($data['book_no']) && $data['book_no'] !== '' ? intval($data['book_no']) : 0;
        $page_no = isset($data['page_no']) && $data['page_no'] !== '' ? intval($data['page_no']) : 0;
        $banns_date = isset($data['banns_date']) && $data['banns_date'] !== '' ? "'" . $conn->real_escape_string($data['banns_date']) . "'" : "NULL";
        $civil_marriage_info = isset($data['civil_marriage_info']) && $data['civil_marriage_info'] !== '' ? "'" . $conn->real_escape_string($data['civil_marriage_info']) . "'" : "NULL";
        $groom_status = isset($data['groom_status']) && $data['groom_status'] !== '' ? "'" . $conn->real_escape_string($data['groom_status']) . "'" : "'Single'";
        $bride_status = isset($data['bride_status']) && $data['bride_status'] !== '' ? "'" . $conn->real_escape_string($data['bride_status']) . "'" : "'Single'";

        $query = "INSERT INTO marriage_records (groom_id, bride_id, marriage_date, priest_id, license_no, witnesses, book_no, page_no, banns_date, civil_marriage_info, groom_status, bride_status)
                  VALUES ($groom_id, $bride_id, '$marriage_date', $priest_id, '$license_no', '$witnesses', $book_no, $page_no, $banns_date, $civil_marriage_info, $groom_status, $bride_status)";

    } elseif ($type === 'confirmation') {
        // Create confirmation record
        // registry book number, page number and entry number are mandatory
        if (!isset($data['person_id']) || !isset($data['confirmation_date']) || !isset($data['registry_book_no'])
            || $data['registry_book_no'] === '' || !isset($data['page_no']) || $data['page_no'] === ''
            || !isset($data['entry_no']) || $data['entry_no'] === '') {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Missing required fields for confirmation (person_id, confirmation_date, registry_book_no, page_no, entry_no)']);
            exit();
        }

        $person_id = intval($data['person_id']);
        $confirmation_date = $conn->real_escape_string($data['confirmation_date']);
        $confirming_bishop = $conn->real_escape_string($data['confirming_bishop'] ?? '');
        $sponsor_names = $conn->real_escape_string($data['sponsor_names'] ?? '');
        $registry_book_no = $conn->real_escape_string($data['registry_book_no']);
        $page_no = intval($data['page_no']);
        $entry_no = intval($data['entry_no']);

        $query = "INSERT INTO confirmation_records (person_id, confirmation_date, confirming_bishop, sponsor_names, registry_book_no, page_no, entry_no)
                  VALUES ($person_id, '$confirmation_date', '$confirming_bishop', '$sponsor_names', '$registry_book_no', $page_no, $entry_no)";

    } elseif ($type === 'communion') {
        // Create communion record
        if (!isset($data['person_id']) || !isset($data['communion_date'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Missing required fields for communion']);
            exit();
        }

        $person_id = intval($data['person_id']);
        $communion_date = $conn->real_escape_string($data['communion_date']);
        $priest_id = (isset($data['priest_id']) && $data['priest_id'] !== '' && intval($data['priest_id']) > 0) ? intval($data['priest_id']) : 'NULL';
        $remarks = $conn->real_escape_string($data['remarks'] ?? '');

        $query = "INSERT INTO communion_records (person_id, communion_date, priest_id, remarks)
                  VALUES ($person_id, '$communion_date', $priest_id, '$remarks')";

    } elseif ($type === 'burial') {
        // Create burial record
        if (!isset($data['person_id']) || !isset($data['death_date']) || !isset($data['burial_date'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Missing required fields for burial']);
            exit();
        }

        $person_id = intval($data['person_id']);
        $death_date = $conn->real_escape_string($data['death_date']);
        $burial_date = $conn->real_escape_string($data['burial_date']);
        $cause = $conn->real_escape_string($data['cause_of_death'] ?? '');
        $priest_id = (isset($data['priest_id']) && $data['priest_id'] !== '' && intval($data['priest_id']) > 0) ? intval($data['priest_id']) : 'NULL';
        $place = $conn->real_escape_string($data['place_of_interment'] ?? '');

        $query = "INSERT INTO burial_records (person_id, death_date, burial_date, cause_of_death, priest_id, place_of_interment) 
                  VALUES ($person_id, '$death_date', '$burial_date', '$cause', $priest_id, '$place')";

    } else {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid sacrament type: ' . htmlspecialchars($type)]);
        exit();
    }

    try {
        validateDuplicateSacrament($conn, $type, $data);
        validateSacramentPriestAvailability($conn, $type, $data, $data['priest_id'] ?? null);
    } catch (Exception $exception) {
        http_response_code(409);
        echo json_encode(['success' => false, 'message' => $exception->getMessage()]);
        exit();
    }

    if (isset($query) && $conn->query($query) === TRUE) {
        $insert_id = $conn->insert_id;
        $schedule_id = null;

        syncSacramentParticipants($conn, $type, $insert_id, $data);

        if (in_array($type, ['baptismal', 'baptism', 'baptisms', 'marriage', 'communion', 'burial'], true)) {
            $schedule_id = createSacramentSchedule($conn, $type, $insert_id, $data, $data['priest_id'] ?? null);
        }

        if ($type === 'marriage') {
            $statusUpdate = "UPDATE persons SET civil_status = 'Married' WHERE person_id IN ($groom_id, $bride_id)";
            $conn->query($statusUpdate);
        }
        
        // Log the action
        if ($user_id && $user_id > 0) {
            $log_type = $type ?? 'unknown';
            logAuditAction($user_id, 'CREATE', 'sacrament_records', "Created $log_type sacrament record (ID: $insert_id)", $conn);
        }
        
        http_response_code(201);
        echo json_encode([
            'success' => true,
            'message' => 'Sacrament record created successfully',
            'id' => $insert_id,
            'schedule_id' => $schedule_id
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to create record: ' . $conn->error]);
    }

} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}

$conn->close();
?>
