<?php
// CORS and security headers
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("X-Content-Type-Options: nosniff");
header("X-Frame-Options: DENY");

ob_start();

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

header("Content-Type: application/json");
http_response_code(500); // default

$srcPath = $_SERVER['DOCUMENT_ROOT'] ?: '/var/www/html';
require_once "$srcPath/auth/inclusions.php";


try {
    $authManager = new authManager();
    $trad = new langClass($authManager);

    $method = $_SERVER['REQUEST_METHOD'];
    $requestData = $method === 'GET'
        ? $_GET : (json_decode(file_get_contents('php://input'), true) ?: []);

    if (empty($requestData['opt'])) {
        http_response_code(400);
        echo json_encode($authManager->responseArr([
            'success' => false,
            'message' => $trad->lang('signup.400.optionNotSet'),
            'error'   => 'Option not set'
        ]));
        exit;
    }

    $defaultOption = false;
    switch ($method) {
        case 'GET':
            switch ($requestData['opt']) {
                default:
                    $defaultOption = true;
                    break;
            }
            break;

        case 'PUT':
            switch ($requestData['opt']) {
                default:
                    $defaultOption = true;
                    break;
            }
            break;

        case 'POST':
            switch ($requestData['opt']) {
                // --------------------------------------------------------
                // Valida il token di invito
                // --------------------------------------------------------
                case 'validate_rInvitation':
                    $requiredFields = [ 'token' ];

                    // verifica required
                    $missing = array_diff($requiredFields, array_keys($requestData));
                    if (!empty($missing)) {
                        http_response_code(400);
                        echo json_encode($authManager->responseArr([
                            'success' => false,
                            'message' => $trad->lang('signup.400.missingRequiredParameters'),
                            'error'   => 'Missing: '. json_encode(array_values($missing))
                        ]));
                        break;
                    }

                    $signupManager = new signupManager( $authManager );
                    $response = $signupManager->check_inviteRestrictedToken($requestData['token']);

                    if ($response['success']) {
                        http_response_code(200);
                        echo json_encode($authManager->responseArr([
                            'success' => true, 
                            'message' => $trad->lang($response['message']),
                            'data' => $response['data']
                        ]));
                    } else {
                        http_response_code(400);
                        echo json_encode($authManager->responseArr([
                            'success' => false, 
                            'message' => $trad->lang($response['message']),
                            'error' => $response['error'] ?: "Unknown error"
                        ]));
                    }
                    break;

                default:
                    $defaultOption = true;
                    break;
            }
            break;

        default:
            http_response_code(405);
            echo json_encode([
                'success' => false,
                'message' => $trad->lang('signup.405.methodNotAllowed'),
                'error'   => "Method \"$method\" not allowed"
            ]);
    }

    if ($defaultOption) {
        http_response_code(400);
        echo json_encode($authManager->responseArr([
            'success' => false,
            'message' => $trad->lang('signup.400.invalidOption'),
            'error'   => 'Invalid option: '.$method.' / "'.$requestData['opt'].'"'
        ]));
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode($authManager->responseArr([
        'success' => false,
        'message' => 'Internal Server FatalError',
        'error'   => $e->getMessage()
    ]));
}

ob_end_flush();
?>