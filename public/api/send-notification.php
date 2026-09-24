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

require_once dirname(__DIR__, 2) . '/vendor/autoload.php';

$scriptName = basename($_SERVER['SCRIPT_FILENAME'] ?? $_SERVER['SCRIPT_NAME'] ?? '');
$calledDirectly = $scriptName === basename(__FILE__);

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

if ($calledDirectly) {
    $request_method = $_SERVER['REQUEST_METHOD'];

    if ($request_method === 'POST') {
        // Send notification via Email, SMS, or In-App
        $data = json_decode(file_get_contents('php://input'), true);

        // Validate required fields
        if (!isset($data['notif_type']) || !isset($data['message_body'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Missing required fields: notif_type, message_body']);
            exit();
        }

        $notif_type = $data['notif_type']; // 'Email', 'SMS', or 'InApp'
        $message_body = $conn->real_escape_string($data['message_body']);
        $person_id = isset($data['person_id']) ? intval($data['person_id']) : NULL;
        $subject = isset($data['subject']) ? $conn->real_escape_string($data['subject']) : 'Notification from St. Joseph Parish';
        $category = isset($data['category']) ? $conn->real_escape_string($data['category']) : 'General';
        $action_url = isset($data['action_url']) ? $conn->real_escape_string($data['action_url']) : NULL;
        $action_type = isset($data['action_type']) ? $conn->real_escape_string($data['action_type']) : NULL;

        // For InApp notifications, person_id is required
        if ($notif_type === 'InApp') {
            if (!$person_id) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'person_id is required for InApp notifications']);
                exit();
            }
            
            // Verify person exists
            $person_check = $conn->query("SELECT person_id FROM persons WHERE person_id = $person_id");
            if (!$person_check || $person_check->num_rows === 0) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Person not found in system']);
                exit();
            }
            
            // For InApp, we don't need a recipient address, just store the message
            $sent_status = 'Sent';
            $recipient_address = NULL;
            
            // Prepare nullable action_url/action_type for SQL
            $action_url_sql = is_null($action_url) ? 'NULL' : "'" . $action_url . "'";
            $action_type_sql = is_null($action_type) ? 'NULL' : "'" . $action_type . "'";

            // Insert InApp notification
            $query = "INSERT INTO notification_logs (person_id, message_body, notif_type, category, sent_status, action_url, action_type, recipient_address, is_read, sent_at)
                      VALUES ($person_id, '$message_body', 'InApp', '$category', '$sent_status', $action_url_sql, $action_type_sql, NULL, 0, NOW())";
            
            if ($conn->query($query) === TRUE) {
                $notif_id = $conn->insert_id;
                logAuditAction($_SESSION['user_id'] ?? 0, 'CREATE', 'notification_logs', "Sent InApp notification to person_id: $person_id", $conn);
                
                http_response_code(201);
                echo json_encode([
                    'success' => true,
                    'message' => 'In-app notification sent successfully',
                    'notif_id' => $notif_id,
                    'status' => $sent_status
                ]);
            } else {
                http_response_code(500);
                echo json_encode(['success' => false, 'message' => 'Failed to save notification: ' . $conn->error]);
            }
            exit();
        }

        // Validate recipient for Email/SMS
        if (!isset($data['recipient'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Missing required fields: recipient']);
            exit();
        }

        $recipient = $conn->real_escape_string($data['recipient']); // email address or phone number

        // If person_id is provided, get the person's contact info and validate/set recipient
        if ($person_id) {
            $person_check = $conn->query("SELECT email, contact_no FROM persons WHERE person_id = $person_id");
            if (!$person_check || $person_check->num_rows === 0) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Person not found in system']);
                exit();
            }
            
            $person_data = $person_check->fetch_assoc();
            
            // Set recipient from person's record if not provided or empty
            if ($notif_type === 'Email') {
                if (empty($person_data['email'])) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'message' => 'Person does not have an email address on file']);
                    exit();
                }
                if (empty($recipient)) {
                    $recipient = $person_data['email'];
                } elseif ($recipient !== $person_data['email'] && $recipient !== trim($person_data['email'])) {
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
                if (empty($recipient)) {
                    $recipient = $person_data['contact_no'];
                } elseif ($recipient !== $person_data['contact_no'] && $recipient !== trim($person_data['contact_no'])) {
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
    exit();
}

// Helper function to send email using Gmail API or PHPMailer SMTP
function sendEmail($to, $subject, $message) {
    $client_id = getenv('GOOGLE_CLIENT_ID');
    $client_secret = getenv('GOOGLE_CLIENT_SECRET');
    $refresh_token = getenv('GOOGLE_REFRESH_TOKEN');
    $mail_from = getenv('MAIL_FROM_ADDRESS') ?: 'noreply@stjosephparish.com';
    $mail_from_name = getenv('MAIL_FROM_NAME') ?: 'St. Joseph Parish';

    if ($client_id && $client_secret && $refresh_token && $client_id !== 'YOUR_GOOGLE_CLIENT_ID') {
        // Use Gmail API
        $client = new Google_Client();
        $client->setClientId($client_id);
        $client->setClientSecret($client_secret);
        $client->refreshToken($refresh_token);
        $client->setScopes('https://www.googleapis.com/auth/gmail.send');
        $client->setAccessType('offline');

        $service = new Google_Service_Gmail($client);

        $rawMessage = "From: $mail_from_name <$mail_from>\r\n";
        $rawMessage .= "To: $to\r\n";
        $rawMessage .= "Subject: $subject\r\n";
        $rawMessage .= "MIME-Version: 1.0\r\n";
        $rawMessage .= "Content-Type: text/html; charset=UTF-8\r\n";
        $rawMessage .= "\r\n";
        $rawMessage .= "<html><body><h2>St. Joseph Parish Notification</h2><p>" . nl2br(htmlspecialchars($message)) . "</p><hr><p><small>This is an automated message from St. Joseph Parish System</small></p></body></html>";

        $mime = rtrim(strtr(base64_encode($rawMessage), '+/', '-_'), '=');

        $msg = new Google_Service_Gmail_Message();
        $msg->setRaw($mime);

        try {
            $service->users_messages->send('me', $msg);
            error_log("Email sent via Gmail API to $to");
            return true;
        } catch (Exception $e) {
            error_log("Gmail API Error: " . $e->getMessage());
            return false;
        }
    } else {
        // Fallback to PHPMailer SMTP
        $mail_username = getenv('MAIL_USERNAME');
        $mail_password = getenv('MAIL_PASSWORD');
        if (!$mail_username || !$mail_password) {
            error_log("Warning: No email credentials configured, using local mail().");
            return sendEmailFallback($to, $subject, $message);
        }

        $mail = new PHPMailer\PHPMailer\PHPMailer(true);
        try {
            $mail->isSMTP();
            $mail->Host = 'smtp.gmail.com';
            $mail->SMTPAuth = true;
            $mail->Username = $mail_username;
            $mail->Password = $mail_password;
            $mail->SMTPSecure = PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
            $mail->Port = 587;

            $mail->setFrom($mail_from, $mail_from_name);
            $mail->addAddress($to);
            $mail->isHTML(true);
            $mail->Subject = $subject;
            $mail->Body = "<html><body><h2>St. Joseph Parish Notification</h2><p>" . nl2br(htmlspecialchars($message)) . "</p><hr><p><small>This is an automated message from St. Joseph Parish System</small></p></body></html>";

            $mail->send();
            error_log("Email sent via SMTP to $to");
            return true;
        } catch (Exception $e) {
            error_log("PHPMailer SMTP Error: " . $mail->ErrorInfo);
            return false;
        }
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

// Helper function to send SMS using Semaphore, GMS, or a free email-to-SMS fallback
function sendSMS($phone, $message) {
    $normalized_phone = normalizePhoneNumber($phone);

    // Try Semaphore first
    $semaphore_api_key = getenv('SEMAPHORE_API_KEY') ?: '';
    if ($semaphore_api_key && $semaphore_api_key !== 'YOUR_SEMAPHORE_API_KEY_HERE') {
        if (sendSMS_Semaphore($normalized_phone, $message)) {
            return true;
        }
    }

    // Fallback to GMS Philippines API Configuration
    // Get your credentials from: https://www.gms.ph/
    $gms_api_key = getenv('GMS_API_KEY') ?: 'YOUR_GMS_API_KEY_HERE';
    $gms_api_secret = getenv('GMS_API_SECRET') ?: 'YOUR_GMS_API_SECRET_HERE';
    $gms_sender_id = getenv('GMS_SENDER_ID') ?: 'STJOSEPH';  // Your registered Sender ID

    // Validate API credentials are set
    if ($gms_api_key !== 'YOUR_GMS_API_KEY_HERE' && $gms_api_secret !== 'YOUR_GMS_API_SECRET_HERE') {
        if (sendSMS_GMS($normalized_phone, $message, $gms_api_key, $gms_api_secret, $gms_sender_id)) {
            return true;
        }
    }

    // Free fallback via email-to-SMS gateway for carriers that support it.
    // Example: set FREE_SMS_GATEWAY=txt.att.net or FREE_SMS_GATEWAY={{phone}}@yourdomain.com
    if (sendSMS_FreeEmailGateway($normalized_phone, $message)) {
        return true;
    }

    error_log("SMS Error: No paid or free SMS gateway configured/available.");
    return false;
}

function normalizePhoneNumber($phone) {
    $phone = trim($phone);
    $phone = preg_replace('/[^0-9+]/', '', $phone);

    if (strpos($phone, '+63') === 0) {
        return '0' . substr($phone, 3);
    }

    if (strpos($phone, '63') === 0 && strlen($phone) > 10) {
        return '0' . substr($phone, 2);
    }

    return $phone;
}

function sendSMS_GMS($phone, $message, $gms_api_key, $gms_api_secret, $gms_sender_id) {
    $api_url = 'https://http-api.gms.ph/SendMessage';

    // Ensure phone is in international format for API (+63...)
    $api_phone = $phone;
    if (strpos($api_phone, '0') === 0) {
        $api_phone = '+63' . substr($api_phone, 1);
    }

    $request_data = [
        'apikey' => $gms_api_key,
        'apisecret' => $gms_api_secret,
        'to' => $api_phone,
        'message' => $message,
        'senderid' => $gms_sender_id
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

        if ($http_code === 200 && $response) {
            if (strpos($response, 'msgid=') !== false) {
                error_log("SMS sent successfully to $phone via GMS. Response: $response");
                return true;
            } elseif (strpos($response, 'Error') !== false) {
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

function sendSMS_FreeEmailGateway($phone, $message) {
    $gateway = getenv('FREE_SMS_GATEWAY') ?: getenv('FREE_SMS_GATEWAY_DOMAIN') ?: '';
    if ($gateway === '') {
        return false;
    }

    $gateway = trim($gateway);
    $gateway = ltrim($gateway, '@');
    $normalized_phone = normalizePhoneNumber($phone);

    if (strpos($gateway, '{{phone}}') !== false) {
        $to = str_replace('{{phone}}', $normalized_phone, $gateway);
    } else {
        $to = $normalized_phone . '@' . $gateway;
    }

    $subject = 'St. Joseph Parish Notification';
    $headers = "MIME-Version: 1.0\r\n";
    $headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
    $headers .= "From: noreply@stjosephparish.com\r\n";

    try {
        if (mail($to, $subject, $message, $headers)) {
            error_log("SMS sent via free email-to-SMS gateway to $to");
            return true;
        }
    } catch (Exception $e) {
        error_log("Free SMS gateway error: " . $e->getMessage());
    }

    return false;
}

// Alternative: Semaphore SMS Gateway (backup option)
function sendSMS_Semaphore($phone, $message) {
    // Semaphore Configuration - https://semaphore.co/
    $semaphore_api_key = getenv('SEMAPHORE_API_KEY') ?: 'YOUR_SEMAPHORE_API_KEY';
    
    if ($semaphore_api_key === 'YOUR_SEMAPHORE_API_KEY') {
        return false;
    }
    
    $api_url = 'https://api.semaphore.co/v4/messages';
    
    // Use international format (+63) for Semaphore API
    $api_phone = $phone;
    if (strpos($api_phone, '0') === 0) {
        $api_phone = '+63' . substr($api_phone, 1);
    }

    $request_data = [
        'apikey' => $semaphore_api_key,
        'number' => $api_phone,
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
            $ok = isset($result['status']) && $result['status'] === 'success';
            if (!$ok) error_log("Semaphore response: $response");
            return $ok;
        }

        error_log("Semaphore HTTP $http_code - $response");
        return false;
        
    } catch (Exception $e) {
        error_log("Semaphore SMS Exception: " . $e->getMessage());
        return false;
    }
}

?>
