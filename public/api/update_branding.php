<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

include 'config.php';
require_once 'permissions.php';

$updated_by = isset($_POST['user_id']) ? intval($_POST['user_id']) : 0;
$admin_check = $conn->query("SELECT user_role FROM system_users WHERE user_id = $updated_by LIMIT 1");
$admin_user = $admin_check ? $admin_check->fetch_assoc() : null;
if (!$admin_user || $admin_user['user_role'] !== 'Admin') {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Only Admin users can update parish branding']);
    exit();
}

// config.php creates $conn, not $con
try {
    // prefer $_POST and $_FILES since branding updates use multipart/form-data
    $data = $_POST;
    error_log('update_branding called, POST data: ' . print_r($data, true));
    error_log('update_branding $_FILES: ' . print_r($_FILES, true));

    // Validate required fields
    $parish_name = isset($data['parish_name']) ? trim($data['parish_name']) : null;
    $parish_address = isset($data['parish_address']) ? trim($data['parish_address']) : null;
    if (!$parish_name) {
        throw new Exception("Parish name is required");
    }

    // Get current branding to manage logo
    $current_query = "SELECT parish_logo FROM system_branding WHERE branding_id = 1";
    $current_result = mysqli_query($conn, $current_query);
    $current_data = mysqli_fetch_assoc($current_result);
    $current_logo = $current_data ? $current_data['parish_logo'] : 'default_logo.png';
    $new_logo = $current_logo; // Default to current logo
    
    // Handle file upload if provided
    if (empty($_FILES['parish_logo'])) {
        error_log('update_branding: no parish_logo entry in $_FILES');
    }
    if (isset($_FILES['parish_logo']) && $_FILES['parish_logo']['error'] === UPLOAD_ERR_OK) {
        $file = $_FILES['parish_logo'];
        
        // Validate file
        $allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!in_array($file['type'], $allowed_types)) {
            throw new Exception("Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed");
        }
        
        if ($file['size'] > 5000000) { // 5MB limit
            throw new Exception("File size exceeds 5MB limit");
        }
        
        // Create unique filename
        $file_ext = pathinfo($file['name'], PATHINFO_EXTENSION);
        $new_filename = 'parish_logo_' . time() . '.' . $file_ext;
        $upload_path = $_SERVER['DOCUMENT_ROOT'] . '/josephus/st.joseph/public/uploads/' . $new_filename;
        
        // Ensure directory exists
        $upload_dir = dirname($upload_path);
        if (!is_dir($upload_dir)) {
            mkdir($upload_dir, 0755, true);
        }
        
        // Move uploaded file
        if (!move_uploaded_file($file['tmp_name'], $upload_path)) {
            error_log('update_branding move_uploaded_file failed, tmp_name=' . $file['tmp_name'] . ' upload_path=' . $upload_path);
            throw new Exception("Failed to upload image file");
        }
        error_log('update_branding moved file to ' . $upload_path . ' new filename ' . $new_filename);
        
        $new_logo = $new_filename;
    }
    
    // Prepare update query
    if ($updated_by) {
        $update_query = "UPDATE system_branding 
                        SET parish_name = ?, 
                            parish_address = ?, 
                            parish_logo = ?,
                            updated_by = ?,
                            last_updated = NOW()
                        WHERE branding_id = 1";
        
        $stmt = mysqli_prepare($conn, $update_query);
        mysqli_stmt_bind_param($stmt, "sssi", $parish_name, $parish_address, $new_logo, $updated_by);
    } else {
        $update_query = "UPDATE system_branding 
                        SET parish_name = ?, 
                            parish_address = ?, 
                            parish_logo = ?,
                            last_updated = NOW()
                        WHERE branding_id = 1";
        $stmt = mysqli_prepare($conn, $update_query);
        mysqli_stmt_bind_param($stmt, "sss", $parish_name, $parish_address, $new_logo);
    }
    
    if (!mysqli_stmt_execute($stmt)) {
        throw new Exception("Failed to update branding: " . mysqli_stmt_error($stmt));
    }
    
    // Log audit if user_id provided
    if ($updated_by) {
        $audit_query = "INSERT INTO audit_logs (user_id, action_type, table_affected, description) 
                       VALUES (?, 'UPDATE', 'system_branding', ?)";
        $changes = "Updated parish name to '" . $parish_name . "'";
        if ($new_logo !== $current_logo) {
            $changes .= ", uploaded new logo";
        }
        
        $audit_stmt = mysqli_prepare($conn, $audit_query);
        mysqli_stmt_bind_param($audit_stmt, "is", $updated_by, $changes);
        mysqli_stmt_execute($audit_stmt);
    }
    
    // Fetch updated data
    $fetch_query = "SELECT branding_id, parish_name, parish_address, parish_logo, updated_by, last_updated 
                   FROM system_branding 
                   WHERE branding_id = 1";
    $result = mysqli_query($conn, $fetch_query);
    $updated_data = mysqli_fetch_assoc($result);
    
    http_response_code(200);
    // include debug info so caller can see what PHP received and set
    echo json_encode([
        'success' => true,
        'message' => 'Branding updated successfully',
        'data' => $updated_data,
        'debug' => [
            'new_logo' => $new_logo,
            'files' => $_FILES
        ]
    ]);
    
} catch (Exception $e) {
    // log error for debugging; will still return JSON to client
    error_log('update_branding error: ' . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}

mysqli_close($conn);
?>
