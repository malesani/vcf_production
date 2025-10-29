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
require_once __DIR__ . "/../obj/portfoliosObj.php"; // contiene portfolioObjBase/portfolioObj/portfolioObjList
// opzionale: se usi managedPortObjList
// require_once __DIR__ . "/../obj/managedPortfoliosObj.php";

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
            message: $trad->lang('portfolio.400.optionNotSet'),
            error: 'Option not set.'
        ));
        exit;
    }

    // setup fields from obj
    $portfolioBase = new portfolioObjBase($authManager, $permsManager);
    $allFields     = $portfolioBase->get_allFields();            // ALL_FIELDS_INFO
    $mutableFields = $portfolioBase->get_mutableFields();        // MUTABLE_FIELDS_INFO
    $requiredIns   = $portfolioBase->get_requiredFieldsInsert(); // REQUIRED_FIELDS_INSERT
    // end setup

    $defaultOption = false;

    switch ($method) {
        case 'GET':
            switch ($requestData['opt']) {
                case 'portfolio_info':
                    if (empty($requestData['portfolio_uid'])) {
                        http_response_code(400);
                        echo json_encode($reqResp->toArray(
                            success: false,
                            message: $trad->lang('portfolio.400.missingRequiredParameters'),
                            error: 'Missing parameter: portfolio_uid'
                        ));
                        break;
                    }

                    $obj  = new portfolioObj($authManager, $permsManager, $requestData['portfolio_uid']);
                    $res  = $obj->get_portfolioInfo();

                    http_response_code(($res['success'] ?? false) ? 200 : 400);
                    echo json_encode($reqResp->toArray(
                        success: $res['success'] ?? false,
                        message: $trad->lang($res['message'] ?? 'portfolio.400.errorRetrieveData'),
                        error: $res['error'] ?? null,
                        data: $res['data'] ?? null
                    ));
                    break;

                case 'asset_prices':
                    if (empty($requestData['portfolio_uid'])) {
                        http_response_code(400);
                        echo json_encode($reqResp->toArray(
                            success: false,
                            message: $trad->lang('portfolio.400.missingRequiredParameters'),
                            error: 'Missing parameter: portfolio_uid'
                        ));
                        break;
                    }

                    $obj = new portfolioObj($authManager, $permsManager, $requestData['portfolio_uid']);
                    $res = $obj->get_assetPrices();

                    http_response_code(($res['success'] ?? false) ? 200 : 400);
                    echo json_encode($reqResp->toArray(
                        success: $res['success'] ?? false,
                        message: $trad->lang($res['message'] ?? 'portfolio.assetPricesFetched'),
                        error: $res['error'] ?? null,
                        data: $res['data'] ?? null
                    ));
                    break;

                case 'managed_list':
                    if (!class_exists('managedPortObjList')) {
                        http_response_code(501);
                        echo json_encode($reqResp->toArray(
                            success: false,
                            message: $trad->lang('portfolio.501.notImplemented'),
                            error: 'managedPortObjList class not found'
                        ));
                        break;
                    }
                    $obj = new managedPortObjList($authManager, $permsManager);
                    $res = $obj->get_managedPortfoliosList();
                    http_response_code(($res['success'] ?? false) ? 200 : 400);
                    echo json_encode($reqResp->toArray(
                        success: $res['success'] ?? false,
                        message: $trad->lang($res['message'] ?? 'portfolio.list.200.success'),
                        error: $res['error'] ?? null,
                        data: $res['data'] ?? null
                    ));
                    break;

                case 'portfolios_list':
                    $listObj = new portfolioObjList($authManager, $permsManager);
                    $filters = [
                        'search'       => $_GET['search']        ?? '',
                        'type'         => $_GET['type']          ?? '',
                        'user_uid'     => $_GET['user_uid']      ?? '',
                        'isDraft'      => isset($_GET['isDraft']) ? $_GET['isDraft'] : '',
                        'managed_uid'  => $_GET['managed_uid']   ?? '',
                        'ranked_only'  => $_GET['ranked_only']   ?? '',
                        'created_from' => $_GET['created_from']  ?? '',
                        'created_to'   => $_GET['created_to']    ?? '',
                        'updated_from' => $_GET['updated_from']  ?? '',
                        'updated_to'   => $_GET['updated_to']    ?? ''
                    ];
                    $res = $listObj->get_portfoliosList($filters, true);

                    http_response_code(($res['success'] ?? false) ? 200 : 400);
                    echo json_encode($reqResp->toArray(
                        success: $res['success'] ?? false,
                        message: $trad->lang($res['message'] ?? 'portfolio.list.200.success'),
                        error: $res['error'] ?? null,
                        data: $res['data'] ?? null
                    ));
                    break;

                case 'portfolios_list_paginated':
                    $listObj = new portfolioObjList($authManager, $permsManager);
                    $filters = [
                        'search'       => $_GET['search']        ?? '',
                        'type'         => $_GET['type']          ?? '',
                        'user_uid'     => $_GET['user_uid']      ?? '',
                        'isDraft'      => isset($_GET['isDraft']) ? $_GET['isDraft'] : '',
                        'managed_uid'  => $_GET['managed_uid']   ?? '',
                        'ranked_only'  => $_GET['ranked_only']   ?? '',
                        'created_from' => $_GET['created_from']  ?? '',
                        'created_to'   => $_GET['created_to']    ?? '',
                        'updated_from' => $_GET['updated_from']  ?? '',
                        'updated_to'   => $_GET['updated_to']    ?? ''
                    ];
                    $page    = (int)($_GET['page']     ?? 1);
                    $perPage = (int)($_GET['per_page'] ?? 25);

                    $res = $listObj->get_portfoliosList($filters, false, $page, $perPage);

                    http_response_code(($res['success'] ?? false) ? 200 : 400);
                    echo json_encode($reqResp->toArray(
                        success: $res['success'] ?? false,
                        message: $trad->lang($res['message'] ?? 'portfolio.list.200.success'),
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
                case 'update_portfolio':
                    if (empty($requestData['portfolio_uid'])) {
                        http_response_code(400);
                        echo json_encode($reqResp->toArray(
                            success: false,
                            message: $trad->lang('portfolio.400.missingRequiredParameters'),
                            error: 'Missing: ["portfolio_uid"]'
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

                    $obj = new portfolioObj($authManager, $permsManager, $requestData['portfolio_uid']);
                    $res = $obj->set_portfolioInfo($newData);

                    http_response_code(($res['success'] ?? false) ? 200 : 400);
                    echo json_encode($reqResp->toArray(
                        success: $res['success'] ?? false,
                        message: $trad->lang($res['message'] ?? 'portfolio.update.200.updated'),
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
                case 'create_portfolio':
                    $missing = array_diff($requiredIns, array_keys($requestData));
                    if ($missing) {
                        http_response_code(400);
                        echo json_encode($reqResp->toArray(
                            success: false,
                            message: $trad->lang('portfolio.400.missingRequiredParameters'),
                            error: 'Missing: ' . json_encode(array_values($missing))
                        ));
                        break;
                    }

                    // Dati validi per insert: usa ALL_FIELDS_INFO (senza PK) + type + assets opzionale
                    $newData = [];
                    foreach ($allFields as $f) {
                        if ($f === 'isDeleted') continue; // sarà forzato a '0' dalla classe
                        if (array_key_exists($f, $requestData)) {
                            $newData[$f] = $requestData[$f];
                        }
                    }
                    if (isset($requestData['type'])) {
                        $newData['type'] = $requestData['type'];
                    }
                    if (isset($requestData['assets'])) {
                        $newData['assets'] = $requestData['assets'];
                    }

                    $obj = new portfolioObj($authManager, $permsManager, null);
                    $res = $obj->insert_portfolioInfo($newData);

                    http_response_code(($res['success'] ?? false) ? 201 : 400);
                    echo json_encode($reqResp->toArray(
                        success: $res['success'] ?? false,
                        message: $trad->lang($res['message'] ?? 'portfolio.create.200.created'),
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
                'message' => $trad->lang('portfolio.405.methodNotAllowed'),
                'error'   => 'Method "' . $method . '" not allowed'
            ]);
    }

    if ($defaultOption) {
        http_response_code(400);
        echo json_encode($authManager->responseArr([
            'success' => false,
            'message' => $trad->lang('portfolio.400.invalidOption'),
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
