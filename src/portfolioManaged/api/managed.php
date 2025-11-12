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
http_response_code(500); // Default HTTP response

$srcPath = $_SERVER['DOCUMENT_ROOT'] ?: '/var/www/html';
require_once "$srcPath/auth/inclusions.php";
require_once "$srcPath/general_inclusions.php";

require_once __DIR__ . "/../obj/managedPortObj.php";

try {
    $authManager = new authManager();
    if (!$authManager->check_isProfileLoaded()) {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'message' => 'Invalid or Expired session!',
            'error'   => 'Invalid or Expired session!'
        ]);
        exit;
    }

    $permsManager = new permsManager($authManager);
    $ReqResp = new RequestResponse($authManager);

    $method = $_SERVER['REQUEST_METHOD'];
    $requestData = ($method === 'GET')
        ? $_GET
        : (json_decode(file_get_contents('php://input'), true) ?: []);

    if (empty($requestData['opt'])) {
        http_response_code(400);
        echo json_encode($ReqResp->toArray(
            success: false,
            message: 'managed_portfolio.400.optionNotSet',
            error: 'Option not set.'
        ));
        exit;
    }

    // setup fields from obj
    $managedBase    = new managedPortObjBase($authManager, $permsManager);

    // end setup

    $defaultOption = false;
    switch ($method) {
        case 'GET':
            switch ($requestData['opt']) {
                case 'managed_portfolio_info':
                    if (empty($requestData['managed_uid'])) {
                        http_response_code(400);
                        echo json_encode($ReqResp->toArray(
                            success: false,
                            message: 'managed_portfolio.400.missingRequiredParameters',
                            error: 'Missing parameter: managed_uid'
                        ));
                        break;
                    }

                    $obj  = new managedPortObj($authManager, $permsManager, $requestData['managed_uid']);
                    $info = $obj->get_managedPortfolio();
                    if ($info) {
                        http_response_code(200);
                        echo json_encode($ReqResp->toArray(
                            success: true,
                            message: 'managed_portfolio.200.successRetrieveData',
                            data: ['managed_portfolio_info' => $info]
                        ));
                    } else {
                        http_response_code(400);
                        echo json_encode($ReqResp->toArray(
                            success: false,
                            message: 'managed_portfolio.400.errorRetrieveData',
                            error: 'Empty managed_portfolio_info'
                        ));
                    }
                    break;

                case 'managed_list':
                    $obj  = new managedPortObjList($authManager, $permsManager);
                    $res = $obj->get_managedPortfoliosList();
                    http_response_code($res['success'] ? 200 : 400);
                    echo json_encode($ReqResp->toArray(
                        success: $res['success'],
                        message: $res['message'],
                        data: $res['data'] ?? [],
                        error: $res['error'] ?? ''
                    ));
                    break;

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
                default:
                    $defaultOption = true;
                    break;
            }
            break;

        default:
            http_response_code(405);
            echo json_encode($ReqResp->toArray(
                success: false,
                message: 'managed_portfolio.405.methodNotAllowed',
                error: 'Method "' . $method . '" not allowed'
            ));
    }

    if ($defaultOption) {
        http_response_code(400);
        echo json_encode($authManager->responseArr([
            "success" => false,
            "message" => 'managed_portfolio.400.invalidOption',
            "error" => 'Option: ' . $method . ' - "' . $requestData['opt'] . '" invalid'
        ]));
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode($authManager->responseArr([
        "success" => false,
        "message" => 'Internal Server FatalError',
        "error" => $e->getMessage()
    ]));
}
ob_end_flush();
