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

    $authManager = new authManager();

    try {

        $logout_response = $authManager->logout();

        if ($logout_response['success']) {

            http_response_code(200);
            echo json_encode([
                'success' => true,
                'message' => $logout_response['message'],
            ]);

        } else {

            http_response_code(401);    // 401 ( Unauthorized )
            echo json_encode([
                'success' => false,
                'message' => $logout_response['message'],
                'error' => $logout_response['error'],
            ]);

        }
    } catch (Exception $e) {
        http_response_code(500);    // 500 ( Internal Server Error )
        echo json_encode([
            'success' => false,
            'message' => 'logout.500.internalServerFatalError',
            'error'   => $e->getMessage()
        ]);
    }
} else {
    http_response_code(405);        // 405 ( Method Not Allowed )
    echo json_encode([
        'success' => false,
        'message' => 'logout.405.methodNotAllowed',
        'error'   => 'Only POST requests are allowed',
    ]);
}

ob_end_flush();
?>
