<?php
// CORS and security headers
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Credentials: true");
header("X-Content-Type-Options: nosniff");
header("X-Frame-Options: DENY");

ob_start();

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

header("Content-Type: application/json");

http_response_code(500);

function sendResponse($httpCode, $responseData) {
    http_response_code($httpCode);
    echo json_encode($responseData);
    exit;
}

try {

    $srcPath = $_SERVER["DOCUMENT_ROOT"];
    if ($srcPath == "") $srcPath = "/var/www/html";

    require_once $srcPath."/auth/inclusions.php";
    require_once $srcPath."/general_inclusions.php";

    $authManager = new authManager();

} catch (Exception $e) {
    sendResponse(500, [
        'success' => false,
        'message' => 'Unknow Fatal Server Error'
    ]);
}

try {
    $data = [];

    if ($authManager->check_isProfileLoaded()) {

        $permsManager = new permsManager($authManager);
        $trad = new langClass($authManager);

        $requestData = [];
        if ($_SERVER['REQUEST_METHOD'] === 'GET') {     // GET => Use GET parameters
            $requestData = $_GET;
        } else {                                        // POST, PUT, DELETE, ecc. => body raw (assuming JSON)
            $requestData_json = file_get_contents("php://input");
            $requestData = json_decode($requestData_json, true);
        }

        switch ($_SERVER['REQUEST_METHOD']) {

            case "GET":

                if (isset($requestData['opt'])) {

                    switch ($requestData['opt']) {

                        case "sideBar_menuItems":

                            $required_parameters = [ 'appState' ];
                            $allKeysSet = true;
                            $missing_keys = [];
                            foreach ($required_parameters as $key) {
                                if (!array_key_exists($key, $requestData)) {
                                    array_push($missing_keys, $key);
                                    $allKeysSet = false;
                                }
                            }

                            if ($allKeysSet) {
                                $pagesManager = new pagesManager($authManager, $permsManager, $requestData['appState']);
                                $data['sideBar_menuItems'] = $pagesManager->compute_sideBar_menuItems();
                        
                                if (true) {
                                    sendResponse(200, $authManager->responseArr([
                                        'success' => true,
                                        'message' => $trad->lang('pages.200.successRetriveData'),
                                        'data' => $data,
                                    ]));
                                } else {
                                    sendResponse(400, $authManager->responseArr([
                                        'success' => false,
                                        'message' => $trad->lang('pages.400.errorRetriveData'),
                                        'error' => 'TEST ERROR'
                                    ]));
                                }
                            } else {
                                sendResponse(400, $authManager->responseArr([
                                    'success' => false,
                                    'message' => $trad->lang('pages.400.missingRequiredParameters'),
                                    'error' => 'The following parameter is missing: '.json_encode($missing_keys),
                                ]));
                            }

                            break;


                        case "navBar_menuItems":

                            $required_parameters = [ 'appState' ];
                            $allKeysSet = true;
                            $missing_keys = [];
                            foreach ($required_parameters as $key) {
                                if (!array_key_exists($key, $requestData)) {
                                    array_push($missing_keys, $key);
                                    $allKeysSet = false;
                                }
                            }

                            if ($allKeysSet) {
                                $pagesManager = new pagesManager($authManager, $permsManager, $requestData['appState']);
                                $data['navBar_menuItems'] = $pagesManager->compute_navBar_menuItems();
                        
                                if (true) {
                                    sendResponse(200, $authManager->responseArr([
                                        'success' => true,
                                        'message' => $trad->lang('pages.200.successRetriveData'),
                                        'data' => $data,
                                    ]));
                                } else {
                                    sendResponse(400, $authManager->responseArr([
                                        'success' => false,
                                        'message' => $trad->lang('pages.400.errorRetriveData'),
                                        'error' => 'TEST ERROR'
                                    ]));
                                }
                            } else {
                                sendResponse(400, $authManager->responseArr([
                                    'success' => false,
                                    'message' => $trad->lang('pages.400.missingRequiredParameters'),
                                    'error' => 'The following parameter is missing: '.json_encode($missing_keys),
                                ]));
                            }

                            break;


                        case "pages_appPagesInfo":
                            $required_parameters = [];
                            $allKeysSet = true;
                            $missing_keys = [];
                            foreach ($required_parameters as $key) {
                                if (!array_key_exists($key, $requestData)) {
                                    array_push($missing_keys, $key);
                                    $allKeysSet = false;
                                }
                            }
                        
                            if ($allKeysSet) {
                                $pagesManager = new pagesManager($authManager, $permsManager, $requestData['appState']);
                                $pages = $pagesManager->compute_appPagesInfo();
                        
                                if ($pages) {
                                    sendResponse(200, $authManager->responseArr([
                                        'success' => true,
                                        'message' => $trad->lang('pages.200.successRetriveData'),
                                        'data' => ['pages' => $pages],
                                    ]));
                                } else {
                                    sendResponse(400, $authManager->responseArr([
                                        'success' => false,
                                        'message' => $trad->lang('pages.400.errorRetriveData'),
                                        'error' => 'TEST ERROR'
                                    ]));
                                }
                            } else {
                                sendResponse(400, $authManager->responseArr([
                                    'success' => false,
                                    'message' => $trad->lang('pages.400.missingRequiredParameters'),
                                    'error' => 'The following parameter is missing: '.json_encode($missing_keys),
                                ]));
                            }

                            break;

                        
                        default:
                            sendResponse(400, $authManager->responseArr([
                                'success' => false,
                                'message' => $trad->lang('pages.400.invalidOption'),
                                'error' => 'Option: "'.$requestData['opt'].'" is invalid.'
                            ]));
                            break;
                    }   

                } else {
                    sendResponse(400, $authManager->responseArr([
                        'success' => false,
                        'message' => $trad->lang('pages.400.optionNotSet'),
                        'error' => 'Option not set.'
                    ]));
                }
                break;

            default:
                sendResponse(405, [
                    'success' => false,
                    'message' => $trad->lang('pages.405.methodNotAllowed'),
                    'error'   => 'Method: "'.$_SERVER['REQUEST_METHOD'].'" are not allowed'
                ]);
                break;
        }     

    }

} catch (AuthException $ae) {

    sendResponse(401, $authManager->responseArr([
        'success' => false,
        'message' => $ae->getMessage(),
        'error'   => $ae->getErrorDetails()
    ]));

} catch (Exception $e) {

    sendResponse(500, $authManager->responseArr([
        'success' => false,
        'message' => 'Fatal Server Error',
        'error'   => $e->getMessage()
    ]));

}


ob_end_flush();
?>
