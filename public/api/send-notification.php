<?php
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

require_once 'config.php';
require_once 'permissions.php';
require_once 'audit.php';

// Load .env file if it exists
loadEnvFile();

function loadEnvFile() {
    $env_file = dirname(dirname(__DIR__)) . '/.env';
    if (file_exists($env_file)) {
        $lines = file($env_file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($lines as $line) {
            $line = trim($line);
            // Skip comments
            if (strpos($line, '#') === 0) continue;
            // Parse KEY=VALUE
            if (strpos($line, '=') !== false) {
                list($key, $value) = explode('=', $line, 2);
                $key = trim($key);
                $value = trim($value);
                // Set as environment variable if not already set
                if (!getenv($key)) {
                    putenv("$key=$value");
                }
            }
        }
    }
}

if (!$conn) {
    http_response_code(500);
    exit(json_encode(['success' => false, 'message' => 'Database connection not available']));
}

$request_method = $_SERVER['REQUEST_METHOD'];

if ($request_method === 'POST') {
    // Send notification via Email or SMS
    $data = json_decode(file_get_contents('php://input'), true);

    // Validate required fields
    if (!isset($data['notif_type']) || !isset($data['message_body']) || !isset($data['recipient'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing required fields: notif_type, message_body, recipient']);
        exit();
    }

    $notif_type = $data['notif_type']; // 'Email' or 'SMS'
    $message_body = $conn->real_escape_string($data['message_body']);
    $recipient = $conn->real_escape_string($data['recipient']); // email address or phone number
    $person_id = isset($data['person_id']) ? intval($data['person_id']) : NULL;
    $subject = isset($data['subject']) ? $conn->real_escape_string($data['subject']) : 'Notification from St. Joseph Parish';

    // If person_id is provided, validate that recipient matches their record
    if ($person_id) {
        $person_check = $conn->query("SELECT email, contact_no FROM persons WHERE person_id = $person_id");
        if (!$person_check || $person_check->num_rows === 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Person not found in system']);
            exit();
        }
        
        $person_data = $person_check->fetch_assoc();
        
        // Verify recipient matches person's actual email or phone
        if ($notif_type === 'Email') {
            if (empty($person_data['email'])) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Person does not have an email address on file']);
                exit();
            }
            if ($recipient !== $person_data['email'] && $recipient !== trim($person_data['email'])) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Email address does not match person\'s record. Please select person again.']);
                exit();
            }
        } elseif ($notif_type === 'SMS') {
            if (empty($person_data['contact_no'])) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Person does not have a phone number on file']);
                exit();
            }
            if ($recipient !== $person_data['contact_no'] && $recipient !== trim($person_data['contact_no'])) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Phone number does not match person\'s record. Please select person again.']);
                exit();
            }
        }
    }

    $sent_status = 'Pending';
    $error_message = '';

    // Validate recipient based on notification type
    if ($notif_type === 'Email') {
        if (!filter_var($recipient, FILTER_VALIDATE_EMAIL)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Invalid email address']);
            exit();
        }
        // Send Email
        $sent_status = sendEmail($recipient, $subject, $message_body) ? 'Sent' : 'Failed';
    } elseif ($notif_type === 'SMS') {
        if (!preg_match('/^(\+63|0)[0-9]{9,10}$/', $recipient)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Invalid phone number format. Use +63 or 0 followed by 9-10 digits']);
            exit();
        }
        // Send SMS
        $sent_status = sendSMS($recipient, $message_body) ? 'Sent' : 'Failed';
    } else {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid notification type. Use "Email" or "SMS"']);
        exit();
    }

    // Store in database
    $person_id_val = $person_id ? $person_id : 'NULL';
    $query = "INSERT INTO notification_logs (person_id, message_body, notif_type, sent_status, recipient_address)
              VALUES ($person_id_val, '$message_body', '$notif_type', '$sent_status', '$recipient')";

    if ($conn->query($query) === TRUE) {
        $notif_id = $conn->insert_id;
        logAuditAction($_SESSION['user_id'] ?? 0, 'CREATE', 'notification_logs', "Sent $notif_type notification to $recipient", $conn);

        http_response_code(201);
        echo json_encode([
            'success' => true,
            'message' => "Notification sent successfully via $notif_type",
            'notif_id' => $notif_id,
            'status' => $sent_status
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to save notification log: ' . $conn->error]);
    }

} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}

