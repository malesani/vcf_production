<?php
// CORS and security headers
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
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


if ($_SERVER['REQUEST_METHOD'] === "GET") {        // Verifica che il metodo HTTP sia GET

    $authManager = new authManager();

    try {

        $profile_response = $authManager->profile();

        if ($profile_response['success']) {
            http_response_code(200);
            echo json_encode([
                'success' => true,
                'message' => $profile_response['message'],
                'data' => [
                    'user_data' => $profile_response['user_data'],
                    'companies_data' => $profile_response['companies_data'],
                ]

            ]);
        } else {
            http_response_code(401);
            echo json_encode([
                'success' => false,
                'message' => $profile_response['message'],
                'error' => $profile_response['error'],
            ]);
        }
    } catch (Exception $e) {
        http_response_code(500);    // 500 ( Internal Server Error )
        echo json_encode([
            'success' => false,
            'message' => 'profile.500.internalServerFatalError',
            'error'   => $e->getMessage()
        ]);
    }
} else if ($_SERVER['REQUEST_METHOD']==='POST') {
    $authManager = new authManager();

    if ($authManager->check_isProfileLoaded()) {
        $permsManager = new permsManager($authManager);

        $permContextData = $permsManager->get_permContextData();

        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => 'Permissions Context Loaded.',
            'data' => $permContextData
        ]);
    } else {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'message' => 'profile.401.invalidOrExpiredToken',
            'error' => 'Invalid or Expired session!',
        ]);
    }
} else {
    http_response_code(405);        // 405 ( Method Not Allowed )
    echo json_encode([
        'success' => false,
        'message' => 'profile.405.methodNotAllowed',
        'error'   => 'Only GET, POST requests are allowed',
    ]);
}

ob_end_flush();
