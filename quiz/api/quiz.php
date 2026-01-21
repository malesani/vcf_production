<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("X-Content-Type-Options: nosniff");
header("X-Frame-Options: DENY");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    echo json_encode(["success" => true]);
    exit;
}

ob_start();
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

header("Content-Type: application/json");
http_response_code(500);

$srcPath = $_SERVER["DOCUMENT_ROOT"];
if ($srcPath == "") $srcPath = "/var/www/html";

require_once $srcPath . "/auth/inclusions.php";
require_once $srcPath . "/general_inclusions.php";

require_once "../obj/quizObj.php";

try {
    $authManager = new authManager();

    // ✅ auth opzionale (NO check_isProfileLoaded)
    $token = $_COOKIE['auth_token'] ?? null;
    if (!$token) {
        $token = $authManager->getBearerToken();
    }

    $decoded = null;
    $user_uid = null;
    if ($token) {
        $decoded = $authManager->validateJWT_authToken($token);
        if ($decoded && isset($decoded->data->user_uid)) {
            $user_uid = (string)$decoded->data->user_uid;
        }
    }

    // requestData
    $requestData = [];
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $requestData = $_GET;
    } else {
        $json = file_get_contents("php://input");
        $requestData = json_decode($json, true);
        if (!is_array($requestData)) $requestData = [];
    }

    if (!isset($requestData['opt'])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'quiz.400.optionNotSet',
            'error' => 'Option not set.'
        ]);
        exit;
    }

    $conn = $authManager->get_dbConn(); // ✅ funziona anche da guest nel tuo authManager
    $quizObj = new quizObj($conn);

    switch ($_SERVER['REQUEST_METHOD']) {

        case "POST":
            switch ($requestData['opt']) {

                case "start":
                    $version = $requestData['version'] ?? null;
                    if (!$version) {
                        http_response_code(400);
                        echo json_encode(['success' => false, 'message' => 'quiz.missingParameters', 'error' => 'version missing']);
                        break;
                    }

                    $resp = $quizObj->startDraft([
                        'version' => $version,
                        'user_uid' => $user_uid, // può essere null
                        'meta' => [
                            'ip' => $_SERVER['REMOTE_ADDR'] ?? null,
                            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? null,
                            'accept_language' => $_SERVER['HTTP_ACCEPT_LANGUAGE'] ?? null,
                            'referrer' => $_SERVER['HTTP_REFERER'] ?? null,
                        ]
                    ]);

                    if (!empty($resp['success'])) {
                        http_response_code(200);
                        echo json_encode([
                            'success' => true,
                            'message' => $resp['message'],
                            'data' => $resp['data'] ?? []
                        ]);
                    } else {
                        http_response_code(400);
                        echo json_encode([
                            'success' => false,
                            'message' => $resp['message'],
                            'error' => $resp['error'] ?? 'Unknown error'
                        ]);
                    }
                    break;


                case "submit":
                    // forza user_uid dal token se c'è
                    $requestData['user_uid'] = $user_uid;

                    // meta server side
                    $requestData['meta'] = [
                        'ip' => $_SERVER['REMOTE_ADDR'] ?? null,
                        'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? null,
                        'accept_language' => $_SERVER['HTTP_ACCEPT_LANGUAGE'] ?? null,
                        'referrer' => $_SERVER['HTTP_REFERER'] ?? null,
                    ];

                    $resp = $quizObj->submitQuiz($requestData);

                    if (!empty($resp['success'])) {
                        http_response_code(200);
                        echo json_encode([
                            'success' => true,
                            'message' => $resp['message'],
                            'data' => $resp['data'] ?? []
                        ]);
                    } else {
                        http_response_code(400);
                        echo json_encode([
                            'success' => false,
                            'message' => $resp['message'],
                            'error' => $resp['error'] ?? 'Unknown error'
                        ]);
                    }
                    break;

                default:
                    http_response_code(400);
                    echo json_encode([
                        'success' => false,
                        'message' => 'quiz.400.invalidOption',
                        'error' => 'Option: "' . $requestData['opt'] . '" is invalid.'
                    ]);
                    break;
            }
            break;

        default:
            http_response_code(405);
            echo json_encode([
                'success' => false,
                'message' => 'quiz.405.methodNotAllowed',
                'error' => 'Method: "' . $_SERVER['REQUEST_METHOD'] . '" not allowed'
            ]);
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Internal Server FatalError',
        'error' => $e->getMessage()
    ]);
}

ob_end_flush();
