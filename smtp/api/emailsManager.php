<?php
// emailsManager.php (MINIMAL - solo invio mail)

// CORS and security headers
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("X-Content-Type-Options: nosniff");
header("X-Frame-Options: DENY");
header("Content-Type: application/json");

// Preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

http_response_code(500);

$srcPath = $_SERVER["DOCUMENT_ROOT"] ?: "/var/www/html";

// includi solo quello che serve davvero
require_once $srcPath . "/config/config.php";
require_once __DIR__ . "/../obj/smtpObj.php";
require_once __DIR__ . "/../obj/templatesObj.php";

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode([
            'success' => false,
            'message' => 'Method not allowed'
        ]);
        exit;
    }

    $input = json_decode(file_get_contents('php://input'), true) ?: [];
    $required = ['template', 'data', 'to'];
    $missing = array_diff($required, array_keys($input));
    if ($missing) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Parametri mancanti: ' . implode(', ', $missing)
        ]);
        exit;
    }

    $templateName = (string)$input['template'];
    $templateData = (array)$input['data'];
    $to           = (string)$input['to'];

    // opzionali (se vuoi evitare spoofing, vedi nota sotto)
    $from     = isset($input['from']) ? (string)$input['from'] : null;
    $fromName = isset($input['from_name']) ? (string)$input['from_name'] : null;

    if ($to === '' || !filter_var($to, FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Destinatario non valido'
        ]);
        exit;
    }

    // PER ORA supportiamo solo forgot_password
    if ($templateName !== 'forgot_password') {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Template non supportato'
        ]);
        exit;
    }

    // Genero HTML + subject
    $templateDesc = (string)($templateData['subject'] ?? '');
    $companyUid = ''; // non usato nella versione minimale
    $html = templatesObj::render($companyUid, $templateName, $templateDesc, $templateData);
    $subject = templatesObj::resolveSubject($companyUid, $templateName, $templateData);

    // Mittente: override -> config
    $fromAddress = (string)SmtpConfig::FROM;
    $fromLabel   = (string)SmtpConfig::FROM_NAME;

    if ($fromAddress === '') {
        throw new Exception("Mittente non configurato: SMTP_FROM mancante");
    }

    // Invio
    $smtp = new smtpObj();
    $smtp->sendMail($to, $subject, $html, $fromAddress, $fromLabel);

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Email inviata'
    ]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Internal Server Error',
        'error'   => $e->getMessage()
    ]);
}
