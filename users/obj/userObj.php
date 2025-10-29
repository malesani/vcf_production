<?php

require_once("{$_SERVER['DOCUMENT_ROOT']}/auth/obj/authManager.php");
require_once("{$_SERVER['DOCUMENT_ROOT']}/auth/obj/permsManager.php");

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

class userObj {
    private $authManager;
    private $permsManager;
    private $conn;

    private $user_data;

    private $user_info;

    public function __construct(authManager $authManager, permsManager $permsManager) {
        $this->authManager = $authManager;
        $this->permsManager = $permsManager;
        $this->conn = $this->authManager->get_dbConn();

        $this->user_data = $this->authManager->get_userData();

        $this->user_info = $this->load_userInfo();
    }

    private function load_userInfo() {
        $user_uid = $this->user_data['user_uid'];
        $stmt = $this->conn->prepare("
            SELECT user_uid, email, first_name, last_name, phone 
            FROM acl_users 
            WHERE user_uid = :user_uid
        ");
        $stmt->execute(["user_uid" => $user_uid]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row) {
            return $row;
        } else {
            throw new Exception("User not found for user_uid= '".$user_uid."'");
        }
    }

    public function set_userInfo(array $newUserData): array {
        $user_uid = $this->user_data['user_uid'];

        $required_parameters = [ 'email', 'first_name', 'last_name', 'phone' ];
        $allKeysSet = true;
        $missing_keys = [];
        foreach ($required_parameters as $key) {
            if (!array_key_exists($key, $newUserData)) {
                array_push($missing_keys, $key);
                $allKeysSet = false;
            }
        }

        if ($allKeysSet) {

            try {
                $execute_info = [
                    "email" => $newUserData['email'],
                    "first_name" => $newUserData['first_name'],
                    "last_name" => $newUserData['last_name'],
                    "phone" => $newUserData['phone'] ?? NULL,
                    "user_uid" => $user_uid
                ];

                $stmt = $this->conn->prepare("
                    UPDATE acl_users 
                    SET email = :email, first_name = :first_name, last_name = :last_name, phone = :phone 
                    WHERE user_uid = :user_uid
                ");

                $stmt->execute($execute_info);

                $this->user_info['email'] = $execute_info['email'];
                $this->user_info['first_name'] = $execute_info['first_name'];
                $this->user_info['last_name'] = $execute_info['last_name'];
                $this->user_info['phone'] = $execute_info['phone'];

                return [
                    'success' => true,
                    'message' => 'user.infoUpdated'
                ];
            } catch (Exception $e) {
                return [
                    'success' => false,
                    'message' => 'user.fatalError',
                    'error' => $e->getMessage()
                ];
            }
        
        } else {
            return [
                'success' => false,
                'message' => 'user.missingInfo',
                'error' => 'newUserData missing: '.json_encode($missing_keys)
            ];
        }
    }

    public function get_userInfo() {
        return $this->user_info;
    }

    
}

?>