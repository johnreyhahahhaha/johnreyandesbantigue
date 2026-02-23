<?php
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

require_once 'config.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database connection failed'
    ]);
    exit();
}

$request_method = $_SERVER['REQUEST_METHOD'];

if ($request_method === 'GET') {
    // Get comprehensive admin dashboard data
    
    $data = [
        'success' => true,
        'timestamp' => date('Y-m-d H:i:s'),
        'core' => [],
        'sacraments' => [],
        'finances' => [],
        'community' => [],
        'documents' => [],
        'assets' => [],
        'schedules' => [],
        'other' => [],
        'errors' => []
    ];

    // CORE DATA
    try {
        $result = $conn->query("SELECT * FROM persons ORDER BY person_id DESC");
        $data['core']['persons'] = $result ? $result->fetch_all(MYSQLI_ASSOC) : [];
    } catch (Exception $e) {
        $data['errors'][] = 'persons: ' . $conn->error;
    }

    try {
        $result = $conn->query("SELECT su.*, p.first_name, p.last_name FROM system_users su LEFT JOIN persons p ON su.person_id = p.person_id ORDER BY su.user_id DESC");
        $data['core']['users'] = $result ? $result->fetch_all(MYSQLI_ASSOC) : [];
    } catch (Exception $e) {
        $data['errors'][] = 'users: ' . $conn->error;
    }

    try {
        $result = $conn->query("SELECT * FROM households ORDER BY household_id DESC");
        $data['core']['households'] = $result ? $result->fetch_all(MYSQLI_ASSOC) : [];
    } catch (Exception $e) {
        $data['errors'][] = 'households: ' . $conn->error;
    }

    // SACRAMENTS
    try {
        $result = $conn->query("SELECT 'Baptismal' as type, b.*, p.first_name, p.last_name FROM baptismal_records b LEFT JOIN persons p ON b.person_id = p.person_id");
        $data['sacraments']['baptisms'] = $result ? $result->fetch_all(MYSQLI_ASSOC) : [];
    } catch (Exception $e) {
        $data['errors'][] = 'baptisms: ' . $conn->error;
    }

    try {
        $result = $conn->query("SELECT 'Marriage' as type, m.*, p.first_name, p.last_name FROM marriage_records m LEFT JOIN persons p ON m.groom_id = p.person_id");
        $data['sacraments']['marriages'] = $result ? $result->fetch_all(MYSQLI_ASSOC) : [];
    } catch (Exception $e) {
        $data['errors'][] = 'marriages: ' . $conn->error;
    }

    try {
        $result = $conn->query("SELECT 'Confirmation' as type, c.*, p.first_name, p.last_name FROM confirmation_records c LEFT JOIN persons p ON c.person_id = p.person_id");
        $data['sacraments']['confirmations'] = $result ? $result->fetch_all(MYSQLI_ASSOC) : [];
    } catch (Exception $e) {
        $data['errors'][] = 'confirmations: ' . $conn->error;
    }

    try {
        $result = $conn->query("SELECT 'Burial' as type, bu.* FROM burial_records bu");
        $data['sacraments']['burials'] = $result ? $result->fetch_all(MYSQLI_ASSOC) : [];
    } catch (Exception $e) {
        $data['errors'][] = 'burials: ' . $conn->error;
    }

    // FINANCES
    try {
        $result = $conn->query("SELECT * FROM financial_ledger ORDER BY trans_date DESC");
        $data['finances']['ledger'] = $result ? $result->fetch_all(MYSQLI_ASSOC) : [];
    } catch (Exception $e) {
        $data['errors'][] = 'ledger: ' . $conn->error;
    }

    try {
        $result = $conn->query("SELECT * FROM donations ORDER BY date_received DESC");
        $data['finances']['donations'] = $result ? $result->fetch_all(MYSQLI_ASSOC) : [];
    } catch (Exception $e) {
        $data['errors'][] = 'donations: ' . $conn->error;
    }

    try {
        $result = $conn->query("SELECT * FROM mass_intentions ORDER BY date_arranged DESC");
        $data['finances']['mass_intentions'] = $result ? $result->fetch_all(MYSQLI_ASSOC) : [];
    } catch (Exception $e) {
        $data['errors'][] = 'mass_intentions: ' . $conn->error;
    }

    // COMMUNITY
    try {
        $result = $conn->query("SELECT pv.*, p.first_name, p.last_name, m.ministry_name FROM parish_volunteers pv LEFT JOIN persons p ON pv.person_id = p.person_id LEFT JOIN ministries m ON pv.ministry_id = m.ministry_id");
        $data['community']['volunteers'] = $result ? $result->fetch_all(MYSQLI_ASSOC) : [];
    } catch (Exception $e) {
        $data['errors'][] = 'volunteers: ' . $conn->error;
    }

    try {
        $result = $conn->query("SELECT * FROM ministries ORDER BY ministry_id DESC");
        $data['community']['ministries'] = $result ? $result->fetch_all(MYSQLI_ASSOC) : [];
    } catch (Exception $e) {
        $data['errors'][] = 'ministries: ' . $conn->error;
    }

    try {
        $result = $conn->query("SELECT * FROM social_programs ORDER BY program_id DESC");
        $data['community']['programs'] = $result ? $result->fetch_all(MYSQLI_ASSOC) : [];
    } catch (Exception $e) {
        $data['errors'][] = 'programs: ' . $conn->error;
    }

    try {
        $result = $conn->query("SELECT bl.*, p.first_name, p.last_name, sp.program_name FROM beneficiary_logs bl LEFT JOIN persons p ON bl.person_id = p.person_id LEFT JOIN social_programs sp ON bl.program_id = sp.program_id");
        $data['community']['beneficiaries'] = $result ? $result->fetch_all(MYSQLI_ASSOC) : [];
    } catch (Exception $e) {
        $data['errors'][] = 'beneficiaries: ' . $conn->error;
    }

    // DOCUMENTS
    try {
        $result = $conn->query("SELECT dr.*, p.first_name, p.last_name FROM document_requests dr LEFT JOIN persons p ON dr.person_id = p.person_id ORDER BY dr.request_date DESC");
        $data['documents']['requests'] = $result ? $result->fetch_all(MYSQLI_ASSOC) : [];
    } catch (Exception $e) {
        $data['errors'][] = 'documents: ' . $conn->error;
    }

    // ASSETS
    try {
        $result = $conn->query("SELECT * FROM parish_assets ORDER BY asset_id DESC");
        $data['assets']['assets'] = $result ? $result->fetch_all(MYSQLI_ASSOC) : [];
    } catch (Exception $e) {
        $data['errors'][] = 'assets: ' . $conn->error;
    }

    try {
        $result = $conn->query("SELECT * FROM asset_maintenance ORDER BY maintenance_date DESC");
        $data['assets']['maintenance'] = $result ? $result->fetch_all(MYSQLI_ASSOC) : [];
    } catch (Exception $e) {
        $data['errors'][] = 'maintenance: ' . $conn->error;
    }

    // SCHEDULES
    try {
        $result = $conn->query("SELECT * FROM parish_schedules ORDER BY start_datetime DESC");
        $data['schedules']['schedules'] = $result ? $result->fetch_all(MYSQLI_ASSOC) : [];
    } catch (Exception $e) {
        $data['errors'][] = 'schedules: ' . $conn->error;
    }

    // AUDIT LOGS
    try {
        $result = $conn->query("SELECT al.*, su.username FROM audit_logs al LEFT JOIN system_users su ON al.user_id = su.user_id ORDER BY al.log_timestamp DESC LIMIT 100");
        $data['other']['audit_logs'] = $result ? $result->fetch_all(MYSQLI_ASSOC) : [];
    } catch (Exception $e) {
        $data['errors'][] = 'audit_logs: ' . $conn->error;
    }

    http_response_code(200);
    echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}

$conn->close();
?>
