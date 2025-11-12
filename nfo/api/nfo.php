<?php
// CORS and security headers
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("X-Content-Type-Options: nosniff");
header("X-Frame-Options: DENY");

// Preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

ob_start();

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

header("Content-Type: application/json");
http_response_code(500); // Default HTTP response

$srcPath = $_SERVER['DOCUMENT_ROOT'] ?: '/var/www/html';
require_once "$srcPath/auth/inclusions.php";
require_once "$srcPath/general_inclusions.php";

// >>> NFO objects
require_once __DIR__ . "/../obj/nfoObj.php";

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
    $trad         = new langClass($authManager);
    $reqResp      = new RequestResponse($authManager);

    $method = $_SERVER['REQUEST_METHOD'];
    $requestData = ($method === 'GET')
        ? $_GET
        : (json_decode(file_get_contents('php://input'), true) ?: []);

    if (empty($requestData['opt'])) {
        http_response_code(400);
        echo json_encode($reqResp->toArray(
            success: false,
            message: $trad->lang('nfo.400.optionNotSet'),
            error: 'Option not set.'
        ));
        exit;
    }

    // setup fields from obj
    $nfoBase    = new nfoObjBase($authManager, $permsManager);
    $infoFields = nfoObjBase::get_infoFields(); // campi ammessi in nfo_info
    // end setup

    $defaultOption = false;

    switch ($method) {
        case 'GET':
            switch ($requestData['opt']) {
                case 'nfo_info':
                    if (empty($requestData['nfo_uid'])) {
                        http_response_code(400);
                        echo json_encode($reqResp->toArray(
                            success: false,
                            message: $trad->lang('nfo.400.missingRequiredParameters'),
                            error: 'Missing parameter: nfo_uid'
                        ));
                        break;
                    }

                    $obj  = new nfoObj($authManager, $permsManager, $requestData['nfo_uid']);
                    $info = $obj->get_nfoData();

                    http_response_code(!empty($info['nfo_uid']) ? 200 : 404);
                    echo json_encode($reqResp->toArray(
                        success: !empty($info['nfo_uid']),
                        message: !empty($info['nfo_uid'])
                            ? $trad->lang('nfo.200.successRetrieveData')
                            : $trad->lang('nfo.404.notFound'),
                        error: !empty($info['nfo_uid']) ? null : 'NFO not found',
                        data: !empty($info['nfo_uid']) ? ['nfo_info' => $info] : null
                    ));
                    break;

                // LISTE REPORT
                case 'nfo_reports_list':
                    // lista completa (extractAll = true)
                    $listObj = new nfoObjList($authManager, $permsManager);
                    $result  = $listObj->get_nfoList(
                        [
                            'search'         => $requestData['search']        ?? '',
                            'type'           => 'report',
                            'managed_uid'    => $requestData['managed_uid']   ?? '',
                            'status'         => $requestData['status']        ?? '',
                            'month_num'      => $requestData['month_num']     ?? '',
                            'year'           => $requestData['year']          ?? '',
                            'scheduled_from' => $requestData['scheduled_from'] ?? '',
                            'scheduled_to'   => $requestData['scheduled_to']  ?? '',
                            'valid_only'     => filter_var($requestData['valid_only'] ?? true, FILTER_VALIDATE_BOOLEAN),
                        ],
                        true
                    );
                    http_response_code($result['success'] ? 200 : 400);
                    echo json_encode($reqResp->toArray(
                        success: $result['success'],
                        message: $trad->lang($result['message']),
                        error: $result['error'] ?? null,
                        data: $result['data']  ?? null
                    ));
                    break;

                case 'nfo_reports_list_paginated':
                    $listObj = new nfoObjList($authManager, $permsManager);
                    $result  = $listObj->get_nfoList(
                        [
                            'search'         => $requestData['search']        ?? '',
                            'type'           => 'report',
                            'managed_uid'    => $requestData['managed_uid']   ?? '',
                            'status'         => $requestData['status']        ?? '',
                            'month_num'      => $requestData['month_num']     ?? '',
                            'year'           => $requestData['year']          ?? '',
                            'scheduled_from' => $requestData['scheduled_from'] ?? '',
                            'scheduled_to'   => $requestData['scheduled_to']  ?? '',
                            'valid_only'     => filter_var($requestData['valid_only'] ?? true, FILTER_VALIDATE_BOOLEAN),
                        ],
                        false,
                        (int)($requestData['page']     ?? 1),
                        (int)($requestData['per_page'] ?? 25)
                    );
                    http_response_code($result['success'] ? 200 : 400);
                    echo json_encode($reqResp->toArray(
                        success: $result['success'],
                        message: $trad->lang($result['message']),
                        error: $result['error'] ?? null,
                        data: $result['data']  ?? null
                    ));
                    break;

                // LISTE ALERT
                case 'nfo_alerts_list':
                    $listObj = new nfoObjList($authManager, $permsManager);
                    $result  = $listObj->get_nfoList(
                        [
                            'search'         => $requestData['search']        ?? '',
                            'type'           => 'alert',
                            'managed_uid'    => $requestData['managed_uid']   ?? '',
                            'status'         => $requestData['status']        ?? '',
                            'month_num'      => $requestData['month_num']     ?? '',
                            'year'           => $requestData['year']          ?? '',
                            'scheduled_from' => $requestData['scheduled_from'] ?? '',
                            'scheduled_to'   => $requestData['scheduled_to']  ?? '',
                            'valid_only'     => filter_var($requestData['valid_only'] ?? true, FILTER_VALIDATE_BOOLEAN),
                        ],
                        true
                    );
                    http_response_code($result['success'] ? 200 : 400);
                    echo json_encode($reqResp->toArray(
                        success: $result['success'],
                        message: $trad->lang($result['message']),
                        error: $result['error'] ?? null,
                        data: $result['data']  ?? null
                    ));
                    break;

                case 'nfo_alerts_list_paginated':
                    $listObj = new nfoObjList($authManager, $permsManager);
                    $result  = $listObj->get_nfoList(
                        [
                            'search'         => $requestData['search']        ?? '',
                            'type'           => 'alert',
                            'managed_uid'    => $requestData['managed_uid']   ?? '',
                            'status'         => $requestData['status']        ?? '',
                            'month_num'      => $requestData['month_num']     ?? '',
                            'year'           => $requestData['year']          ?? '',
                            'scheduled_from' => $requestData['scheduled_from'] ?? '',
                            'scheduled_to'   => $requestData['scheduled_to']  ?? '',
                            'valid_only'     => filter_var($requestData['valid_only'] ?? true, FILTER_VALIDATE_BOOLEAN),
                        ],
                        false,
                        (int)($requestData['page']     ?? 1),
                        (int)($requestData['per_page'] ?? 25)
                    );
                    http_response_code($result['success'] ? 200 : 400);
                    echo json_encode($reqResp->toArray(
                        success: $result['success'],
                        message: $trad->lang($result['message']),
                        error: $result['error'] ?? null,
                        data: $result['data']  ?? null
                    ));
                    break;

                // NFO VALIDI
                case 'nfo_lastValidReport':
                    if (empty($requestData['managed_uid'])) {
                        http_response_code(400);
                        echo json_encode($reqResp->toArray(
                            success: false,
                            message: $trad->lang('nfo.400.missingRequiredParameters'),
                            error: 'Missing parameter: managed_uid'
                        ));
                        break;
                    }

                    $listObj = new nfoObjList($authManager, $permsManager);
                    $res     = $listObj->get_lastValidReport($requestData['managed_uid']);

                    http_response_code($res['success'] ? 200 : 404);
                    echo json_encode($reqResp->toArray(
                        success: $res['success'],
                        message: $trad->lang($res['message']),
                        error: $res['error'] ?? null,
                        data: $res['data'] ?? null
                    ));
                    break;

                case 'nfo_validAlerts':
                    if (empty($requestData['managed_uid'])) {
                        http_response_code(400);
                        echo json_encode($reqResp->toArray(
                            success: false,
                            message: $trad->lang('nfo.400.missingRequiredParameters'),
                            error: 'Missing parameter: managed_uid'
                        ));
                        break;
                    }
                    $listObj = new nfoObjList($authManager, $permsManager);
                    $res     = $listObj->get_allValidAlerts($requestData['managed_uid'], true);

                    http_response_code($res['success'] ? 200 : 400);
                    echo json_encode($reqResp->toArray(
                        success: $res['success'],
                        message: $trad->lang($res['message']),
                        error: $res['error'] ?? null,
                        data: [
                            'items' => $res['data'] ?? [],
                            'meta'  => $res['meta'] ?? null
                        ]
                    ));
                    break;

                default:
                    $defaultOption = true;
                    break;
            }
            break;

        case 'PUT':
            switch ($requestData['opt']) {
                case 'nfo_data':
                    // Upsert parziale info generali (no cambio type/managed)
                    if (empty($requestData['nfo_uid'])) {
                        http_response_code(400);
                        echo json_encode($reqResp->toArray(
                            success: false,
                            message: $trad->lang('nfo.400.missingRequiredParameters'),
                            error: 'Missing: "nfo_uid"'
                        ));
                        break;
                    }

                    // Prepara subset dai soli campi ammessi
                    $newInfo = [];
                    foreach ($infoFields as $f) {
                        if (array_key_exists($f, $requestData)) {
                            $newInfo[$f] = $requestData[$f];
                        }
                    }

                    // Upsert asset
                    if (empty($requestData['assets'])) {
                        http_response_code(400);
                        echo json_encode($reqResp->toArray(
                            success: false,
                            message: $trad->lang('nfo.400.missingRequiredParameters'),
                            error: 'Missing: assets'
                        ));
                        break;
                    }
                    $replace = filter_var($requestData['replace'] ?? true, FILTER_VALIDATE_BOOLEAN);

                    $newData = $newInfo;
                    $newData['assets'] = $requestData['assets'];

                    $obj = new nfoObj($authManager, $permsManager, $requestData['nfo_uid']);
                    $res = $obj->update_data($newData, $replace);

                    http_response_code($res['success'] ? 200 : 400);
                    echo json_encode($reqResp->toArray(
                        success: $res['success'],
                        message: $trad->lang($res['message']),
                        error: $res['error'] ?? null,
                        data: ['nfo_info' => $obj->get_nfoData()]
                    ));
                    break;

                case 'nfo_info':
                    // Upsert parziale info generali (no cambio type/managed)
                    if (empty($requestData['nfo_uid'])) {
                        http_response_code(400);
                        echo json_encode($reqResp->toArray(
                            success: false,
                            message: $trad->lang('nfo.400.missingRequiredParameters'),
                            error: 'Missing: "nfo_uid"'
                        ));
                        break;
                    }

                    // Prepara subset dai soli campi ammessi
                    $newData = [];
                    foreach ($infoFields as $f) {
                        if (array_key_exists($f, $requestData)) {
                            $newData[$f] = $requestData[$f];
                        }
                    }

                    $obj = new nfoObj($authManager, $permsManager, $requestData['nfo_uid']);
                    $res = $obj->update_info($newData);

                    http_response_code($res['success'] ? 200 : 400);
                    echo json_encode($reqResp->toArray(
                        success: $res['success'],
                        message: $trad->lang($res['message']),
                        error: $res['error'] ?? null,
                        data: ['nfo_info' => $obj->get_nfoData()]
                    ));
                    break;

                case 'nfo_assets':
                    if (empty($requestData['nfo_uid']) || empty($requestData['assets'])) {
                        $missingKeys = [];
                        if (empty($requestData['nfo_uid'])) {
                            $missingKeys[] = 'nfo_uid';
                        }
                        if (empty($requestData['assets'])) {
                            $missingKeys[] = 'assets';
                        }
                        http_response_code(400);
                        echo json_encode($reqResp->toArray(
                            success: false,
                            message: $trad->lang('nfo.400.missingRequiredParameters'),
                            error: 'Missing: ' . implode(',', $missingKeys)
                        ));
                        break;
                    }
                    $replace = filter_var($requestData['replace'] ?? true, FILTER_VALIDATE_BOOLEAN);

                    $obj = new nfoObj($authManager, $permsManager, $requestData['nfo_uid']);
                    $res = $obj->update_assets($requestData['assets'], $replace);

                    http_response_code($res['success'] ? 200 : 400);
                    echo json_encode($reqResp->toArray(
                        success: $res['success'],
                        message: $trad->lang($res['message']),
                        error: $res['error'] ?? null,
                        data: ['nfo_info' => $obj->get_nfoData()]
                    ));
                    break;

                case 'set_isDraft':
                    if (empty($requestData['nfo_uid']) || !isset($requestData['isDraft'])) {
                        http_response_code(400);
                        echo json_encode($reqResp->toArray(
                            success: false,
                            message: $trad->lang('nfo.400.missingRequiredParameters'),
                            error: 'Missing: "nfo_uid" or "isDraft"'
                        ));
                        break;
                    }
                    $obj = new nfoObj($authManager, $permsManager, $requestData['nfo_uid']);
                    $res = $obj->set_draft(filter_var($requestData['isDraft'], FILTER_VALIDATE_BOOLEAN));

                    http_response_code($res['success'] ? 200 : 400);
                    echo json_encode($reqResp->toArray(
                        success: $res['success'],
                        message: $trad->lang($res['message']),
                        error: $res['error'] ?? null,
                        data: $res['data'] ?? null
                    ));
                    break;

                default:
                    $defaultOption = true;
                    break;
            }
            break;

        case 'POST':
            switch ($requestData['opt']) {
                case 'nfo_create':
                    // payload libero: create_nfo valida differenze report/alert
                    $obj = new nfoObj($authManager, $permsManager, null);
                    $res = $obj->create_nfo($requestData);

                    http_response_code($res['success'] ? 201 : 400);
                    echo json_encode($reqResp->toArray(
                        success: $res['success'],
                        message: $trad->lang($res['message']),
                        data: $res['data']  ?? null,
                        error: $res['error'] ?? null
                    ));
                    break;

                default:
                    $defaultOption = true;
                    break;
            }
            break;

        default:
            http_response_code(405);
            echo json_encode($reqResp->toArray(
                success: false,
                message: $trad->lang('nfo.405.methodNotAllowed'),
                error: 'Method "' . $method . '" not allowed'
            ));
    }

        if ($defaultOption) {
        http_response_code(400);
        echo json_encode($reqResp->toArray(
            success: false,
            message: $trad->lang('nfo.400.invalidOption'),
            error: 'Option: ' . $method . ' - "' . $requestData['opt'] . '" invalid'
        ));
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
