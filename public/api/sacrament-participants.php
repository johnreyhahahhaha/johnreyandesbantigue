<?php
function syncSacramentParticipants($conn, $type, $recordId, $data) {
    $participantField = null;
    $recordType = null;
    $personIds = [];

    if (in_array($type, ['baptismal', 'baptism', 'baptisms'], true)) {
        $participantField = 'godparents';
        $recordType = 'Baptismal';
        $personIds = [(int)($data['person_id'] ?? 0)];
    } elseif ($type === 'confirmation') {
        $participantField = 'sponsor_names';
        $recordType = 'Confirmation';
        $personIds = [(int)($data['person_id'] ?? 0)];
    } elseif ($type === 'marriage') {
        $participantField = 'witnesses';
        $recordType = 'Marriage';
        $personIds = [(int)($data['groom_id'] ?? 0), (int)($data['bride_id'] ?? 0)];
    }

    if (!$participantField || !$recordType) {
        return;
    }

    $personIds = array_values(array_filter(array_unique($personIds), static fn($id) => $id > 0));
    if (!$personIds) {
        return;
    }

    $recordTypeEscaped = $conn->real_escape_string($recordType);
    if (!$conn->query("DELETE FROM godparents_records WHERE record_type = '$recordTypeEscaped' AND record_id = " . (int)$recordId)) {
        throw new Exception('Failed to refresh sacrament participants: ' . $conn->error);
    }

    $rawNames = (string)($data[$participantField] ?? '');
    $names = preg_split('/[;\\r\\n]+/', $rawNames, -1, PREG_SPLIT_NO_EMPTY);
    $names = array_values(array_filter(array_map('trim', $names), static fn($name) => $name !== ''));
    foreach ($personIds as $personId) {
        foreach ($names as $name) {
            $nameEscaped = $conn->real_escape_string($name);
            $insert = "INSERT INTO godparents_records (person_id, record_type, record_id, godparent_name)
                       VALUES ($personId, '$recordTypeEscaped', " . (int)$recordId . ", '$nameEscaped')";
            if (!$conn->query($insert)) {
                throw new Exception('Failed to save sacrament participant: ' . $conn->error);
            }
        }
    }
}
?>
