<?php
// CORS e header di sicurezza
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("X-Content-Type-Options: nosniff");
header("X-Frame-Options: DENY");

ob_start();

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

header("Content-Type: application/json");

http_response_code(500);

require_once "../inclusions.php";

if ($_SERVER['REQUEST_METHOD'] === "POST") {
    $requestData_json = file_get_contents("php://input");
    $requestData = json_decode($requestData_json, true);

    // Verifica della presenza dell'email nel payload
    if (!isset($requestData['email'])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'auth.400.missingRequiredParameters',
            'error'   => 'Missing required parameter: email'
        ]);
        exit;
    }

    $email = trim($requestData['email']);

    try {
        $authManager = new authManager();

        $forgot_response = $authManager->forgotPassword($email);

        if ($forgot_response["success"]) {
            http_response_code(200);
            echo json_encode([
                'success' => true,
                'message' => $forgot_response["message"],
            ]);
        } else {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => $forgot_response["message"],
                'error'   => $forgot_response["error"]
            ]);
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'auth.500.internalServerFatalError',
            'error'   => $e->getMessage()
        ]);
    }
} else {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'message' => 'auth.405.methodNotAllowed',
        'error'   => 'Only POST requests are allowed',
    ]);
}

ob_end_flush();
