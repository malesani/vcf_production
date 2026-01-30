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

// Objects
require_once __DIR__ . "/../obj/backtestingObj.php"; // contiene backtestingObjBase/backtestingObj/backtestingObjList

require_once __DIR__ . "/../../DataProviders/obj/TwelveDataClient.php";

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
    $trad    = new langClass($authManager);
    $reqResp = new RequestResponse($authManager);

    $method = $_SERVER['REQUEST_METHOD'];
    $requestData = ($method === 'GET')
        ? $_GET
        : (json_decode(file_get_contents('php://input'), true) ?: []);

    if (empty($requestData['opt'])) {
        http_response_code(400);
        echo json_encode($reqResp->toArray(
            success: false,
            message: $trad->lang('backtesting.400.optionNotSet'),
            error: 'Option not set.'
        ));
        exit;
    }

    // setup fields from obj
    $btBase        = new backtestingObjBase($authManager, $permsManager);
    $allFields     = $btBase->get_allFields();            // ALL_FIELDS_INFO
    $mutableFields = $btBase->get_mutableFields();        // MUTABLE_FIELDS_INFO
    $requiredIns   = $btBase->get_requiredFieldsInsert(); // REQUIRED_CREATE
    // end setup

    $defaultOption = false;

    switch ($method) {
        case 'GET':
            switch ($requestData['opt']) {
                case 'backtesting_data':
                    if (empty($requestData['backtesting_uid'])) {
                        http_response_code(400);
                        echo json_encode($reqResp->toArray(
                            success: false,
                            message: $trad->lang('backtesting.400.missingRequiredParameters'),
                            error: 'Missing parameter: backtesting_uid'
                        ));
                        break;
                    }

                    try {
                        $obj  = new backtestingObj($authManager, $permsManager, $requestData['backtesting_uid']);
                        $info = $obj->get_backtestingData();
                        http_response_code(200);
                        echo json_encode($reqResp->toArray(
                            success: true,
                            message: $trad->lang('backtesting.200.infoFetched'),
                            error: null,
                            data: $info
                        ));
                    } catch (Throwable $e) {
                        http_response_code(404);
                        echo json_encode($reqResp->toArray(
                            success: false,
                            message: $trad->lang('backtesting.404.notFound'),
                            error: $e->getMessage()
                        ));
                    }
                    break;

                case 'backtestings_list':
                    $listObj = new backtestingObjList($authManager, $permsManager);
                    $filters = [
                        'search'         => $_GET['search']         ?? '',
                        'created_from'   => $_GET['created_from']   ?? '',
                        'created_to'     => $_GET['created_to']     ?? '',
                        'updated_from'   => $_GET['updated_from']   ?? '',
                        'updated_to'     => $_GET['updated_to']     ?? '',
                        'include_assets' => isset($_GET['include_assets']) ? (int)$_GET['include_assets'] : 1,
                        'include_deleted' => isset($_GET['include_deleted']) ? (int)$_GET['include_deleted'] : 0,
                    ];

                    $res = $listObj->get_backtestingsList($filters, true);

                    http_response_code(($res['success'] ?? false) ? 200 : 400);
                    echo json_encode($reqResp->toArray(
                        success: $res['success'] ?? false,
                        message: $trad->lang($res['message'] ?? 'backtesting.list.200.success'),
                        error: $res['error'] ?? null,
                        data: $res['data'] ?? null
                    ));
                    break;

                case 'backtestings_list_paginated':
                    $listObj = new backtestingObjList($authManager, $permsManager);
                    $filters = [
                        'search'         => $_GET['search']         ?? '',
                        'created_from'   => $_GET['created_from']   ?? '',
                        'created_to'     => $_GET['created_to']     ?? '',
                        'updated_from'   => $_GET['updated_from']   ?? '',
                        'updated_to'     => $_GET['updated_to']     ?? '',
                        'include_assets' => isset($_GET['include_assets']) ? (int)$_GET['include_assets'] : 1,
                        'include_deleted' => isset($_GET['include_deleted']) ? (int)$_GET['include_deleted'] : 0,
                    ];

                    $page    = (int)($_GET['page']     ?? 1);
                    $perPage = (int)($_GET['per_page'] ?? 25);

                    $res = $listObj->get_backtestingsList($filters, false, $page, $perPage);

                    http_response_code(($res['success'] ?? false) ? 200 : 400);
                    echo json_encode($reqResp->toArray(
                        success: $res['success'] ?? false,
                        message: $trad->lang($res['message'] ?? 'backtesting.list.200.success'),
                        error: $res['error'] ?? null,
                        data: $res['data'] ?? null
                    ));
                    break;

                case 'run_backtesting':
                    if (empty($requestData['backtesting_uid'])) {
                        http_response_code(400);
                        echo json_encode($reqResp->toArray(
                            success: false,
                            message: $trad->lang('backtesting.400.missingRequiredParameters'),
                            error: 'Missing parameter: backtesting_uid'
                        ));
                        break;
                    }

                    // years override (opzionale)
                    $years = isset($_GET['years']) ? (int)$_GET['years'] : 0;

                    // interval (opzionale) -> default 1month
                    $interval = isset($_GET['interval']) ? trim((string)$_GET['interval']) : '1month';
                    if ($interval === '') $interval = '1month';

                    // whitelist (coerente con TwelveData)
                    $allowedIntervals = ['1day', '1week', '1month'];
                    if (!in_array($interval, $allowedIntervals, true)) {
                        http_response_code(400);
                        echo json_encode($reqResp->toArray(
                            success: false,
                            message: $trad->lang('backtesting.run.400.invalidInterval'),
                            error: "Invalid interval: {$interval}"
                        ));
                        break;
                    }

                    $td = new TwelveDataClient($authManager);

                    $obj = new backtestingObj($authManager, $permsManager, $requestData['backtesting_uid']);

                    // ✅ ordine corretto: (td, interval, years)
                    $res = $obj->run_backtesting_series(
                        $td,
                        $interval,
                        $years > 0 ? $years : 10
                    );

                    $status = 200;
                    if (!($res['success'] ?? false)) {
                        // default
                        $status = 400;

                        // mappa alcuni casi
                        $msg = $res['message'] ?? '';
                        if (str_starts_with($msg, 'backtesting.run.500.')) $status = 500;
                        if (in_array($msg, ['backtesting.run.500.invalidPrice', 'backtesting.run.500.noTimeseries', 'backtesting.run.500.noPrices'], true)) {
                            $status = 422;
                        }
                    }
                    http_response_code($status);
                    $debugStr = '';
                    if (!empty($res['debug'])) {
                        $debugStr = ' | debug=' . json_encode($res['debug'], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
                    }

                    echo json_encode($reqResp->toArray(
                        success: $res['success'] ?? false,
                        message: $trad->lang($res['message'] ?? 'backtesting.run.200.success'),
                        error: ($res['error'] ?? null) ? (($res['error'] ?? '') . $debugStr) : ($debugStr !== '' ? $debugStr : null),
                        data: $res['data'] ?? null
                    ));
                    break;


                case 'run_series_1month': {
                        $backtesting_uid = trim((string)($payload['backtesting_uid'] ?? ''));
                        if ($backtesting_uid === '') {
                            $out = ["success" => false, "message" => "backtesting.run.400.missingUID", "error" => "Missing backtesting_uid"];
                            break;
                        }

                        // TwelveDataClient come già lo usi nel progetto
                        $td = new TwelveDataClient($authManager);

                        $bt = new backtestingObj($authManager, $permsManager, $backtesting_uid);

                        // anni opzionali (se non lo passi usa quello del DB)
                        $years = isset($payload['years']) ? (int)$payload['years'] : 0;

                        $out = $bt->run_backtesting_series($td, $years > 0 ? $years : 10);
                        break;
                    }


                default:
                    $defaultOption = true;
                    break;
            }
            break;

        case 'POST':
            switch ($requestData['opt']) {
                case 'create_backtesting':
                    $missing = array_diff($requiredIns, array_keys($requestData));
                    if ($missing) {
                        http_response_code(400);
                        echo json_encode($reqResp->toArray(
                            success: false,
                            message: $trad->lang('backtesting.400.missingRequiredParameters'),
                            error: 'Missing: ' . json_encode(array_values($missing))
                        ));
                        break;
                    }

                    // prendi solo i campi previsti + assets (se presenti)
                    $newData = [];
                    foreach ($allFields as $f) {
                        if ($f === 'isDeleted' || $f === 'user_uid' || $f === 'updated_at' || $f === 'created_at') continue;
                        if (array_key_exists($f, $requestData)) {
                            $newData[$f] = $requestData[$f];
                        }
                    }
                    if (array_key_exists('assets', $requestData)) {
                        $newData['assets'] = $requestData['assets'];
                    }

                    $obj = new backtestingObj($authManager, $permsManager, null);
                    $res = $obj->create_backtesting($newData);

                    http_response_code(($res['success'] ?? false) ? 200 : 400);
                    echo json_encode($reqResp->toArray(
                        success: $res['success'] ?? false,
                        message: $trad->lang($res['message'] ?? 'backtesting.create.200.created'),
                        error: $res['error'] ?? null,
                        data: $res['data'] ?? null
                    ));
                    break;

                default:
                    $defaultOption = true;
                    break;
            }
            break;

        case 'PUT':
            switch ($requestData['opt']) {
                case 'update_backtesting':
                    if (empty($requestData['backtesting_uid'])) {
                        http_response_code(400);
                        echo json_encode($reqResp->toArray(
                            success: false,
                            message: $trad->lang('backtesting.400.missingRequiredParameters'),
                            error: 'Missing: ["backtesting_uid"]'
                        ));
                        break;
                    }

                    // costruisci newData SOLO con campi mutabili presenti
                    $newData = [];
                    foreach ($mutableFields as $f) {
                        if (array_key_exists($f, $requestData)) {
                            $newData[$f] = $requestData[$f];
                        }
                    }

                    $obj = new backtestingObj($authManager, $permsManager, $requestData['backtesting_uid']);
                    $res = $obj->update_backtestingInfo($newData);

                    http_response_code(($res['success'] ?? false) ? 200 : 400);
                    echo json_encode($reqResp->toArray(
                        success: $res['success'] ?? false,
                        message: $trad->lang($res['message'] ?? 'backtesting.update.200.updated'),
                        error: $res['error'] ?? null,
                        data: $res['data'] ?? null
                    ));
                    break;

                case 'update_backtesting_assets':
                    if (empty($requestData['backtesting_uid'])) {
                        http_response_code(400);
                        echo json_encode($reqResp->toArray(
                            success: false,
                            message: $trad->lang('backtesting.400.missingRequiredParameters'),
                            error: 'Missing: ["backtesting_uid"]'
                        ));
                        break;
                    }
                    if (!isset($requestData['assets']) || !is_array($requestData['assets'])) {
                        http_response_code(400);
                        echo json_encode($reqResp->toArray(
                            success: false,
                            message: $trad->lang('backtesting.assets.400.missingAssets'),
                            error: 'Missing or invalid: ["assets"]'
                        ));
                        break;
                    }

                    $obj = new backtestingObj($authManager, $permsManager, $requestData['backtesting_uid']);
                    $res = $obj->update_backtestingAssets([
                        'backtesting_uid' => $requestData['backtesting_uid'],
                        'assets' => $requestData['assets']
                    ]);

                    http_response_code(($res['success'] ?? false) ? 200 : 400);
                    echo json_encode($reqResp->toArray(
                        success: $res['success'] ?? false,
                        message: $trad->lang($res['message'] ?? 'backtesting.assets.200.updated'),
                        error: $res['error'] ?? null,
                        data: $res['data'] ?? null
                    ));
                    break;

                default:
                    $defaultOption = true;
                    break;
            }
            break;

        case 'DELETE':
            switch ($requestData['opt']) {
                case 'delete_backtesting':
                    // per DELETE spesso arriva via querystring, ma supportiamo anche body JSON
                    $uid = $requestData['backtesting_uid'] ?? ($_GET['backtesting_uid'] ?? null);
                    if (empty($uid)) {
                        http_response_code(400);
                        echo json_encode($reqResp->toArray(
                            success: false,
                            message: $trad->lang('backtesting.400.missingRequiredParameters'),
                            error: 'Missing parameter: backtesting_uid'
                        ));
                        break;
                    }

                    $obj = new backtestingObj($authManager, $permsManager, $uid);
                    $res = $obj->delete_backtesting($uid);

                    http_response_code(($res['success'] ?? false) ? 200 : 400);
                    echo json_encode($reqResp->toArray(
                        success: $res['success'] ?? false,
                        message: $trad->lang($res['message'] ?? 'backtesting.delete.200.deleted'),
                        error: $res['error'] ?? null,
                        data: $res['data'] ?? null
                    ));
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
                'message' => $trad->lang('backtesting.405.methodNotAllowed'),
                'error'   => 'Method "' . $method . '" not allowed'
            ]);
    }

    if ($defaultOption) {
        http_response_code(400);
        echo json_encode($reqResp->toArray(
            success: false,
            message: $trad->lang('backtesting.400.invalidOption'),
            error: 'Option: ' . $method . ' - "' . $requestData['opt'] . '" invalid'
        ));
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode($reqResp->toArray(
        success: false,
        message: 'Internal Server FatalError',
        error: $e->getMessage()
    ));
}

ob_end_flush();
