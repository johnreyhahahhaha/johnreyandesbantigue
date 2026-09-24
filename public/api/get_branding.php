<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

include 'config.php';

try {
    // Fetch branding data (always from id=1)
    $query = "SELECT branding_id, parish_name, parish_address, parish_logo, updated_by, last_updated 
              FROM system_branding 
              WHERE branding_id = 1";
    
    $result = mysqli_query($conn, $query);
    
    if (!$result) {
        throw new Exception("Database error: " . mysqli_error($conn));
    }
    
    $data = mysqli_fetch_assoc($result);
    
    if (!$data) {
        // Return default if no branding exists
        $data = [
            'branding_id' => 1,
            'parish_name' => 'Josephus Parish',
            'parish_address' => '',
            'parish_logo' => 'default_logo.png',
            'updated_by' => null,
            'last_updated' => date('Y-m-d H:i:s')
        ];
    }
    
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Branding data retrieved successfully',
        'data' => $data
    ]);
    
} catch (Exception $e) {
    error_log('get_branding error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}

mysqli_close($conn);
?>