$conn->close();

// Helper function to send email using SMTP
function sendEmail($to, $subject, $message) {
    // Get SMTP credentials from .env
    $mail_host = getenv('MAIL_HOST') ?: 'live.smtp.mailtrap.io';
    $mail_port = getenv('MAIL_PORT') ?: 587;
    $mail_username = getenv('MAIL_USERNAME');
    $mail_password = getenv('MAIL_PASSWORD');
    $mail_from = getenv('MAIL_FROM_ADDRESS') ?: 'noreply@stjosephparish.com';
    $mail_from_name = getenv('MAIL_FROM_NAME') ?: 'St. Joseph Parish';

    // If no credentials configured, fallback to local mail()
    if (!$mail_username || !$mail_password) {
        error_log("Warning: SMTP not configured, using local mail(). Email may not be delivered.");
        return sendEmailFallback($to, $subject, $message);
    }

    try {
        // Connect to SMTP server
        $smtp = fsockopen($mail_host, $mail_port, $errno, $errstr, 10);
        if (!$smtp) {
            error_log("SMTP Error: Connection failed - $errstr ($errno)");
            return false;
        }

        // Read server response
        $response = fgets($smtp, 1024);
        if (substr($response, 0, 3) !== '220') {
            error_log("SMTP Error: Invalid server response");
            fclose($smtp);
            return false;
        }

        // Send EHLO
        fputs($smtp, "EHLO stjosephparish\r\n");
        read_smtp_response($smtp);

        // Start TLS
        fputs($smtp, "STARTTLS\r\n");
        read_smtp_response($smtp);
        stream_socket_enable_crypto($smtp, true, STREAM_CRYPTO_METHOD_TLS_CLIENT);

        // Authenticate
        fputs($smtp, "EHLO stjosephparish\r\n");
        read_smtp_response($smtp);

        $auth = base64_encode($mail_username . ':' . $mail_password);
        fputs($smtp, "AUTH LOGIN\r\n");
        read_smtp_response($smtp);
        fputs($smtp, base64_encode($mail_username) . "\r\n");
        read_smtp_response($smtp);
        fputs($smtp, base64_encode($mail_password) . "\r\n");
        read_smtp_response($smtp);

        // Send email
        fputs($smtp, "MAIL FROM: <$mail_from>\r\n");
        read_smtp_response($smtp);

        fputs($smtp, "RCPT TO: <$to>\r\n");
        read_smtp_response($smtp);

        fputs($smtp, "DATA\r\n");
        read_smtp_response($smtp);

        $headers = "From: $mail_from_name <$mail_from>\r\n";
        $headers .= "To: $to\r\n";
        $headers .= "Subject: $subject\r\n";
        $headers .= "MIME-Version: 1.0\r\n";
        $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
        $headers .= "\r\n";

        $body = "<html><body>";
        $body .= "<h2>St. Joseph Parish Notification</h2>";
        $body .= "<p>" . nl2br(htmlspecialchars($message)) . "</p>";
        $body .= "<hr>";
        $body .= "<p><small>This is an automated message from St. Joseph Parish System</small></p>";
        $body .= "</body></html>";

        fputs($smtp, $headers . $body . "\r\n.\r\n");
        read_smtp_response($smtp);

        // Quit
        fputs($smtp, "QUIT\r\n");
        fclose($smtp);

        error_log("Email sent successfully to $to");
        return true;

    } catch (Exception $e) {
        error_log("SMTP Exception: " . $e->getMessage());
        return false;
    }
}

