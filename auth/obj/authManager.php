<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

$srcPath = $_SERVER["DOCUMENT_ROOT"];
if ($srcPath == "") $srcPath = "/var/www/html";

require_once "$srcPath/config/config.php";
require_once "$srcPath/vendor/autoload.php";

use \Firebase\JWT\JWT;
use \Firebase\JWT\Key;

class authManager
{

    // ENV VARIABLES
    private $authConfig;
    private $dbConfig;
    // end

    private $isProfileLoaded = false;

    private $userUID;
    private $companyUID;
    private $role_uid;
    private $subRole_uid;
    private $super_admin = false;

    private $client_uid;

    private $cookies_auth_setup = [
        'domain' => '',
        'samesite' => 'Strict',        // 'Lax' in base alle esigenze
        'secure' => false,
    ];


    public function __construct()
    {

        $this->authConfig = Auth::class;
        $this->dbConfig = DbData::class;

        $this->client_uid = NULL;

        $this->userUID = NULL;
        $this->companyUID = NULL;
        $this->role_uid = NULL;
        $this->subRole_uid = NULL;
    }

    // GET BAREER TOKEN - Utility function to get headers (FOR PUBLIC API)
    public function getBearerToken()
    {
        $headers = $this->getAuthorizationHeader();
        if (!empty($headers)) {
            if (preg_match('/Bearer\s(\S+)/', $headers, $matches)) {
                return $matches[1];
            }
        }
        return null;
    }

    private function getAuthorizationHeader()
    {
        $headers = null;
        if (isset($_SERVER['Authorization'])) {
            $headers = trim($_SERVER["Authorization"]);
        } else if (isset($_SERVER['HTTP_AUTHORIZATION'])) { // Nginx or FastCGI
            $headers = trim($_SERVER["HTTP_AUTHORIZATION"]);
        } else if (function_exists('apache_request_headers')) {
            $requestHeaders = apache_request_headers();
            $requestHeaders = array_combine(array_map('ucwords', array_keys($requestHeaders)), array_values($requestHeaders));
            if (isset($requestHeaders['Authorization'])) {
                $headers = trim($requestHeaders['Authorization']);
            }
        }
        return $headers;
    }
    // end

    // SET LOGIN - Login function 
    public function login($user_key, $password, $remember_me = false)
    {
        $conn = $this->get_dbConn();
        $user_key = trim($user_key);

        // Check if user_key is an email to login by username or email
        if (filter_var($user_key, FILTER_VALIDATE_EMAIL)) {
            $sql = "SELECT * FROM acl_users WHERE email=:user_key LIMIT 1;";
        } else {
            $sql = "SELECT * FROM acl_users WHERE username=:user_key LIMIT 1;";
        }

        $stmt = $conn->prepare($sql);
        $stmt->execute([
            "user_key" => $user_key,
        ]);

        // CHECK IF EXIST
        $response = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!isset($response['user_uid'])) {
            return [    // NO USER MATCH
                'success' => false,
                'message' => 'auth.401.noUserMatch',
                'error' => "This User doesn't exist: '" . $user_key . "'"
            ];
        } else {
            $user_uid = $response['user_uid'];
        }
        // end

        // CHECK IF IS BLOCKED
        if (isset($response['blocked']) && $response['blocked'] == 1) {     // CHECK IF BLOCKED - Check if this user is blocked
            return [        // USER IS BLOCKED
                'success' => false,
                'message' => 'auth.401.userBlocked',
                'error' => "User Blocked"
            ];
        }
        // end

        // CHECK CREDENTIAL 
        $hash_pw = $response['hash_pw'];
        if (!password_verify($password, $hash_pw)) {
            return [        // INVALID CREDENTIAL
                'success' => false,
                'message' => 'auth.401.invalidCredentials',
                'error' => "Invalid Credential"
            ];
        }
        // end

        // CHECK COMPANY AND ROLE/SUBROLE
        $stmt = $conn->prepare("SELECT * FROM acl_map_users_companies_roles WHERE user_uid=:user_uid;");
        $stmt->execute([
            "user_uid" => $user_uid,
        ]);

        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $rowCount = count($rows);


        if ($rowCount === 0) {
            return [    // NO USER MATCH
                'success' => false,
                'message' => 'auth.401.invalidUser',
                'error' => "This User has no company: [" . $user_uid . "]"
            ];
        }

