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


http_response_code(500);        // Default HTTP Response :  500 (Internal Server Error)


$srcPath = $_SERVER["DOCUMENT_ROOT"];
if ($srcPath == "") $srcPath = "/var/www/html";

require_once $srcPath."/auth/inclusions.php";
require_once $srcPath."/general_inclusions.php";

require_once "../obj/userObj.php";


try {
    $data = [];

    $authManager = new authManager();

    if ($authManager->check_isProfileLoaded()) {
        try {

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

                            case "user_info":

                                $userObj = new userObj($authManager, $permsManager);
                                $user_info = $userObj->get_userInfo();

                                $data['user_info'] = $userObj->get_userInfo();
                        
                                if (!empty($data['user_info'])) {
                                    http_response_code(200);
                                    echo json_encode($authManager->responseArr([
                                        'success' => true,
                                        'message' => $trad->lang('user.200.successRetriveData'),
                                        'data' => $data,
                                    ]));
                                } else {
                                    http_response_code(400);
                                    echo json_encode($authManager->responseArr([
                                        'success' => false,
                                        'message' => $trad->lang('user.400.errorRetriveData'),
                                        'error' => 'Empty user_info'
                                    ]));
                                }
                                    
                                break;

                            default:
                                http_response_code(400);
                                echo json_encode($authManager->responseArr([
                                    'success' => false,
                                    'message' => $trad->lang('user.400.invalidOption'),
                                    'error' => 'Option: "'.$requestData['opt'].'" is invalid.'
                                ]));
                                break;
                        }   

                    } else {
                        http_response_code(400);
                        echo json_encode($authManager->responseArr([
                            'success' => false,
                            'message' => $trad->lang('user.400.optionNotSet'),
                            'error' => 'Option not set.'
                        ]));
                    }
                    break;

                case "PUT":

                    if (isset($requestData['opt'])) {

                        switch ($requestData['opt']) {

                            case "user_info":

                                $required_parameters = [ 'email', 'first_name', 'last_name', 'phone' ];
                                $allKeysSet = true;
                                $missing_keys = [];
                                foreach ($required_parameters as $key) {
                                    if (!array_key_exists($key, $requestData)) {
                                        array_push($missing_keys, $key);
                                        $allKeysSet = false;
                                    }
                                }

                                if ($allKeysSet) {
                                    $new_userData = [
                                        'email' => $requestData['email'],
                                        'first_name' => $requestData['first_name'],
                                        'last_name' => $requestData['last_name'],
                                        'phone' => $requestData['phone'] ?? NULL,                                        
                                    ];

                                    $userObj = new userObj($authManager, $permsManager);
                                    $response_setUserInfo = $userObj->set_userInfo($new_userData);

                                    $data['user_info'] = $userObj->get_userInfo();
                            
                                    if ($response_setUserInfo['success']) {
                                        http_response_code(200);
                                        echo json_encode($authManager->responseArr([
                                            'success' => true,
                                            'message' => $trad->lang($response_setUserInfo['message']),
                                            'data' => $data,
                                        ]));
                                    } else {
                                        http_response_code(400);
                                        echo json_encode($authManager->responseArr([
                                            'success' => false,
                                            'message' => $trad->lang($response_setUserInfo['message']),
                                            'error' => $response_setUserInfo['error']
                                        ]));
                                    }
                                } else {
                                    http_response_code(400);
                                    echo json_encode($authManager->responseArr([
                                        'success' => false,
                                        'message' => $trad->lang('user.400.missingRequiredParameters'),
                                        'error' => 'The following parameter is missing: '.json_encode($missing_keys),
                                    ]));
                                }
                                    
                                break;

                            default:
                                http_response_code(400);
                                echo json_encode($authManager->responseArr([
                                    'success' => false,
                                    'message' => $trad->lang('user.400.invalidOption'),
                                    'error' => 'Option: "'.$requestData['opt'].'" is invalid.'
                                ]));
                                break;
                        }   

                    } else {
                        http_response_code(400);
                        echo json_encode($authManager->responseArr([
                            'success' => false,
                            'message' => $trad->lang('user.400.optionNotSet'),
                            'error' => 'Option not set.'
                        ]));
                    }
                    break;

                default:
                    http_response_code(405);        // 405 ( Method Not Allowed )
                    echo json_encode([
                        'success' => false,
                        'message' => $trad->lang('user.405.methodNotAllowed'),
                        'error'   => 'Method: "'.$_SERVER['REQUEST_METHOD'].'" are not allowed'
                    ]);
                    break;
            }     

        } catch (Exception $e) {
            http_response_code(500);    // 500 ( Internal Server Error )
            echo json_encode($authManager->responseArr([
                'success' => false,
                'message' => 'Internal Server FatalError',
                'error'   => $e->getMessage()
            ]));
        }

    } else {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'message' => 'Invalid or Expired session!',
            'error' => 'Invalid or Expired session!'
        ]);
    }

} catch (Exception $e) {
    http_response_code(500);    // 500 ( Internal Server Error )
    echo json_encode([
        'success' => false,
        'message' => 'Internal Server FatalError',
        'error'   => $e->getMessage()
    ]);
}


ob_end_flush();
?>
