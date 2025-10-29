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

require_once __DIR__ . "/../obj/projectObj.php";

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
            'message' => $trad->lang('project.400.optionNotSet'),
            'error'   => 'Option not set.'
        ]));
        exit;
    }

    // setup fields from obj
    $projectBase    = new projectObjBase($authManager, $permsManager);
    $allFields      = $projectBase->get_allFields();
    $requiredFields = $projectBase->get_requiredFields();
    // end setup

    $defaultOption = false;
    switch ($method) {
        case 'GET':
            switch ($requestData['opt']) {
                case 'project_info':
                    if (empty($requestData['project_uid'])) {
                        http_response_code(400);
                        echo json_encode($authManager->responseArr([
                            'success' => false,
                            'message' => $trad->lang('project.400.missingRequiredParameters'),
                            'error'   => 'Missing parameter: project_uid'
                        ]));
                        break;
                    }

                    $obj  = new projectObj($authManager, $permsManager, $requestData['project_uid']);
                    $info = $obj->get_projectInfo();
                    if ($info) {
                        http_response_code(200);
                        echo json_encode($authManager->responseArr([
                            'success' => true,
                            'message' => $trad->lang('project.200.successRetrieveData'),
                            'data'    => ['project_info' => $info]
                        ]));
                    } else {
                        http_response_code(400);
                        echo json_encode($authManager->responseArr([
                            'success' => false,
                            'message' => $trad->lang('project.400.errorRetrieveData'),
                            'error'   => 'Empty project_info'
                        ]));
                    }
                    break;

                case 'projects_list':
                    $listObj = new projectObjList($authManager, $permsManager);
                    $result  = $listObj->get_projectsList(
                        [
                            'search'      => $_GET['search']       ?? '',
                            'customer_uid' => $_GET['customer_uid'] ?? ''
                        ],
                        (int)($_GET['page']     ?? 1),
                        (int)($_GET['per_page'] ?? 20)
                    );
                    http_response_code(200);
                    echo json_encode($authManager->responseArr([
                        'success' => true,
                        'message' => $trad->lang('project.200.successRetrieveData'),
                        'data'    => $result
                    ]));
                    break;

                case 'request_info':
                    if (empty($requestData['project_uid'])) {
                        http_response_code(400);
                        echo json_encode($authManager->responseArr([
                            'success' => false,
                            'message' => $trad->lang('project.400.missingRequiredParameters'),
                            'error'   => 'Missing parameter: project_uid'
                        ]));
                        break;
                    }
                    $reqObj  = new projectRequestObj(
                        $authManager,
                        $permsManager,
                        $requestData['project_uid']
                    );
                    $info = $reqObj->get_requestInfo();
                    http_response_code(200);
                    echo json_encode($authManager->responseArr([
                        'success' => true,
                        'message' => $trad->lang('project.200.successRetrieveData'),
                        'data'    => ['request_info' => $info]
                    ]));
                    break;

                case 'requests_list':
                    $listObj = new projectRequestObjList($authManager, $permsManager);
                    $result  = $listObj->get_requestsList(
                        [
                            'search'       => $_GET['search']       ?? '',
                            'customer_uid' => $_GET['customer_uid'] ?? ''
                        ],
                        (int)($_GET['page']     ?? 1),
                        (int)($_GET['per_page'] ?? 20)
                    );
                    http_response_code(200);
                    echo json_encode($authManager->responseArr([
                        'success' => true,
                        'message' => $trad->lang('project.200.successRetrieveData'),
                        'data'    => $result
                    ]));
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
                            'message' => $trad->lang('project.400.missingRequiredParameters'),
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

                case 'request_info':
                    // verifica parametri obbligatori
                    $missing = array_diff(
                        array_merge(['project_uid'], $requiredFields),
                        array_keys($requestData)
                    );
                    if ($missing) {
                        http_response_code(400);
                        echo json_encode($authManager->responseArr([
                            'success' => false,
                            'message' => $trad->lang('project.400.missingRequiredParameters'),
                            'error'   => 'Missing: ' . json_encode(array_values($missing))
                        ]));
                        break;
                    }
                    // raccogli i nuovi dati
                    $newData = [];
                    foreach ($allFields as $f) {
                        if ($f === 'project_uid') continue;
                        $newData[$f] = $requestData[$f] ?? null;
                    }
                    $reqObj = new projectRequestObj(
                        $authManager,
                        $permsManager,
                        $requestData['project_uid']
                    );
                    $res = $reqObj->set_requestInfo($newData);

                    http_response_code($res['success'] ? 200 : 400);
                    echo json_encode($authManager->responseArr(array_merge(
                        ['success' => $res['success'], 'message' => $trad->lang($res['message'])],
                        $res['success']
                            ? ['data' => ['request_info' => $reqObj->get_requestInfo()]]
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
                            'message' => $trad->lang('project.400.missingRequiredParameters'),
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

                case 'request_info':
                    $missing = array_diff($requiredFields, array_keys($requestData));
                    if ($missing) {
                        http_response_code(400);
                        echo json_encode($authManager->responseArr([
                            'success' => false,
                            'message' => $trad->lang('project.400.missingRequiredParameters'),
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
                    $reqObj = new projectRequestObj($authManager, $permsManager, null);
                    $res    = $reqObj->insert_requestInfo($newData);

                    http_response_code($res['success'] ? 201 : 400);
                    echo json_encode($authManager->responseArr(array_merge(
                        ['success' => $res['success'], 'message' => $trad->lang($res['message'])],
                        $res['success']
                            ? ['data' => ['request_info' => $reqObj->get_requestInfo()]]
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
                'message' => $trad->lang('project.405.methodNotAllowed'),
                'error'   => 'Method "' . $method . '" not allowed'
            ]);
    }

    if ($defaultOption) {
        http_response_code(400);
        echo json_encode($authManager->responseArr([
            'success' => false,
            'message' => $trad->lang('project.400.invalidOption'),
            'error'   => 'Option: ' . $method . ' - "' . $requestData['opt'] . '" invalid'
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
