<?php
// CORS and security headers
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, PUT, OPTIONS");
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
require_once $srcPath . "/auth/inclusions.php";
require_once $srcPath . "/general_inclusions.php";


require_once "../obj/companyObj.php";

try {
    $authManager = new authManager();
    if (!$authManager->check_isProfileLoaded()) {
        http_response_code(401);
        echo json_encode(['success'=>false,'message'=>'Invalid or Expired session!','error'=>'Invalid or Expired session!']);
        exit;
    }

    $permsManager = new permsManager($authManager);
    $trad = new langClass($authManager);

    $method = $_SERVER['REQUEST_METHOD'];
    $requestData = ($method === 'GET') ? $_GET : (json_decode(file_get_contents('php://input'), true) ?: []);

    if (empty($requestData['opt'])) {
        http_response_code(400);
        echo json_encode($authManager->responseArr(['success'=>false,'message'=>$trad->lang('customer.400.optionNotSet'),'error'=>'Option not set.']));
        exit;
    }

    switch ($_SERVER['REQUEST_METHOD']) {
        case "GET":
            if ($requestData['opt'] === "company_info") {
                $companyObj = new companyObj($authManager, $permsManager);
                $company_info = $companyObj->get_companyInfo();

                if (!empty($company_info)) {
                    http_response_code(200);
                    echo json_encode($authManager->responseArr([
                        'success' => true,
                        'message' => $trad->lang('company.200.successRetriveData'),
                        'data'    => ['company_info' => $company_info],
                    ]));
                } else {
                    http_response_code(400);
                    echo json_encode($authManager->responseArr([
                        'success' => false,
                        'message' => $trad->lang('company.400.errorRetriveData'),
                        'error'   => 'Empty company_info'
                    ]));
                }
            } else {
                http_response_code(400);
                echo json_encode($authManager->responseArr([
                    'success' => false,
                    'message' => $trad->lang('company.400.invalidOption'),
                    'error'   => 'Option not set or invalid: ' . ($_GET['opt'] ?? 'none')
                ]));
            }
            break;

        case "PUT":
            if ($requestData['opt'] === "company_info") {
                $required = ['name','address','phone', 'fax', 'email','vat'];
                $missing = [];
                foreach ($required as $key) {
                    if (!array_key_exists($key, $requestData)) {
                        $missing[] = $key;
                    }
                }
                if (!empty($missing)) {
                    http_response_code(400);
                    echo json_encode($authManager->responseArr([
                        'success' => false,
                        'message' => $trad->lang('company.400.missingRequiredParameters'),
                        'error'   => 'Missing: ' . json_encode($missing),
                    ]));
                } else {
                    $newData = [
                        'name'    => $requestData['name'],
                        'address' => $requestData['address'],
                        'phone'   => $requestData['phone'],
                        'fax'     => $requestData['fax'],
                        'email'   => $requestData['email'],
                        'vat'     => $requestData['vat'],
                    ];
                    $companyObj = new companyObj($authManager, $permsManager);
                    $resp = $companyObj->set_companyInfo($newData);
                    $company_info = $companyObj->get_companyInfo();

                    if ($resp['success']) {
                        http_response_code(200);
                        echo json_encode($authManager->responseArr([
                            'success' => true,
                            'message' => $trad->lang($resp['message']),
                            'data'    => ['company_info' => $company_info],
                        ]));
                    } else {
                        http_response_code(400);
                        echo json_encode($authManager->responseArr([
                            'success' => false,
                            'message' => $trad->lang($resp['message']),
                            'error'   => $resp['error']
                        ]));
                    }
                }
            } else {
                http_response_code(400);
                echo json_encode($authManager->responseArr([
                    'success' => false,
                    'message' => $trad->lang('company.400.invalidOption'),
                    'error'   => 'Option not set or invalid: ' . ($requestData['opt'] ?? 'none')
                ]));
            }
            break;

        case "OPTIONS":
            // Preflight CORS request
            http_response_code(204);
            break;

        default:
            http_response_code(405);
            echo json_encode([
                'success' => false,
                'message' => $trad->lang('company.405.methodNotAllowed'),
                'error'   => 'Method not allowed: ' . $_SERVER['REQUEST_METHOD']
            ]);
            break;
    }


} catch (Exception $e) {
    http_response_code(500);
    echo json_encode($authManager->responseArr(['success'=>false,'message'=>'Internal Server FatalError','error'=>$e->getMessage()]));
}
ob_end_flush();
?>
