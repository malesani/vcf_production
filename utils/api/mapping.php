<?php
// CORS and security headers
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("X-Content-Type-Options: nosniff");
header("X-Frame-Options: DENY");

ob_start();

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

header("Content-Type: application/json");
http_response_code(500); // default to server error

$srcPath = $_SERVER['DOCUMENT_ROOT'] ?: '/var/www/html';
require_once "$srcPath/auth/inclusions.php";
require_once __DIR__ . "/../obj/mappingObj.php";

try {
    // Authentication
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

    // Only GET allowed
    $method = $_SERVER['REQUEST_METHOD'];
    if ($method === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
    if ($method !== 'GET') {
        http_response_code(405);
        echo json_encode([
            'success' => false,
            'message' => 'Method not allowed',
            'error'   => "Method '$method' not allowed"
        ]);
        exit;
    }

    // Extract parameters
    $mapType = $_GET['type'] ?? null;
    $mapKey  = $_GET['key']  ?? null;

    if (empty($mapType) || empty($mapKey)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Missing required parameters: type and key',
            'error'   => 'type and key are required'
        ]);
        exit;
    }

    // Fetch mapping
    $mapper = new MappingObj($authManager, $permsManager);
    $mapping = $mapper->getMapping($mapType, $mapKey);

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Mapping retrieved successfully',
        'data'    => ['map' => $mapping]
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Internal Server Error',
        'error'   => $e->getMessage()
    ]);
}

ob_end_flush();
?>
