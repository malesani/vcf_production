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
require_once "$srcPath/general_inclusions.php";

require_once __DIR__ . "/../obj/customerTeamObj.php";

try {
    $authManager = new authManager();
    if (!$authManager->check_isProfileLoaded()) {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'message' => 'Invalid or expired session',
            'error'   => 'Invalid or expired session'
        ]);
        exit;
    }
    $permsManager = new permsManager($authManager);
    $trad = new langClass($authManager);

    $method = $_SERVER['REQUEST_METHOD'];
    $requestData = $method === 'GET'
        ? $_GET
        : (json_decode(file_get_contents('php://input'), true) ?: []);

    if (empty($requestData['opt'])) {
        http_response_code(400);
        echo json_encode($authManager->responseArr([
            'success' => false,
            'message' => $trad->lang('teamMember.400.optionNotSet'),
            'error'   => 'Option not set'
        ]));
        exit;
    }

    $defaultOption = false;
    switch ($method) {
        case 'GET':
            switch ($requestData['opt']) {
                // --------------------------------------------------------
                // Leggi un singolo team member
                // --------------------------------------------------------
                case 'team_member_info':
                    if (empty($requestData['customer_uid']) || empty($requestData['teamMember_uid'])) {
                        http_response_code(400);
                        echo json_encode($authManager->responseArr([
                            'success' => false,
                            'message' => $trad->lang('teamMember.400.missingRequiredParameters'),
                            'error'   => 'Missing customer_uid or teamMember_uid'
                        ]));
                        break;
                    }

                    $obj  = new custTeamMember(
                        $authManager,
                        $permsManager,
                        $requestData['customer_uid'],
                        $requestData['teamMember_uid']
                    );
                    $info = $obj->get_teamMemberInfo();
                    if ($info) {
                        http_response_code(200);
                        echo json_encode($authManager->responseArr([
                            'success' => true,
                            'message' => $trad->lang('teamMember.200.successRetrieveData'),
                            'data'    => ['team_member_info' => $info]
                        ]));
                    } else {
                        http_response_code(404);
                        echo json_encode($authManager->responseArr([
                            'success' => false,
                            'message' => $trad->lang('teamMember.400.errorRetrieveData'),
                            'error'   => 'Empty team_member_info'
                        ]));
                    }
                    break;

                // --------------------------------------------------------
                // Lista paginata di team members
                // --------------------------------------------------------
                case 'team_members_list':
                    if (empty($requestData['customer_uid'])) {
                        http_response_code(400);
                        echo json_encode($authManager->responseArr([
                            'success' => false,
                            'message' => $trad->lang('teamMember.400.missingRequiredParameters'),
                            'error'   => 'Missing customer_uid'
                        ]));
                        break;
                    }

                    $listObj = new custTeamMembersList(
                        $authManager,
                        $permsManager,
                        $requestData['customer_uid']
                    );
                    $result = $listObj->get_customersList(
                        ['search' => $requestData['search']   ?? ''],
                        (int)($requestData['page']     ?? 1),
                        (int)($requestData['per_page'] ?? 20)
                    );

                    http_response_code(200);
                    echo json_encode($authManager->responseArr([
                        'success' => true,
                        'message' => $trad->lang('teamMember.200.successRetrieveData'),
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
                // --------------------------------------------------------
                // Aggiorna un team member esistente
                // --------------------------------------------------------
                case 'team_member_info':
                    // controlla params
                    if (empty($requestData['customer_uid']) || empty($requestData['teamMember_uid'])) {
                        http_response_code(400);
                        echo json_encode($authManager->responseArr([
                            'success' => false,
                            'message' => $trad->lang('teamMember.400.missingRequiredParameters'),
                            'error'   => 'Missing customer_uid or teamMember_uid'
                        ]));
                        break;
                    }
                    // prendi campi e required dal base
                    $base           = new custTeamMemberBase($authManager, $permsManager, $requestData['customer_uid']);
                    $allFields      = $base->get_allFields();
                    $requiredFields = $base->get_requiredFields();

                    // verifica required
                    $missing = array_diff(
                        array_merge(['customer_uid','teamMember_uid'], $requiredFields),
                        array_keys($requestData)
                    );
                    if (!empty($missing)) {
                        http_response_code(400);
                        echo json_encode($authManager->responseArr([
                            'success' => false,
                            'message' => $trad->lang('teamMember.400.missingRequiredParameters'),
                            'error'   => 'Missing: '. json_encode(array_values($missing))
                        ]));
                        break;
                    }

                    // costruisci newData (escludi chiavi non aggiornabili)
                    $newData = [];
                    foreach ($allFields as $f) {
                        if (in_array($f, ['customer_uid','teamMember_uid'], true)) {
                            continue;
                        }
                        $newData[$f] = $requestData[$f] ?? null;
                    }

                    // esegui update
                    $obj = new custTeamMember(
                        $authManager,
                        $permsManager,
                        $requestData['customer_uid'],
                        $requestData['teamMember_uid']
                    );
                    $res = $obj->set_teamMemberInfo($newData);

                    http_response_code($res['success'] ? 200 : 400);
                    echo json_encode($authManager->responseArr(array_merge(
                        ['success' => $res['success'], 'message' => $trad->lang($res['message'])],
                        $res['success']
                            ? ['data' => ['team_member_info' => $obj->get_teamMemberInfo()]]
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
                // --------------------------------------------------------
                // Crea un nuovo team member
                // --------------------------------------------------------
                case 'team_member_info':
                    if (empty($requestData['customer_uid'])) {
                        http_response_code(400);
                        echo json_encode($authManager->responseArr([
                            'success' => false,
                            'message' => $trad->lang('teamMember.400.missingRequiredParameters'),
                            'error'   => 'Missing customer_uid'
                        ]));
                        break;
                    }
                    $base           = new custTeamMemberBase($authManager, $permsManager, $requestData['customer_uid']);
                    $requiredFields = $base->get_requiredFields();

                    // verifica required
                    $missing = array_diff($requiredFields, array_keys($requestData));
                    if (!empty($missing)) {
                        http_response_code(400);
                        echo json_encode($authManager->responseArr([
                            'success' => false,
                            'message' => $trad->lang('teamMember.400.missingRequiredParameters'),
                            'error'   => 'Missing: '. json_encode(array_values($missing))
                        ]));
                        break;
                    }

                    // costruisci validData (escludi customer_uid)
                    $allFields = $base->get_allFields();
                    $newData   = [];
                    foreach ($allFields as $f) {
                        if ($f === 'customer_uid') continue;
                        if (isset($requestData[$f])) {
                            $newData[$f] = $requestData[$f];
                        }
                    }

                    // esegui insert
                    $obj = new custTeamMember(
                        $authManager,
                        $permsManager,
                        $requestData['customer_uid'],
                        null
                    );
                    $res = $obj->insert_teamMemberInfo($newData);

                    http_response_code($res['success'] ? 201 : 400);
                    echo json_encode($authManager->responseArr(array_merge(
                        ['success' => $res['success'], 'message' => $trad->lang($res['message'])],
                        $res['success']
                            ? ['data' => ['team_member_info' => $obj->get_teamMemberInfo()]]
                            : ['error' => $res['error']]
                    )));
                    break;

                // --------------------------------------------------------
                // Crea un token di invito
                // --------------------------------------------------------
                case 'invite_custTeamMember':
                    $requiredFields = [ 'customer_uid', 'teamMember_uid' ];

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

                    $custTeamMemberObj = new custTeamMember( $authManager, $permsManager, $requestData['customer_uid'], $requestData['teamMember_uid'] );

                    $response = $custTeamMemberObj->generate_invitation();

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

        case 'DELETE':
            switch ($requestData['opt']) {
                // --------------------------------------------------------
                // Elimina team member
                // --------------------------------------------------------
                case 'team_member':
                    $requiredFields = ['customer_uid', 'teamMember_uid'];

                    // verifica required
                    $missing = array_diff($requiredFields, array_keys($requestData));
                    if (!empty($missing)) {
                        http_response_code(400);
                        echo json_encode($authManager->responseArr([
                            'success' => false,
                            'message' => $trad->lang('teamMember.400.missingRequiredParameters'),
                            'error'   => 'Missing: '. json_encode(array_values($missing))
                        ]));
                        break;
                    }

                    // esegui insert
                    $custTeamMemberObj = new custTeamMember(
                        $authManager,
                        $permsManager,
                        $requestData['customer_uid'],
                        $requestData['teamMember_uid'],
                    );
                    $res = $custTeamMemberObj->delete_teamMemberInfo();


                    http_response_code($res['success'] ? 200 : 400);
                    echo json_encode($authManager->responseArr(array_merge(
                        [
                            'success' => $res['success'], 
                            'message' => $trad->lang($res['message'])
                        ],
                        $res['success'] ? [] : ['error' => $res['error']]
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
                'message' => $trad->lang('teamMember.405.methodNotAllowed'),
                'error'   => "Method \"$method\" not allowed"
            ]);
    }

    if ($defaultOption) {
        http_response_code(400);
        echo json_encode($authManager->responseArr([
            'success' => false,
            'message' => $trad->lang('teamMember.400.invalidOption'),
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