        if ($rowCount === 1) {
            $userData_map = $rows[0];
            $userData = [
                'user_uid'      => $user_uid,
                'company_uid'   => $userData_map['company_uid'],
                'role_uid'      => $userData_map['role_uid'],
                'subRole_uid'   => $userData_map['subRole_uid'],
                'super_admin'   => ($userData_map['role_uid'] == '-1' && $userData_map['subRole_uid'] == 'SUPERADMIN') ? true : false,
            ];
        } else {
            // Multiple‐companies: 
            $userData = [
                'user_uid'      => $user_uid,
                'company_uid'   => null,
                'role_uid'      => null,
                'subRole_uid'   => null,
                'super_admin'   => false,
            ];
        }
        // end

        $expirationTime = ($userData['super_admin']) ? $this->authConfig::expirationTime_restricted : $this->authConfig::expirationTime;
        $auth_token = $this->generateJWT_authToken($userData, $expirationTime);


        $this->setAuth_cookies($auth_token, $expirationTime);

        // IF REMEMBER ME && NOT SUPER ADMIN => REFRESH TOKEN
        if ($remember_me && !$userData['super_admin']) {
            $expirationTime_refresh = $this->authConfig::expirationTime_refresh;   // This token will have 7 days validity
            $refresh_token = $this->generateJWT_refreshToken($userData, $expirationTime_refresh);

            $this->setRefresh_cookies($refresh_token, $expirationTime_refresh);
        }