// Helper to read SMTP responses
function read_smtp_response($socket) {
    $response = '';
    while ($line = fgets($socket, 1024)) {
        $response .= $line;
        if (substr($line, 3, 1) == ' ') break;
    }
    return $response;
}

// Fallback email function using PHP mail()
function sendEmailFallback($to, $subject, $message) {
    $headers = "MIME-Version: 1.0" . "\r\n";
    $headers .= "Content-type: text/html; charset=UTF-8" . "\r\n";
    $headers .= "From: noreply@stjosephparish.com" . "\r\n";

    $html_message = "<html><body>";
    $html_message .= "<h2>St. Joseph Parish Notification</h2>";
    $html_message .= "<p>" . nl2br(htmlspecialchars($message)) . "</p>";
    $html_message .= "<hr>";
    $html_message .= "<p><small>This is an automated message from St. Joseph Parish System</small></p>";
    $html_message .= "</body></html>";

    return mail($to, $subject, $html_message, $headers);
}

// Helper function to send SMS using GMS Philippines
function sendSMS($phone, $message) {
    // GMS Philippines API Configuration
    // Get your credentials from: https://www.gms.ph/
    
    $gms_api_key = getenv('GMS_API_KEY') ?: 'YOUR_GMS_API_KEY_HERE';
    $gms_api_secret = getenv('GMS_API_SECRET') ?: 'YOUR_GMS_API_SECRET_HERE';
    $gms_sender_id = getenv('GMS_SENDER_ID') ?: 'STJOSEPH';  // Your registered Sender ID
    
    // Validate API credentials are set
    if ($gms_api_key === 'YOUR_GMS_API_KEY_HERE' || $gms_api_secret === 'YOUR_GMS_API_SECRET_HERE') {
        error_log("SMS Error: GMS API credentials not configured. Set GMS_API_KEY and GMS_API_SECRET environment variables.");
        return false;
    }
    
    // API Endpoint
    $api_url = 'https://http-api.gms.ph/SendMessage';
    
    // Prepare request data
    $request_data = [
        'apikey' => $gms_api_key,
        'apisecret' => $gms_api_secret,
        'to' => $phone,
        'message' => $message,
        'senderid' => $gms_sender_id
    ];
    
    // Send via cURL
    $ch = curl_init($api_url);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($request_data));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    
    try {
        $response = curl_exec($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        // Parse response
        if ($http_code === 200 && $response) {
            // GMS returns response like: "msgid=123456789"
            if (strpos($response, 'msgid=') !== false) {
                error_log("SMS sent successfully to $phone via GMS. Response: $response");
                return true;
            } else if (strpos($response, 'Error') !== false) {
                error_log("SMS Error from GMS: $response");
                return false;
            }
        }
        
        error_log("SMS Error: HTTP $http_code - $response");
        return false;
        
    } catch (Exception $e) {
        error_log("SMS Exception: " . $e->getMessage());
        return false;
    }
}

// Alternative: Semaphore SMS Gateway (backup option)
function sendSMS_Semaphore($phone, $message) {
    // Semaphore Configuration - https://semaphore.co/
    $semaphore_api_key = getenv('SEMAPHORE_API_KEY') ?: 'YOUR_SEMAPHORE_API_KEY';
    
    if ($semaphore_api_key === 'YOUR_SEMAPHORE_API_KEY') {
        return false;
    }
    
    $api_url = 'https://api.semaphore.co/v4/messages';
    
    $request_data = [
        'apikey' => $semaphore_api_key,
        'number' => $phone,
        'message' => $message,
        'sendername' => 'STJOSEPH'
    ];
    
    $ch = curl_init($api_url);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($request_data));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    
    try {
        $response = curl_exec($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($http_code === 200) {
            $result = json_decode($response, true);
            return isset($result['status']) && $result['status'] === 'success';
        }
        return false;
        
    } catch (Exception $e) {
        error_log("Semaphore SMS Exception: " . $e->getMessage());
        return false;
    }
}

?>
