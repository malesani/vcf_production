<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("X-Content-Type-Options: nosniff");
header("X-Frame-Options: DENY");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    echo json_encode(["success" => true]);
    exit;
}

ob_start();
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

header("Content-Type: application/json");
http_response_code(500);

$srcPath = $_SERVER["DOCUMENT_ROOT"];
if ($srcPath == "") $srcPath = "/var/www/html";

require_once $srcPath . "/auth/inclusions.php";
require_once $srcPath . "/general_inclusions.php";

require_once $srcPath . "/presetsData/obj/presetsDataManager.php";

try {
    $authManager = new authManager();

    // =========================
    // AUTH REQUIRED
    // =========================
    $token = $_COOKIE['auth_token'] ?? null;
    if (!$token) {
        $token = $authManager->getBearerToken();
    }
    if (!$token) {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'message' => 'presets.401.unauthorized',
            'error'   => 'Missing auth token'
        ]);
        exit;
    }

    $decoded = $authManager->validateJWT_authToken($token);
    $user_uid = null;
    if ($decoded && isset($decoded->data->user_uid)) {
        $user_uid = (string)$decoded->data->user_uid;
    }
    if (!$user_uid) {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'message' => 'presets.401.unauthorized',
            'error'   => 'Invalid auth token'
        ]);
        exit;
    }

    // =========================
    // REQUEST DATA
    // =========================
    $requestData = [];
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $requestData = $_GET;
    } else {
        $json = file_get_contents("php://input");
        $requestData = json_decode($json, true);
        if (!is_array($requestData)) $requestData = [];
    }

    if (!isset($requestData['opt'])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'presets.400.optionNotSet',
            'error'   => 'Option not set.'
        ]);
        exit;
    }

    $conn = $authManager->get_dbConn();
    $mgr = new presetsDataManager($conn);

    // helper: decodifica preset_json per risposta frontend
    $formatPresetRow = function (?array $row) {
        if (!$row) return null;

        $decoded = json_decode((string)$row['preset_json'], true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            $decoded = null; // non blocco la response, ma segnalo nullo
        }

        return [
            'uid'         => $row['uid'],
            'user_uid'    => $row['user_uid'],
            'quiz_uid'    => $row['quiz_uid'],
            'quiz_version'=> $row['quiz_version'],
            'preset_json' => $decoded,                 // ✅ comodo per frontend
            'preset_json_raw' => (string)$row['preset_json'], // ✅ utile per debug
            'created_at'  => $row['created_at'],
            'updated_at'  => $row['updated_at'],
        ];
    };

    switch ($_SERVER['REQUEST_METHOD']) {

        // =========================
        // GET
        // =========================
        case "GET":
            switch ($requestData['opt']) {

                case "get_presets":
                    $quiz_version = $requestData['quiz_version'] ?? null;
                    if ($quiz_version !== null) {
                        $quiz_version = trim((string)$quiz_version);
                        if ($quiz_version === '') $quiz_version = null;
                    }

                    if ($quiz_version) {
                        $row = $mgr->getByUserAndVersion($user_uid, $quiz_version);
                        if (!$row) {
                            http_response_code(404);
                            echo json_encode([
                                'success' => false,
                                'message' => 'presets.notFound',
                                'error'   => 'preset not found'
                            ]);
                            break;
                        }

                        http_response_code(200);
                        echo json_encode([
                            'success' => true,
                            'message' => 'presets.ok',
                            'data' => [
                                'preset' => $formatPresetRow($row)
                            ]
                        ]);
                        break;
                    }

                    // lista tutte le versioni
                    $rows = $mgr->listByUser($user_uid);
                    $out = [];
                    foreach ($rows as $r) $out[] = $formatPresetRow($r);

                    http_response_code(200);
                    echo json_encode([
                        'success' => true,
                        'message' => 'presets.ok',
                        'data' => [
                            'presets' => $out
                        ]
                    ]);
                    break;

                default:
                    http_response_code(400);
                    echo json_encode([
                        'success' => false,
                        'message' => 'presets.400.invalidOption',
                        'error'   => 'Option: "' . $requestData['opt'] . '" is invalid.'
                    ]);
                    break;
            }
            break;

        // =========================
        // POST
        // =========================
        case "POST":
            switch ($requestData['opt']) {

                /**
                 * PATCH parziale del preset_json:
                 * payload atteso:
                 * - quiz_version (string) REQUIRED
                 * - patch (object|array|string json) REQUIRED
                 * - expected_uid (string) OPTIONAL
                 */
                case "patch_presets":
                    $quiz_version = trim((string)($requestData['quiz_version'] ?? ''));
                    if ($quiz_version === '') {
                        http_response_code(400);
                        echo json_encode([
                            'success' => false,
                            'message' => 'presets.missingParameters',
                            'error'   => 'quiz_version missing'
                        ]);
                        break;
                    }

                    if (!array_key_exists('patch', $requestData)) {
                        http_response_code(400);
                        echo json_encode([
                            'success' => false,
                            'message' => 'presets.missingParameters',
                            'error'   => 'patch missing'
                        ]);
                        break;
                    }

                    $patch = $requestData['patch'];
                    $expected_uid = $requestData['expected_uid'] ?? null;
                    if ($expected_uid !== null) $expected_uid = trim((string)$expected_uid);

                    $resp = $mgr->patchPresetJson($user_uid, $quiz_version, $patch, $expected_uid ?: null);

                    if (empty($resp['success'])) {
                        http_response_code(400);
                        echo json_encode([
                            'success' => false,
                            'message' => $resp['message'] ?? 'presets.error',
                            'error'   => $resp['error'] ?? 'Unknown error'
                        ]);
                        break;
                    }

                    // ritorno anche il preset aggiornato (comodo per UI)
                    $row = $mgr->getByUserAndVersion($user_uid, $quiz_version);

                    http_response_code(200);
                    echo json_encode([
                        'success' => true,
                        'message' => $resp['message'] ?? 'presets.patched',
                        'data' => [
                            'result' => $resp['data'] ?? [],
                            'preset' => $formatPresetRow($row)
                        ]
                    ]);
                    break;

                default:
                    http_response_code(400);
                    echo json_encode([
                        'success' => false,
                        'message' => 'presets.400.invalidOption',
                        'error'   => 'Option: "' . $requestData['opt'] . '" is invalid.'
                    ]);
                    break;
            }
            break;

        default:
            http_response_code(405);
            echo json_encode([
                'success' => false,
                'message' => 'presets.405.methodNotAllowed',
                'error'   => 'Method: "' . $_SERVER['REQUEST_METHOD'] . '" not allowed'
            ]);
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Internal Server FatalError',
        'error' => $e->getMessage()
    ]);
}

ob_end_flush();
