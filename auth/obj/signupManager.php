<?php
$srcPath = $_SERVER["DOCUMENT_ROOT"];
if ($srcPath == "") $srcPath = "/var/www/html";

require_once("$srcPath/auth/obj/authManager.php");
require_once("$srcPath/auth/obj/JwtService.php");

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

class signupManagerBase {
    protected authManager $authManager;
    protected PDO         $conn;

    public function __construct(authManager $authManager) {
        $this->authManager  = $authManager;
        $this->conn         = $this->authManager->get_dbConn();
    }
}


class signupManager extends signupManagerBase {

    public function __construct( authManager $authManager ) {
        parent::__construct($authManager);
    }

    private function decode_inviteRestrictedToken(string $token):array {
        try {
            $jwtService = new JwtService('App_customerInvite', 'App_signupSystem');
            $result     = $jwtService->validate($token);

            // CHECK token validity
            if (!$result['success']) {
                throw new Exception('INVALID TOKEN: '.$result['error']) ;   // token non valido
            }

            /** @var \stdClass $decoded */
            $decoded = $result['data'];

            // Extract data
            $decodedData = (array) $decoded->data;

            if (!is_array($decodedData)) {
                throw new Exception('Malformed token payload');
            }

            $rawData = [
                'company_uid' => $decodedData['company_uid'] ?? null,
                'customer_uid'    => $decodedData['customer_uid']   ?? null,
                'teamMember_uid'  => $decodedData['teamMember_uid'] ?? null,
                'sendToEmail'   => $decodedData['sendToEmail']    ?? null,
                'authKey'      => $decodedData['authKey']        ?? null
            ];

            // CHECK for required info
                $required = [
                    'company_uid',
                    'customer_uid',
                    'sendToEmail',
                    'authKey'
                ];
                $missing = [];
                foreach ($required as $key) {
                    if (empty($rawData[$key])) {
                        $missing[] = $key;
                    }
                }

                if (!empty($missing)) {
                    throw new Exception('Missing required info: '.json_encode($missing));
                }
            // end

            $checkedData = $rawData;
            $checkedData['metadata'] = $decodedData['metadata'] ?? [];

            return [
                "success" => true,
                "message" => 'Invitation decoded.',
                "data" => $checkedData
            ];
            
        } catch (Exception $e) {
            return [
                "success" => false,
                "message" => 'Invitation is invalid or expired.',
                "error" => $e->getMessage()
            ];
        }
    }

    private function toDb_inviteRestricted(string $token):array {
        try {

            $response_decode = $this->decode_inviteRestrictedToken($token);
            if (!$response_decode['success']) {
                throw new Exception($response_decode['error']);
            }

            $decodedData = $response_decode['data'];

            $sql = "INSERT INTO acl_restrited_invitations (company_uid, customer_uid, teamMember_uid, sendToEmail, authKey, created_at)
                VALUES (:company_uid, :customer_uid, :teamMember_uid, :sendToEmail, :authKey, NOW())
                ON DUPLICATE KEY UPDATE
                    sendToEmail = VALUES(sendToEmail),
                    authKey      = VALUES(authKey),
                    created_at    = NOW();";

            $stmt = $this->conn->prepare($sql);

            $stmt->execute([ 
                "company_uid" => $decodedData['company_uid'],
                "customer_uid" => $decodedData['customer_uid'],
                "teamMember_uid" => $decodedData['teamMember_uid'] ?? NULL,
                "sendToEmail" => $decodedData['sendToEmail'],
                "authKey" => $decodedData["authKey"]
             ]);

            return [
                "success" => true,
                "message" => 'Invitation saved.'
            ];
            
        } catch (Exception $e) {
            return [
                "success" => false,
                "message" => 'Invitation is invalid or expired.',
                "error" => $e->getMessage()
            ];
        }
    }

