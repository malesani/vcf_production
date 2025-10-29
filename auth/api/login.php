<?php
// CORS and security headers
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


http_response_code(500);        // Default HTTP Response :  500 (Internal Server Error)


require_once "../inclusions.php";


if ($_SERVER['REQUEST_METHOD'] === "POST") {        // Verifica che il metodo HTTP sia POST

    $requestData_json = file_get_contents("php://input");
    $requestData = json_decode($requestData_json, true);

    // CHECK PAYLOAD
    if (!isset($requestData['user_key']) || !isset($requestData['password'])) {
        http_response_code(400);    // 400 ( Bad Request )
        echo json_encode([
            'success' => false,
            'message'   => 'auth.400.missingRequiredParameters',
            "error" => 'Missing required parameters: user_key and password'
        ]);
        exit;
    }

    $user_key = trim($requestData['user_key']);
    $password = $requestData['password'];
    $remember_me = isset($requestData['remember_me']) ? (bool)$requestData['remember_me'] : false;

    
    try {

        $authManager = new authManager();

        $login_response = $authManager->login($user_key, $password, $remember_me);

        if ($login_response["success"]) {

            http_response_code(200);
            echo json_encode([
                'success' => true,
                'message' => $login_response['message'],
            ]);

        } else {

            http_response_code(401);    // 401 ( Unauthorized )
            echo json_encode([
                'success' => $login_response["success"],
                'message' => $login_response["message"],
                'error' => $login_response["error"]
            ]);

        }
    } catch (Exception $e) {
        http_response_code(500);    // 500 ( Internal Server Error )
        echo json_encode([
            'success' => false,
            'message' => 'auth.500.internalServerFatalError',
            'error'   => $e->getMessage()
        ]);
    }
} else {
    http_response_code(405);        // 405 ( Method Not Allowed )
    echo json_encode([
        'success' => false,
        'message' => 'auth.405.methodNotAllowed',
        'error'   => 'Only POST requests are allowed',
    ]);
}

ob_end_flush();
?>
