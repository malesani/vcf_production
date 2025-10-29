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

// >>> OPERATIONS objects
require_once __DIR__ . "/../obj/operationsObj.php";

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

    $method      = $_SERVER['REQUEST_METHOD'];
    $requestData = ($method === 'GET')
        ? $_GET
        : (json_decode(file_get_contents('php://input'), true) ?: []);

    if (empty($requestData['opt'])) {
        http_response_code(400);
        echo json_encode($reqResp->toArray(
            success: false,
            message: $trad->lang('operations.400.optionNotSet'),
            error: 'Option not set.'
        ));
        exit;
    }

    // Tutte le operazioni richiedono il portfolio_uid
    $portfolio_uid = $requestData['portfolio_uid'] ?? null;
    if (!$portfolio_uid) {
        http_response_code(400);
        echo json_encode($reqResp->toArray(
            success: false,
            message: $trad->lang('operations.400.missingRequiredParameters'),
            error: 'Missing parameter: portfolio_uid'
        ));
        exit;
    }

    // Istanzio l’oggetto principale
    $opsObj = new operationsObj($authManager, $permsManager, $portfolio_uid);

    $defaultOption = false;

    switch ($method) {
        /** ====================
         *         GET
         * =====================*/
        case 'GET':
            switch ($requestData['opt']) {
                case 'operations_list_paginated':
                    // Filtri facoltativi
                    $filters = [
                        'symbol'    => $_GET['symbol']    ?? '',
                        'operation' => $_GET['operation'] ?? '', // 'buy'|'sell'
                        'from'      => $_GET['from']      ?? '', // datetime
                        'to'        => $_GET['to']        ?? '', // datetime
                    ];
                    $page    = (int)($_GET['page']     ?? 1);
                    $perPage = (int)($_GET['per_page'] ?? 25);

                    $result = $opsObj->get_operations($filters, false, $page, $perPage);
                    http_response_code($result['success'] ? 200 : 400);
                    echo json_encode($reqResp->toArray(
                        success: $result['success'],
                        message: $trad->lang($result['message']),
                        error:   $result['error'] ?? null,
                        data:    $result['data']  ?? null
                    ));
                    break;

                case 'operations_suggested_from_nfo':
                    // Restituisce operazioni suggerite da report + alerts (per managed)
                    $result = $opsObj->get_nfoDerivedOperations();
                    http_response_code($result['success'] ? 200 : 400);
                    echo json_encode($reqResp->toArray(
                        success: $result['success'],
                        message: $trad->lang($result['message']),
                        error:   $result['error'] ?? null,
                        data:    $result['data']  ?? null
                    ));
                    break;

                default:
                    $defaultOption = true;
                    break;
            }
            break;

        /** ====================
         *         POST
         * =====================*/
        case 'POST':
            switch ($requestData['opt']) {
                case 'operation_create':
                    // Payload richiesto: symbol, operation('buy'|'sell'), unitQuantity(int>0), unitaryPrice(num>0)
                    $payload = [
                        'symbol'       => $requestData['symbol']       ?? null,
                        'operation'    => $requestData['operation']    ?? null,
                        'unitQuantity' => $requestData['unitQuantity'] ?? null,
                        'unitaryPrice' => $requestData['unitaryPrice'] ?? null,
                    ];

                    // (Opzionale) permesso scrittura
                    // if (!$permsManager->checkUserHasPerm('portfolio.operations.write')) { ... }

                    $res = $opsObj->create_operation($payload);

                    http_response_code($res['success'] ? 201 : 400);
                    echo json_encode($reqResp->toArray(
                        success: $res['success'],
                        message: $trad->lang($res['message']),
                        data:    $res['data']  ?? null,
                        error:   $res['error'] ?? null
                    ));
                    break;

                default:
                    $defaultOption = true;
                    break;
            }
            break;

        /** ====================
         *         PUT
         * =====================*/
        case 'PUT':
            switch ($requestData['opt']) {
                case 'operation_upsert':
                    // Richiede: operation_uid + almeno uno tra unitQuantity|unitaryPrice (in base al tipo portfolio)
                    if (empty($requestData['operation_uid'])) {
                        http_response_code(400);
                        echo json_encode($reqResp->toArray(
                            success: false,
                            message: $trad->lang('operations.400.missingRequiredParameters'),
                            error: 'Missing parameter: operation_uid'
                        ));
                        break;
                    }

                    $updateData = [];
                    if (array_key_exists('unitQuantity', $requestData)) {
                        $updateData['unitQuantity'] = $requestData['unitQuantity'];
                    }
                    if (array_key_exists('unitaryPrice', $requestData)) {
                        $updateData['unitaryPrice'] = $requestData['unitaryPrice'];
                    }

                    // (Opzionale) permesso scrittura
                    // if (!$permsManager->checkUserHasPerm('portfolio.operations.write')) { ... }

                    $res = $opsObj->upsert_operation($requestData['operation_uid'], $updateData);

                    http_response_code($res['success'] ? 200 : 400);
                    echo json_encode($reqResp->toArray(
                        success: $res['success'],
                        message: $trad->lang($res['message']),
                        data:    $res['data']  ?? null,
                        error:   $res['error'] ?? null
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
                message: $trad->lang('operations.405.methodNotAllowed'),
                error: 'Method "' . $method . '" not allowed'
            ));
    }

    if ($defaultOption) {
        http_response_code(400);
        echo json_encode($reqResp->toArray(
            success: false,
            message: $trad->lang('operations.400.invalidOption'),
            error: 'Option: ' . $method . ' - "' . $requestData['opt'] . '" invalid'
        ));
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode($reqResp->toArray(
        success: false,
        message: 'Internal Server FatalError',
        error:   $e->getMessage()
    ));
}
ob_end_flush();