    public function generate_inviteRestrictedToken(array $data, bool $isTeamMember=true):array {
        try {
            // SET required info
                $required = [
                    'company_uid',
                    'customer_uid',
                    'sendToEmail'
                ];

                if ($isTeamMember) {
                    $required[] = 'teamMember_uid';
                }
            // end

            // CHECK IF REQUIRED INFO IS SET
                $raw = [
                    'company_uid'       => $data['company_uid']     ?? null,
                    'customer_uid'      => $data['customer_uid']    ?? null,
                    'teamMember_uid'    => $data['teamMember_uid']  ?? null,
                    'sendToEmail'       => $data['sendToEmail']     ?? null,
                ];

                $missing = [];
                foreach ($required as $key) {
                    if (empty($raw[$key])) {
                        $missing[] = $key;
                    }
                }

                if (!empty($missing)) {
                    throw new Exception("Invitation payload missing required information, missing: [" . json_encode($missing). "]");
                }
            // end

            // SETUP JwtService as JWTS
            $JWTS = new JwtService('App_customerInvite', 'App_signupSystem');

            // KEY TO ENFORCE VALIDATION
            $authKey = $this->authManager->generateUniqueUID('acl_restrited_invitations', 'authKey', 12);

            // Prepare payload
            $payload = $raw;
            $payload['authKey'] = $authKey;

            // adding metadata for signup frontend
            $payload['metadata'] = array_diff_key($data, $raw);

            $generatedToken = $JWTS->generate($payload, 604800);     // expire in 7 days
            $return_toDbInviteRest = $this->toDb_inviteRestricted($generatedToken);


            if ($return_toDbInviteRest['success']) {
                return [
                    "success" => true,
                    "message" => "Invitation generated",
                    "data" => [
                        "token" => $generatedToken
                    ]
                ];
            } else {
                throw new Exception($return_toDbInviteRest['error'] ?: "Unknow Error");
            }
        } catch (Exception $e) {
            return [
                "success" => false,
                "message" => "Fatal error while generate this invitation",
                "error" => $e->getMessage()
            ];
        }
    }

    public function check_inviteRestrictedToken(string $token):array {
        try {
            // DECODE TOKEN DATA
                $response_decode = $this->decode_inviteRestrictedToken($token);
                if (!$response_decode['success']) {
                    throw new Exception($response_decode['error']);
                }
            // end
            $decodedData = $response_decode['data'];

            // GET DB INVITATION DATA
                $sql = "SELECT
                        company_uid,
                        customer_uid,
                        teamMember_uid,
                        sendToEmail,
                        authKey,
                        created_at
                    FROM acl_restrited_invitations
                    WHERE company_uid      = :company_uid
                        AND customer_uid = :customer_uid
                        AND teamMember_uid <=> :teamMember_uid;";

                $stmt = $this->conn->prepare($sql);

                $stmt->execute([
                    'company_uid' => $decodedData['company_uid'],
                    'customer_uid' => $decodedData['customer_uid'],
                    'teamMember_uid' => $decodedData['teamMember_uid'],
                ]);
                
                if ($stmt->rowCount() !== 1) {
                    return [
                        'success' => false, 
                        'message' => 'inviteRestrictedToken.error.invitationNotFound',
                        'error' => "No invitation for Restricted found for this payload, company_uid = [".$decodedData['company_uid']."] | customer_uid: [".$decodedData['customer_uid']."] | teamMember_uid: [".$decodedData['teamMember_uid']."]"
                    ];
                }
            // end
            $storedInvitation = $stmt->fetch(PDO::FETCH_ASSOC);

            // VALIDATE invitation
                $keyToCheck = [
                    "company_uid", 
                    "customer_uid", 
                    "teamMember_uid", 
                    "sendToEmail",
                    "authKey"
                ];

                $differences = [];
                foreach ($keyToCheck as $key) {
                    $value = $storedInvitation[$key];
                    if (!isset($decodedData[$key]) || $decodedData[$key] !== $value) {
                        $differences[$key] = $value;
                    }
                }

                if (!empty($differences)) {
                    throw new Exception("Found [" . count($differences) . "] differences from valid invitation, INVALID");
                }
            // end

            return [
                "success" => true,
                "message" => 'inviteRestrictedToken.valid',
                "data" => [
                    'company_uid' => $decodedData['company_uid'],
                    'customer_uid' => $decodedData['customer_uid'],
                    'teamMember_uid' => $decodedData['teamMember_uid'],
                    'metadata' => $decodedData['metadata']
                ]
            ];

        } catch (Exception $e) {
            return [
                "success" => false,
                "message" => 'inviteRestrictedToken.invalid.checkNewOne',   // Invalid invitation, check your inbox for a new one.
                "error" => $e->getMessage()
            ];
        }

    }

}

?>