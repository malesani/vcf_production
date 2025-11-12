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
http_response_code(500);        // Default HTTP response

$srcPath = $_SERVER['DOCUMENT_ROOT'] ?: '/var/www/html';
require_once "$srcPath/auth/inclusions.php";
require_once "$srcPath/general_inclusions.php";

require_once __DIR__ . "/../obj/customerB2BObj.php";


try {
    $authManager = new authManager();
    if (!$authManager->check_isProfileLoaded()) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Invalid or Expired session!', 'error' => 'Invalid or Expired session!']);
        exit;
    }

    $permsManager = new permsManager($authManager);
    $ReqResp = new RequestResponse($authManager);

    $method = $_SERVER['REQUEST_METHOD'];
    $requestData = ($method === 'GET') ? $_GET : (json_decode(file_get_contents('php://input'), true) ?: []);


    if (empty($requestData['opt'])) {
        http_response_code(400);
        echo json_encode($ReqResp->toArray(
            success: false,
            message: 'customer.400.optionNotSet',
            error: 'Option not set.'
        ));
        exit;
    }

    // SETUP FIELDS FROM OBJ
    $customerB2BObj = new CustomerB2BBase($authManager, $permsManager);
    $allFields = $customerB2BObj->get_allFields();
    $requiredFields = $customerB2BObj->get_requiredFields();
    // end

    $defaultOption = false;
    switch ($method) {
        case 'GET':
            switch ($requestData['opt']) {
                case 'customer_info':
                    if (empty($requestData['customer_uid'])) {
                        http_response_code(400);
                        echo json_encode($ReqResp->toArray(
                            success: false,
                            message: 'customer.400.missingRequiredParameters',
                            error: 'Missing parameter: customer_uid'
                        ));
                        break;
                    }

                    $obj = new CustomerB2B($authManager, $permsManager, $requestData['customer_uid']);
                    $info = $obj->get_customerInfo();

                    http_response_code($info ? 200 : 400);
                    echo json_encode($ReqResp->toArray(
                        success: $info ? true : false,
                        message: $info ? 'customer.200.successRetriveData' : 'customer.400.errorRetriveData',
                        error: 'Empty customer_info',
                        data: ['customer_info' => $info]
                    ));
                    break;

                case 'customers_list':
                    if (false) {
                        http_response_code(400);
                        echo json_encode($ReqResp->toArray(
                            success: false,
                            message: 'customer.400.missingRequiredParameters',
                            error: 'Missing parameter: ---'
                        ));
                        break;
                    }

                    $listObj = new CustomerB2BList($authManager, $permsManager);
                    $result = $listObj->get_customersList(
                        [
                            'search'   => $_GET['search']   ?? '',
                            'city'     => $_GET['city']     ?? '',
                            'province' => $_GET['province'] ?? ''
                        ],
                        (int)($_GET['page']     ?? 1),
                        (int)($_GET['per_page'] ?? 20)
                    );

                    http_response_code(200);
                    echo json_encode($ReqResp->toArray(
                        success: true,
                        message: 'teamMember.200.successRetrieveData',
                        data: $result
                    ));
                    break;

                default:
                    $defaultOption = true;
                    break;
            }
            break;

        case 'PUT':
            switch ($requestData['opt']) {
                case 'customer_info':
                    // customer_uid incluso tra $allFields
                    $missing = array_diff(array_merge(['customer_uid'], $requiredFields), array_keys($requestData));
                    if ($missing) {
                        http_response_code(400);
                        echo json_encode($ReqResp->toArray(
                            success: false,
                            message: 'customer.400.missingRequiredParameters',
                            error: 'Missing: ' . json_encode(array_values($missing))
                        ));
                        break;
                    }
                    // Raccogli dati, imposta opzionali a null
                    $newData = [];
                    foreach ($allFields as $f) {
                        if ($f === 'customer_uid') continue;
                        $newData[$f] = $requestData[$f] ?? null;
                    }
                    $obj = new CustomerB2B($authManager, $permsManager, $requestData['customer_uid']);
                    $res = $obj->set_customerInfo($newData);

                    http_response_code($res['success'] ? 200 : 400);
                    echo json_encode($ReqResp->toArray(
                        success: $res['success'],
                        message: $res['message'],
                        error: $res['error'],
                        data: ['customer_info' => $obj->get_customerInfo()]
                    ));
                    break;

                default:
                    $defaultOption = true;
                    break;
            }
            break;

        case 'POST':
            switch ($requestData['opt']) {
                case 'customer_info':
                    $missing = array_diff($requiredFields, array_keys($requestData));
                    if ($missing) {
                        http_response_code(400);
                        echo json_encode($ReqResp->toArray(
                            success: false,
                            message: 'customer.400.missingRequiredParameters',
                            error: 'Missing: ' . json_encode(array_values($missing))
                        ));
                        break;
                    }
                    $newData = [];
                    foreach ($allFields as $f) {
                        if ($f === 'customer_uid') continue;
                        if (isset($requestData[$f])) {
                            $newData[$f] = $requestData[$f];
                        }
                    }
                    $obj = new CustomerB2B($authManager, $permsManager, null);
                    $res = $obj->insert_customerInfo($newData);

                    http_response_code($res['success'] ? 201 : 400);
                    echo json_encode($ReqResp->toArray(
                        success: $res['success'],
                        message: $res['message'],
                        error: $res['error'],
                        data: ['customer_info' => $obj->get_customerInfo()]
                    ));
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
                message: 'customer.405.methodNotAllowed',
                error: 'Method "' . $method . '" not allowed',
            ));
    }

    if ($defaultOption) {
        http_response_code(400);
        echo json_encode($ReqResp->toArray(
            success: false,
            message: 'customer.400.invalidOption',
            error: 'Option: ' . $method . ' - "' . $requestData['opt'] . '" invalid',
        ));
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode($ReqResp->toArray(
        success: false,
        message: 'Internal Server FatalError',
        error: $e->getMessage(),
    ));
}
ob_end_flush();
