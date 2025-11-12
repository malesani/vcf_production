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
require_once "$srcPath/financialData/obj/StockPriceProvider.php";

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
    $trad= new langClass($authManager);

    $method = $_SERVER['REQUEST_METHOD'];
    $requestData = ($method === 'GET')
        ? $_GET
        : (json_decode(file_get_contents('php://input'), true) ?: []);

    if (empty($requestData['opt'])) {
        http_response_code(400);
        echo json_encode($authManager->responseArr([
            'success' => false,
            'message' => $trad->lang('400.optionNotSet'),
            'error'   => 'Option not set.'
        ]));
        exit;
    }


    $defaultOption = false;
    switch ($method) {
        case 'GET':
            switch ($requestData['opt']) {
                case 'twelveData':
                    if (false) {
                        http_response_code(400);
                        echo json_encode($authManager->responseArr([
                            'success' => false,
                            'message' => $trad->lang('400.missingRequiredParameters'),
                            'error'   => 'Missing parameter: project_uid'
                        ]));
                        break;
                    }

                    $obj = new TwelveDataClient($authManager);
                    //$info = $obj->saveStocksInfo();
                    $res = $obj->updateCurrentPricesFromPriority();
                    if ($res['success']) {
                        http_response_code(200);
                        echo json_encode($authManager->responseArr([
                            'success' => $res['success'],
                            'message' => $res['message'],
                            'data'    => $res['data']
                        ]));
                    } else {
                        http_response_code(400);
                        echo json_encode($authManager->responseArr([
                            'success' => $res['success'],
                            'message' => $res['message'],
                            'error'   => $res['error']
                        ]));
                    }
                    break;

                case 'getStocksInfo':
                    if (false) {
                        http_response_code(400);
                        echo json_encode($authManager->responseArr([
                            'success' => false,
                            'message' => $trad->lang('400.missingRequiredParameters'),
                            'error'   => 'Missing parameter: project_uid'
                        ]));
                        break;
                    }

                    $stockPrice = new StockPriceProvider($authManager);

                    $info = $stockPrice->get_stocksInfo();
                    if ($info) {
                        http_response_code(200);
                        echo json_encode($authManager->responseArr([
                            'success' => true,
                            'message' => $trad->lang('200.successRetrieveData'),
                            'data'    => ['info' => $info]
                        ]));
                    } else {
                        http_response_code(400);
                        echo json_encode($authManager->responseArr([
                            'success' => false,
                            'message' => $trad->lang('400.errorRetrieveData'),
                            'error'   => 'Empty info'
                        ]));
                    }
                    break;

                default:
                    $defaultOption = true;
                    break;
            }
            break;

        case 'PUT':
            switch ($requestData['opt']) {
                case 'project_info':
                    // Verifica parametri obbligatori
                    $missing = array_diff(
                        array_merge(['project_uid'], $requiredFields),
                        array_keys($requestData)
                    );
                    if ($missing) {
                        http_response_code(400);
                        echo json_encode($authManager->responseArr([
                            'success' => false,
                            'message' => $trad->lang('400.missingRequiredParameters'),
                            'error'   => 'Missing: ' . json_encode(array_values($missing))
                        ]));
                        break;
                    }
                    // Raccogli dati
                    $newData = [];
                    foreach ($allFields as $f) {
                        if ($f === 'project_uid') continue;
                        $newData[$f] = $requestData[$f] ?? null;
                    }
                    $obj = new projectObj($authManager, $permsManager, $requestData['project_uid']);
                    $res = $obj->set_projectInfo($newData);

                    http_response_code($res['success'] ? 200 : 400);
                    echo json_encode($authManager->responseArr(array_merge(
                        ['success' => $res['success'], 'message' => $trad->lang($res['message'])],
                        $res['success']
                            ? ['data' => ['project_info' => $obj->get_projectInfo()]]
                            : ['error' => $res['error']]
                    )));
                    break;

                default:
                    $defaultOption = true;
                    break;
            }
            break;

        case 'POST':
            switch ($requestData['opt']) {
                case 'project_info':
                    $missing = array_diff($requiredFields, array_keys($requestData));
                    if ($missing) {
                        http_response_code(400);
                        echo json_encode($authManager->responseArr([
                            'success' => false,
                            'message' => $trad->lang('400.missingRequiredParameters'),
                            'error'   => 'Missing: ' . json_encode(array_values($missing))
                        ]));
                        break;
                    }
                    $newData = [];
                    foreach ($allFields as $f) {
                        if ($f === 'project_uid') continue;
                        if (isset($requestData[$f])) {
                            $newData[$f] = $requestData[$f];
                        }
                    }
                    $obj = new projectObj($authManager, $permsManager, null);
                    $res = $obj->insert_projectInfo($newData);

                    http_response_code($res['success'] ? 201 : 400);
                    echo json_encode($authManager->responseArr(array_merge(
                        ['success' => $res['success'], 'message' => $trad->lang($res['message'])],
                        $res['success']
                            ? ['data' => ['project_info' => $obj->get_projectInfo()]]
                            : ['error' => $res['error']]
                    )));
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
                'message' => $trad->lang('405.methodNotAllowed'),
                'error'   => 'Method "' . $method . '" not allowed'
            ]);
    }

    if ($defaultOption) {
        http_response_code(400);
        echo json_encode($authManager->responseArr([
            'success' => false,
            'message' => $trad->lang('400.invalidOption'),
            'error'   => 'Option: ' . $method . ' - "' . $requestData['opt'] . '" invalid'
        ]));
    }
} catch (ApiException $e) {
    $status = $e->getHttpStatus() ?: 400;
    http_response_code($status);
    echo json_encode($authManager->responseArr([
        'success' => false,
        'message' => $e->getMessage(),
        'error'   => $e->getCode()
    ]));
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode($authManager->responseArr([
        'success' => false,
        'message' => 'Internal Server FatalError',
        'error'   => $e->getMessage()
    ]));
}
ob_end_flush();
