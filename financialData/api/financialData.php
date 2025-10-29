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

require_once "$srcPath/DataProviders/obj/ApiException.php";


require_once __DIR__ . "/../../DataProviders/obj/TwelveDataClient.php";
require_once "$srcPath/financialData/obj/financialDataManager.php";

use App\Exceptions\ApiException;

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
            message: 'financialData.400.optionNotSet',
            error: 'Option not set.'
        ));
        exit;
    }


    $defaultOption = false;
    switch ($method) {
        case 'GET':
            switch ($requestData['opt']) {
                case 'getStocksInfo':
                    if (false) {
                        http_response_code(400);
                        echo json_encode($ReqResp->toArray(
                            success: false,
                            message: 'financialData.400.missingRequiredParameters',
                            error: 'Missing parameter: project_uid'
                        ));
                        break;
                    }

                    $obj = new financialDataManager($authManager);
                    $stocksInfo = $obj->get_stocksInfo();
                    if ($stocksInfo) {
                        http_response_code(200);
                        echo json_encode($ReqResp->toArray(
                            success: true,
                            message: 'financialData.200.successRetrieveData',
                            data: ['stocksInfo' => $stocksInfo]
                        ));
                    } else {
                        http_response_code(400);
                        echo json_encode($ReqResp->toArray(
                            success: false,
                            message: 'financialData.400.errorRetrieveData',
                            error: 'Empty info'
                        ));
                    }
                    break;

                default:
                    $defaultOption = true;
                    break;
            }
            break;

        default:
            http_response_code(405);
            echo json_encode($ReqResp->toArray(
                success: false,
                message: 'financialData.405.methodNotAllowed',
                error: 'Method "' . $method . '" not allowed'
            ));
    }

    if ($defaultOption) {
        http_response_code(400);
        echo json_encode($ReqResp->toArray(
            success: false,
            message: 'financialData.400.invalidOption',
            error: 'Option: ' . $method . ' - "' . $requestData['opt'] . '" invalid'
        ));
    }
} catch (ApiException $e) {
    $status = $e->getHttpStatus() ?: 400;
    http_response_code($status);
    echo json_encode($ReqResp->toArray(
        success: false,
        message: $e->getMessage(),
        error: $e->getCode()
    ));
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode($ReqResp->toArray(
        success: false,
        message: 'Internal Server FatalError',
        error: $e->getMessage()
    ));
}
ob_end_flush();