        return [        // LOGGED IN
            'success' => true,
            'message' => 'auth.200.loggedIn'
        ];
    }

    // SET CHOOSEN COMPANY - set company after choose_company
    public function setChosenCompany(string $companyUid)
    {
        // 1) Recupera e valida il token esistente
        $currentToken = $this->getAuth_cookies();
        $decoded      = $this->validateJWT_authToken($currentToken);
        if (!$decoded) {
            throw new Exception("select_company.401.invalidToken");
        }

        // 2) Prepara i dati di partenza dal payload
        $data                = (array)$decoded->data;
        $data['company_uid'] = $companyUid;

        // ricarica role + subRole ───────────
        $stmt = $this->get_dbConn()->prepare("
            SELECT role_uid, subrole_uid
              FROM acl_map_users_companies_roles
             WHERE user_uid    = :user_uid
               AND company_uid = :company_uid
             LIMIT 1;
        ");
        $stmt->execute([
            'user_uid'    => $data['user_uid'],
            'company_uid' => $companyUid
        ]);
        $map = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$map) {
            throw new Exception("select_company.404.mappingNotFound");
        }
        // Aggiorna sia il payload che le proprietà interne
        $data['role_uid']    = $map['role_uid'];
        $data['subRole_uid'] = $map['subrole_uid'];
        $this->companyUID    = $companyUid;
        $this->role_uid      = $map['role_uid'];
        $this->subRole_uid   = $map['subrole_uid'];

        // 3) Calcola TTL residuo e genera nuovo token
        $remaining = $decoded->exp - time();
        if ($remaining <= 0) {
            throw new Exception("select_company.401.tokenExpired");
        }
        $newToken = $this->generateJWT_authToken($data, $remaining);

        // 4) Sovrascrive il cookie
        $this->setAuth_cookies($newToken, $remaining);

        return [
            'success' => true,
            'message' => 'select_company.200.companySelected'
        ];
    }

    // SET LOGIN AS if superAdmin
    public function superAdmin_logAs($targetUserID, $targetCompanyUID)
    {
        $expirationTime = $this->authConfig::expirationTime;

        $currentAuthToken = $this->getAuth_cookies();

        $decoded = $this->validateJWT_authToken($currentAuthToken);
        if (!$decoded || !isset($decoded->data->super_admin) || !$decoded->data->super_admin) {
            return [
                'success' => false,
                'message' => 'superAdmin.logAs.error.unautorized',
                'error' => "Someone without permission is trying to impersonate: [" . $targetUserID . "]",
            ];
        }

        // GET user to log as info
        $conn = $this->get_dbConn();
        $stmt = $conn->prepare("SELECT u.*, m.* FROM acl_users u
            LEFT JOIN acl_map_users_companies_roles m
                ON m.user_uid    = u.user_uid AND m.company_uid = :company_uid
            WHERE u.user_uid = :user_uid LIMIT 1;");

        $stmt->execute([
            'user_uid' => $targetUserID,
            'company_uid' => $targetCompanyUID,
        ]);

        if ($stmt->rowCount() !== 1) {
            return [
                'success' => false,
                'message' => 'superAdmin.logAs.error.targetUserNotFound',
                'error' => "Target user not found, company_uid = [" . $targetCompanyUID . "] | user_uid: [" . $targetUserID . "]"
            ];
        }

        $targetUser = $stmt->fetch(PDO::FETCH_ASSOC);

        // Ppreare target data to log As
        $impersonatedUserData = [
            'company_uid' => $targetUser['company_uid'],
            'user_uid'     => $targetUser['user_uid'],
            'role_uid'   => $targetUser['role_uid'],
            'subRole_uid'   => $targetUser['subRole_uid'],
            'super_admin' => false,     // superAdmin level are temporary disabled
        ];

        // Generate a token to log as, with custom claim "impersonated_by"
        $issuedAt = time();
        $expiration = $issuedAt + $expirationTime;
        $jti = bin2hex(random_bytes(16));
        $clientIP  = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
        $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? 'unknown';

        $payload = [
            'iss' => 'App_BackendSystem',
            'aud' => 'App_FrontendClient',
            'iat' => $issuedAt,
            'nbf' => $issuedAt,
            'exp' => $expiration,
            'jti' => $jti,
            'data' => [
                'company_uid'    => $impersonatedUserData['company_uid'],
                'user_uid'        => $impersonatedUserData['user_uid'],
                'role_uid'      => $impersonatedUserData['role_uid'],
                'subRole_uid'   => $impersonatedUserData['subRole_uid'],
                'super_admin'    => $impersonatedUserData['super_admin'],
                'impersonated_by' => $decoded->data->user_uid  // ID super admin
            ],
            'meta' => [
                'client_ip'  => $clientIP,
                'user_agent' => $userAgent
            ]
        ];

        $logAs_token = JWT::encode($payload, $this->authConfig::secretKeyAuth, 'HS256');

        // Registra l'azione di impersonazione nel sistema di audit log
        $this->addAuditLog('Impersonation', 'Super_admin: [' . $decoded->data->user_uid . '] have logged as user: [' . $targetUserID . ']');

        $this->setAuth_cookies($logAs_token, $expirationTime);

        return [
            'success' => true,
            'message' => 'Super_admin: [' . $decoded->data->user_uid . '] have logged as user: [' . $targetUserID . ']',
        ];
    }

    // REFRESH AUTH TOKEN
    private function refresh($refresh_token)
    {

        if (empty($refresh_token)) {
            return [
                "success" => false,
                "message" => "refresh.401.noRefreshTokenFound",
                "error" => "No refresh token found."
            ];
        }

        $decoded = $this->validateJWT_refreshToken($refresh_token);

        if ($decoded) {

            $userData = [
                'company_uid' => $decoded->data->company_uid,
                'user_uid' => $decoded->data->user_uid,
                'role_uid' => $decoded->data->role_uid,
                'subRole_uid' => $decoded->data->subRole_uid,
                'super_admin' => $decoded->data->super_admin,
            ];

            $expirationTime = $userData['super_admin'] ? $this->authConfig::expirationTime_restricted : $this->authConfig::expirationTime;

            $new_auth_token = $this->generateJWT_authToken($userData, $expirationTime);

            $this->setAuth_cookies($new_auth_token, $expirationTime);

            return [
                'success' => true,
                'message' => 'refresh.200.newAuthTokenGenerated',
            ];
        } else {
            return [
                'success' => false,
                'message' => 'refresh.401.invalidOrExpiredRefreshToken',
                'error' => 'Invalid or expired refresh token'
            ];
        }
    }

    // LOGOUT - BLACKLIST AUTH TOKEN
    public function logout()
    {
        $auth_token = $this->getAuth_cookies();
        $refresh_token = $this->getRefresh_cookies();

        $decoded = $this->validateJWT_authToken($auth_token);

        if ($decoded) {

            // Blacklist the current token
            $this->addToBlacklist($decoded->jti, $decoded->exp);

            // destroy auth cookie
            $this->setAuth_cookies('', -3600);  // Set to empty string and expire on the past

            if (!empty($refresh_token)) {
                $refresh_decoded = $this->validateJWT_refreshToken($refresh_token);
                if ($refresh_decoded) {
                    // Blacklist the current refresh token
                    $this->addToBlacklist($refresh_decoded->jti, $refresh_decoded->exp);

                    // destroy refresh cookie
                    $this->setRefresh_cookies('', -3600);  // Set to empty string and expire on the past
                }
            }

            return [
                'success' => true,
                'message' => 'logout.200.logoutSuccessfully',
            ];
        } else {
            return [
                'success' => true,
                'message' => 'logout.200.invalidOrExpiredAuthToken',
            ];
        }
    }

    // PROFILE - Check autorization
    public function profile()
    {
        $auth_token = $this->getAuth_cookies();
        $refresh_token = $this->getRefresh_cookies();

        $decoded = $this->validateJWT_authToken($auth_token);

        if (!$decoded && !empty($refresh_token)) {
            $refresh_response = $this->refresh($refresh_token);
            if (!$refresh_response['success']) {
                // se il refresh fallisce, esci subito
                return [
                    'success' => false,
                    'message' => $refresh_response['message'],
                    'error'   => $refresh_response['error'] ?? 'Refresh token invalido'
                ];
            }
        }

        if (!$decoded) {
            return [
                'success' => false,
                'message' => 'profile.401.invalidOrExpiredToken',
                'error'   => 'Invalid or expired token'
            ];
        }

        $conn = $this->get_dbConn();
        $stmt = $conn->prepare("
            SELECT
                c.company_uid,
                c.name,
                c.address,
                c.phone,
                c.email,
                c.vat
            FROM acl_companies c
            JOIN acl_map_users_companies_roles m
            ON c.company_uid = m.company_uid
            WHERE m.user_uid = :user_uid
        ");
        $stmt->execute([
            'user_uid' => $decoded->data->user_uid
        ]);
        $companiesData = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return [
            'success'        => true,
            'message'        => 'profile.200.tokenValid',
            'user_data'      => $decoded->data,
            'companies_data' => $companiesData
        ];
    }

    // COOKIES - Management
    private function setAuth_cookies($auth_token, $auth_expires)
    {

        setcookie(
            'auth_token',            // Nome del cookie
            $auth_token,             // Valore del token
            [
                'expires' => time() + $auth_expires,
                'path' => '/',
                'domain' => $this->cookies_auth_setup['domain'],
                'secure' => $this->cookies_auth_setup['secure'],        // Only HTTPS
                'httponly' => true,                                     // Non accessibile da JavaScript
                'samesite' => $this->cookies_auth_setup['samesite']     // 'Strict' o 'Lax' in base alle esigenze
            ]
        );
    }

    private function setRefresh_cookies($refresh_token, $refresh_expires)
    {
        setcookie(
            'refresh_token',            // Nome del cookie
            $refresh_token,             // Valore del token
            [
                'expires' => time() + $refresh_expires,
                'path' => '/',
                'domain' => $this->cookies_auth_setup['domain'],
                'secure' => $this->cookies_auth_setup['secure'],        // Only HTTPS
                'httponly' => true,                                     // Non accessibile da JavaScript
                'samesite' => $this->cookies_auth_setup['samesite']     // 'Strict' o 'Lax' in base alle esigenze
            ]
        );
    }

    private function getAuth_cookies()
    {
        return $_COOKIE['auth_token'] ?? null;
    }
    private function getRefresh_cookies()
    {
        return $_COOKIE['refresh_token'] ?? null;
    }
    // END


    // TOKEN MANAGEMENT
    // GENERATE AUTH TOKEN JWT
    private function generateJWT_authToken($userData, $expirationTime)
    {

        $issuedAt   = time();
        $expiration = $issuedAt + $expirationTime;
        $jti = bin2hex(random_bytes(16));  // Genera un ID univoco per il token

        // Get user metadata
        $clientIP = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
        $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? 'unknown';


        $payload = [
            'iss' => 'App_BackendSystem',   // Issuer: identifica l'emittente del token
            'aud' => 'App_FrontendClient',  // Audience: indica il destinatario previsto del token
            'iat' => $issuedAt,             // Data di emissione
            'nbf' => $issuedAt,             // Il token non è valido prima di questo momento
            'exp' => $expiration,           // Scadenza del token
            'jti' => $jti,                  // Identificativo univoco del token

            'data' => [
                'company_uid'   => $userData['company_uid'],
                'user_uid'       => $userData['user_uid'],
                'role_uid'      => $userData['role_uid'],
                'subRole_uid'   => $userData['subRole_uid'],
                'super_admin'   => $userData['super_admin']
            ],

            'meta' => [
                'client_ip'  => $clientIP,  // Indirizzo IP del client
                'user_agent' => $userAgent  // User Agent del client
            ]
        ];
        return JWT::encode($payload, $this->authConfig::secretKeyAuth, 'HS256');
    }

    // GENERATE REFRESH TOKEN JWT
    private function generateJWT_refreshToken($userData, $expirationTime)
    {
        $issuedAt   = time();
        $expiration = $issuedAt + $expirationTime;
        $jti = bin2hex(random_bytes(16));

        $clientIP  = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
        $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? 'unknown';

        $payload = [
            'iss' => 'App_BackendSystem',
            'aud' => 'App_FrontendClient',
            'iat' => $issuedAt,
            'nbf' => $issuedAt,
            'exp' => $expiration,
            'jti' => $jti,
            'data' => [
                'company_uid' => $userData['company_uid'],
                'user_uid'     => $userData['user_uid'],
                'role_uid'   => $userData['role_uid'],
                'subRole_uid'   => $userData['subRole_uid'],
                'super_admin' => false
            ],
            'meta' => [
                'client_ip'  => $clientIP,
                'user_agent' => $userAgent
            ]
        ];
        $refreshToken = JWT::encode($payload, $this->authConfig::secretKeyRefresh, 'HS256');

        // Conversion from array to object to prevent inconsistency
        $payloadObj = is_object($payload) ? $payload : json_decode(json_encode($payload));

        // Save refresh_token to db for validation
        $this->storeRefreshTokenInDB($payloadObj);
        return $refreshToken;
    }
    // REFRESH TOKEN - Db Storage
    private function storeRefreshTokenInDB($JSON_payload)
    {
        try {
            if (!is_object($JSON_payload)) {
                $JSON_payload = json_decode(json_encode($JSON_payload));
            }

            $conn = $this->get_dbConn();
            $stmt = $conn->prepare("INSERT INTO auth_refresh_tokens(jti, iss, aud, iat, nbf, company_uid, user_uid, role_uid, subRole_uid, meta, expires_at) 
                                            VALUES (:jti, :iss, :aud, :iat, :nbf, :company_uid, :user_uid, :role_uid, :subRole_uid, :meta, :expires_at)");
            $stmt->execute([
                "jti" =>            $JSON_payload->jti ?? NULL,
                "iss" =>            $JSON_payload->iss ?? NULL,
                "aud" =>            $JSON_payload->aud ?? NULL,
                "iat" =>            $JSON_payload->iat ?? NULL,
                "nbf" =>            $JSON_payload->nbf ?? NULL,
                "company_uid" =>    $JSON_payload->data->company_uid ?? NULL,
                "user_uid" =>        $JSON_payload->data->user_uid ?? NULL,
                "role_uid" =>      $JSON_payload->data->role_uid ?? NULL,
                "subRole_uid" =>      $JSON_payload->data->subRole_uid ?? NULL,
                "meta" =>           isset($JSON_payload->meta) ? json_encode($JSON_payload->meta) : NULL,
                "expires_at" =>     $JSON_payload->exp ?? NULL,
            ]);
        } catch (PDOException $e) {
            throw new Exception($e->getMessage());
        }
    }


    public function issueServiceToken(string $client_uid, string $clientSecret): array
    {
        $conn = $this->get_dbConn();
        // GET client
        $stmt = $conn->prepare("SELECT * FROM service_clients WHERE client_uid = :client_uid");
        $stmt->execute(['client_uid' => $client_uid]);
        $client = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$client || !password_verify($clientSecret, $client['client_secret'])) {
            return ['success' => false, 'message' => 'Unable to issue service token', 'error' => 'invalid_client'];
        }

        // 2) Prepara payload JWT
        $issuedAt = time();
        $exp      = $issuedAt + 3600;  // 1h di validità
        $jti      = bin2hex(random_bytes(16));
        $payload = [
            'iss' => 'App_BackendSystem',
            'aud' => 'App_BackendClient',
            'iat' => $issuedAt,
            'nbf' => $issuedAt,
            'exp' => $exp,
            'jti' => $jti,
            'data' => [
                'client_uid' => $client_uid,
            ],
            'meta' => [
                'type' => 'service'
            ]
        ];

        $token = JWT::encode($payload, $this->authConfig::secretKeyAuth, 'HS256');

        return [
            'success' => true,
            'message' => "Service Token Created",
            'data' => [
                'token' => $token,
            ]
        ];
    }


    // VALIDATE AUTH TOKEN JWT
    public function validateJWT_authToken($auth_token = NULL)
    {
        try {
            $this->isProfileLoaded = false;

            if (empty($auth_token)) {
                $this->addAuditLog('MissingToken', 'No token provided.');
                return false;
            }

            $decoded = JWT::decode($auth_token, new Key($this->authConfig::secretKeyAuth, 'HS256'));

            // VALIDATE JWT CLAIM
            $expectedIssuer = 'App_BackendSystem';
            $expectedAudience = 'App_FrontendClient';
            $currentTime = time();

            if ($decoded->iss !== $expectedIssuer) {
                $this->addAuditLog('InvalidIssuer', 'Token issuer invalid. Expected: ' . $expectedIssuer . ', Got: ' . $decoded->iss);
                return false;
            }

            if ($decoded->aud !== $expectedAudience) {
                $this->addAuditLog('InvalidAudience', 'Token audience invalid. Expected: ' . $expectedAudience . ', Got: ' . $decoded->aud);
                return false;
            }

            // Also JWT library check 'nbf' and 'exp' fiels, we check iat
            if ($decoded->iat > $currentTime) {
                $this->addAuditLog('InvalidIssuedAt', 'Token issued at time is in the future.');
                return false;
            }
            // end

            if ($this->isTokenBlacklisted($decoded->jti)) {
                $this->addAuditLog('BlacklistedToken', 'Token jti: ' . $decoded->jti . ' is blacklisted.');
                return false;
            }

            if (isset($decoded->data)) {
                $this->companyUID   = $decoded->data->company_uid;
                $this->userUID      = $decoded->data->user_uid;
                $this->role_uid    = $decoded->data->role_uid;
                $this->subRole_uid    = $decoded->data->subRole_uid;
                $this->super_admin  = $decoded->data->super_admin;

                $this->isProfileLoaded = true;
                return $decoded;
            }
            return false;
        } catch (Exception $e) {
            return false;
        }
    }

    // VALIDATE REFRESH TOKEN JWT
    public function validateJWT_refreshToken($refresh_token = NULL)
    {
        try {
            if (empty($refresh_token)) {
                $this->addAuditLog('MissingRefreshToken', 'No refresh token provided.');
                return false;
            }
            $decoded = JWT::decode($refresh_token, new Key($this->authConfig::secretKeyRefresh, 'HS256'));

            // VALIDATE JWT CLAIM
            $expectedIssuer = 'App_BackendSystem';
            $expectedAudience = 'App_FrontendClient';
            $currentTime = time();

            if ($decoded->iss !== $expectedIssuer) {
                $this->addAuditLog('InvalidIssuer', 'Token issuer invalid. Expected: ' . $expectedIssuer . ', Got: ' . $decoded->iss);
                return false;
            }

            if ($decoded->aud !== $expectedAudience) {
                $this->addAuditLog('InvalidAudience', 'Token audience invalid. Expected: ' . $expectedAudience . ', Got: ' . $decoded->aud);
                return false;
            }

            // Also JWT library check 'nbf' and 'exp' fiels, we check iat
            if ($decoded->iat > $currentTime) {
                $this->addAuditLog('InvalidIssuedAt', 'Token issued at time is in the future.');
                return false;
            }
            // end

            if ($this->isRefreshTokenValid($decoded)) {    // CHECK refresh token validity from db
                return $decoded;
            }

            $this->addAuditLog('InvalidRefreshToken', 'Refresh token jti: ' . $decoded->jti . ' is not valid.');
            return false;
        } catch (Exception $e) {
            $this->addAuditLog('InvalidRefreshToken', 'Error: ' . $e->getMessage());
            return false;
        }
    }
    // CHECK refresh token validity from db
    private function isRefreshTokenValid($JSON_decoded)
    {
        try {

            if ($this->isTokenBlacklisted($JSON_decoded->jti)) {
                return false;
            }

            $conn = $this->get_dbConn();
            $stmt = $conn->prepare("SELECT * FROM auth_refresh_tokens WHERE jti = :jti AND expires_at > :now");
            $stmt->execute([
                'jti' => $JSON_decoded->jti,
                'now' => time()
            ]);

            if ($stmt->rowCount() > 0) {
                $refreshToken_db = $stmt->fetch(PDO::FETCH_ASSOC);

                // Confronta i campi principali
                if (
                    ($JSON_decoded->data->company_uid == $refreshToken_db['company_uid']) &&
                    ($JSON_decoded->data->user_uid == $refreshToken_db['user_uid']) &&
                    ($JSON_decoded->data->role_uid == $refreshToken_db['role_uid']) &&
                    ($JSON_decoded->data->subRole_uid == $refreshToken_db['subRole_uid'])
                ) {
                    return true;
                } else {
                    // Se i dati non corrispondono, registra l'evento e ritorna false
                    $this->addAuditLog('RefreshTokenMismatch', 'Mismatch in token data for jti: ' . $JSON_decoded->jti);
                    return false;
                }
            }
            return false;
        } catch (PDOException $e) {
            return false;
        }
    }

    // VALIDATE AUTH TOKEN JWT
    public function validateJWT_serviceToken($service_token = NULL)
    {
        try {
            $this->isProfileLoaded = false;

            if (empty($service_token)) {
                $this->addAuditLog('MissingToken', 'No token provided.');
                return false;
            }

            $decoded = JWT::decode($service_token, new Key($this->authConfig::secretKeyAuth, 'HS256'));

            // VALIDATE JWT CLAIM
            $expectedIssuer = 'App_BackendSystem';
            $expectedAudience = 'App_BackendClient';
            $currentTime = time();

            if ($decoded->iss !== $expectedIssuer) {
                $this->addAuditLog('InvalidIssuer', 'Token issuer invalid. Expected: ' . $expectedIssuer . ', Got: ' . $decoded->iss);
                return false;
            }

            if ($decoded->aud !== $expectedAudience) {
                $this->addAuditLog('InvalidAudience', 'Token audience invalid. Expected: ' . $expectedAudience . ', Got: ' . $decoded->aud);
                return false;
            }

            // Also JWT library check 'nbf' and 'exp' fiels, we check iat
            if ($decoded->iat > $currentTime) {
                $this->addAuditLog('InvalidIssuedAt', 'Token issued at time is in the future.');
                return false;
            }
            // end

            if (isset($decoded->data)) {
                $this->client_uid = $decoded->data->client_uid;

                $this->isProfileLoaded = true;
                return $decoded;
            }
            return false;
        } catch (Exception $e) {
            return false;
        }
    }

    // BLACKLIST: Add token to blacklist
    public function addToBlacklist($jti, $expiration)
    {
        try {
            $conn = $this->get_dbConn();
            $stmt = $conn->prepare("INSERT INTO auth_token_blacklist (jti, expires_at) VALUES (:jti, :expires_at)");

            return $stmt->execute([
                'jti' => $jti,
                'expires_at' => $expiration
            ]);
        } catch (PDOException $e) {
            throw new Exception($e->getMessage());
        }
    }
    /// CHECK BLACKLIST: Check if this token is blacklisted by jti
    private function isTokenBlacklisted($jti)
    {
        try {
            $conn = $this->get_dbConn();
            $stmt = $conn->prepare("SELECT * FROM auth_token_blacklist WHERE jti = :jti");
            $stmt->execute(['jti' => $jti]);
            return ($stmt->rowCount() > 0);
        } catch (PDOException $e) {
            return false;
        }
    }
    // end

    // AUDIT LOG: Storage of suspicius activity
    private function addAuditLog($eventType, $details)
    {
        try {
            $conn = $this->get_dbConn();
            $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
            $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? 'unknown';
            $stmt = $conn->prepare("INSERT INTO audit_log (event_type, details, ip_address, user_agent, created_at) VALUES (:event_type, :details, :ip_address, :user_agent, :created_at)");
            $stmt->execute([
                'event_type' => $eventType,
                'details'    => $details,
                'ip_address' => $ip,
                'user_agent' => $userAgent,
                'created_at' => date('Y-m-d H:i:s')
            ]);
        } catch (PDOException $e) {
            // Se l'inserimento fallisce, potresti inviare un alert o loggare in un file
        }
    }

    public function responseArr($responseArr)
    {
        $allowed_users_uid = [];
        if ($this->role_uid == '-1' || $this->super_admin || $this->authConfig::developerMode) {
            return $responseArr;
        } else {
            if (isset($responseArr['error'])) {
                unset($responseArr['error']);
            }
            return $responseArr;
        }
    }

    public function is_devMode()
    {
        $allowed_users_uid = [];
        if ($this->role_uid == '-1' || $this->super_admin || $this->authConfig::developerMode || in_array($this->userUID, $allowed_users_uid)) {
            return true;
        } else {
            return false;
        }
    }

    // GET FUNCTIONS

    // CHECK isProfileLoaded
    public function check_isProfileLoaded()
    {
        if (!$this->isProfileLoaded) {
            $response_profile = $this->profile();

            if ($response_profile['success']) {
                return true;
            } else {
                $this->logout();
                throw new AuthException("logouted." . $response_profile['message'], 401, $response_profile['error'] ?? null);
            }
        }

        return true;
    }

    // CHECK IS SERVICE
    public function check_isServiceLoaded()
    {
        return !is_null($this->client_uid);
    }

    /** GET profile :
     * Restituisce i dati dell’utente.
     *
     * @return array{
     *     user_uid: string,
     *     company_uid: string,
     *     role_uid: string,
     *     subRole_uid: string
     * }
     */
    public function get_userData(): array
    {
        return [
            "user_uid" => $this->userUID,
            "company_uid" => $this->companyUID,
            "role_uid" => $this->role_uid,
            "subRole_uid" => $this->subRole_uid,
        ];
    }

    // GET companyUID :
    public function get_companyUID()
    {
        return $this->companyUID;    // company_uid
    }

    // GET user ID :
    public function get_userUID()
    {
        return $this->userUID;    // user_uid
    }

    // GET role_uid
    public function get_roleUID()
    {
        return $this->role_uid;    // role_uid
    }

    // GET role_uid
    public function get_subRoleUID()
    {
        return $this->subRole_uid;    // subRole_uid
    }

    public function is_superAdmin()
    {
        return $this->super_admin;    // subRole_uid
    }
    // end


    // UTIL FUNCTIONS
    /** Generate Unique Id*/
    public function generateUniqueUID($tableName, $columnName, $UIdLength = 8)
    {
        $conn = $this->get_dbConn();

        // Verifica se la tabella esiste nel database
        $stmt = $conn->prepare("SHOW TABLES LIKE ?");
        $stmt->execute([$tableName]);
        $tableExists = $stmt->fetchColumn();

        if (!$tableExists) {
            throw new Exception("Errore: The table $tableName not exist.");
        }

        // Verifica se la colonna esiste nella tabella
        $stmt = $conn->prepare("SHOW COLUMNS FROM $tableName LIKE ?");
        $stmt->execute([$columnName]);
        $columnExists = $stmt->fetchColumn();

        if (!$columnExists) {
            throw new Exception("Errore: La column $columnName non exist into table $tableName.");
        }

        do {
            $characters = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
            // generateRandomString => UID
            $UID = '';
            $max = strlen($characters) - 1;

            // Generate UID of length = $UIdLength
            for ($i = 0; $i < $UIdLength; $i++) {
                $UID .= $characters[mt_rand(0, $max)];
            }
            // end

            // Verifica se l'UID è già presente nel database
            $stmt = $conn->prepare("SELECT COUNT(*) FROM $tableName WHERE $columnName = ?");
            $stmt->execute([$UID]);
            $count = $stmt->fetchColumn();
        } while ($count > 0); // Se l'UID è già presente, ripeti il processo

        return $UID;
    }
    // end

    // Create and get DB $conn (PDO Obj)
    public function get_dbConn()
    {
        // Usa una variabile statica per mantenere la stessa istanza di PDO
        static $pdo = null;
        if ($pdo === null) {
            try {
                $dsn = "mysql:host=" . $this->dbConfig::db_server .
                    ";dbname=" . $this->dbConfig::db_name .
                    ";charset=utf8mb4";
                $options = [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false,
                    PDO::ATTR_PERSISTENT => true  // Abilita connessioni persistenti
                ];
                $pdo = new PDO($dsn, $this->dbConfig::db_username, $this->dbConfig::db_password, $options);
            } catch (PDOException $e) {
                // Registra l'errore e, se necessario, invia un alert
                error_log("Connection failed : " . $e->getMessage());
                throw new Exception("Database connection failed");
            }
        }
        return $pdo;
    }
}
