<?php
$srcPath = $_SERVER["DOCUMENT_ROOT"];
if ($srcPath == "") $srcPath = "/var/www/html";

require_once("$srcPath/auth/obj/authManager.php");
require_once("$srcPath/auth/obj/JwtService.php");

require_once "$srcPath/smtp/obj/smtpObj.php";
require_once "$srcPath/smtp/obj/templatesObj.php";

require_once "$srcPath/quiz/obj/quizObj.php";

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

class signupManagerBase
{
    protected authManager $authManager;
    protected PDO         $conn;

    public function __construct(authManager $authManager)
    {
        $this->authManager  = $authManager;
        $this->conn         = $this->authManager->get_dbConn();
    }
}


class signupManager extends signupManagerBase
{

    public function __construct(authManager $authManager)
    {
        parent::__construct($authManager);
    }

    private function decode_inviteRestrictedToken(string $token): array
    {
        try {
            $jwtService = new JwtService('App_customerInvite', 'App_signupSystem');
            $result     = $jwtService->validate($token);

            // CHECK token validity
            if (!$result['success']) {
                throw new Exception('INVALID TOKEN: ' . $result['error']);   // token non valido
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
                throw new Exception('Missing required info: ' . json_encode($missing));
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

    private function toDb_inviteRestricted(string $token): array
    {
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

    public function generate_inviteRestrictedToken(array $data, bool $isTeamMember = true): array
    {
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
                throw new Exception("Invitation payload missing required information, missing: [" . json_encode($missing) . "]");
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

    public function check_inviteRestrictedToken(string $token): array
    {
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
                    'error' => "No invitation for Restricted found for this payload, company_uid = [" . $decodedData['company_uid'] . "] | customer_uid: [" . $decodedData['customer_uid'] . "] | teamMember_uid: [" . $decodedData['teamMember_uid'] . "]"
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

    public function signup_createUser_createActivationToken_sendMail(array $payload): array
    {
        try {
            // ===============================
            // 1) INPUT & VALIDATION
            // ===============================
            $email      = trim((string)($payload['email'] ?? ''));
            $first_name = trim((string)($payload['first_name'] ?? ''));
            $last_name  = trim((string)($payload['last_name'] ?? ''));
            $phone      = trim((string)($payload['phone'] ?? ''));
            $password   = (string)($payload['password'] ?? '');
            $lang_code  = 'it-IT';

            if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
                throw new Exception("Invalid email");
            }
            if ($first_name === '' || $last_name === '') {
                throw new Exception("Missing first_name or last_name");
            }
            if ($password === '' || strlen($password) < 8) {
                throw new Exception("Password must be at least 8 characters");
            }

            // ===============================
            // 2) DUPLICATE CHECK
            // ===============================
            $stmt = $this->conn->prepare("
                SELECT user_uid
                FROM acl_users
                WHERE email = :email
                LIMIT 1
            ");
            $stmt->execute(['email' => $email]);

            if ($stmt->fetch()) {
                return [
                    "success" => false,
                    "message" => "signup.userAlreadyExists",
                    "error"   => "User already exists"
                ];
            }

            // ===============================
            // 3) TRANSACTION START
            // ===============================
            $this->conn->beginTransaction();

            // ===============================
            // 4) CREATE USER
            // ===============================
            $user_uid = $this->authManager->generateUniqueUID('acl_users', 'user_uid', 8);

            $hash_pw = password_hash($password, PASSWORD_DEFAULT);
            if (!$hash_pw) {
                throw new Exception("Password hashing failed");
            }

            $stmt = $this->conn->prepare("
            INSERT INTO acl_users (
                user_uid,
                email,
                first_name,
                last_name,
                phone,
                lang_code,
                hash_pw
            ) VALUES (
                :user_uid,
                :email,
                :first_name,
                :last_name,
                :phone,
                :lang_code,
                :hash_pw
            )
        ");
            $stmt->execute([
                'user_uid'   => $user_uid,
                'email'      => $email,
                'first_name' => $first_name,
                'last_name'  => $last_name,
                'phone'      => $phone ?: null,
                'lang_code'  => $lang_code,
                'hash_pw'    => $hash_pw
            ]);

            // ===============================
            // 5) Aggancia eventuale quiz guest completato per questa email
            // ===============================
            $quizObj = new quizObj($this->conn);

            $latestQuiz = $quizObj->findLatestCompletedGuestQuizByEmail($email);
            if ($latestQuiz) {
                $quiz_uid = (string)$latestQuiz['uid'];

                $quizObj->applyQuizToUserFromQuizUid($quiz_uid, $user_uid);
                $quizObj->createOrUpdatePresetsFromQuizUid($user_uid, $quiz_uid);
            }

            // ==========================================================
            // 6) MAP user -> company + role/subrole (multitenant)
            // ==========================================================
            $company_uid = 'TB1tvCCHos';
            $role_uid    = '2';
            $subRole_uid = 'customerAdmin';

            $sqlMap = "
                INSERT INTO acl_map_users_companies_roles (
                    company_uid,
                    user_uid,
                    role_uid,
                    subRole_uid
                ) VALUES (
                    :company_uid,
                    :user_uid,
                    :role_uid,
                    :subRole_uid
                )
                ON DUPLICATE KEY UPDATE
                    role_uid = VALUES(role_uid),
                    subRole_uid = VALUES(subRole_uid)
            ";

            $stmt = $this->conn->prepare($sqlMap);
            $stmt->execute([
                'company_uid' => $company_uid,
                'user_uid'    => $user_uid,
                'role_uid'    => $role_uid,
                'subRole_uid' => $subRole_uid,
            ]);

            // ===============================
            // 7) CREATE ACTIVATION TOKEN
            // ===============================
            $token_uid = $this->authManager->generateUniqueUID(
                'auth_signup_tokens',
                'token_uid',
                8
            );

            $rawToken  = bin2hex(random_bytes(32));
            $tokenHash = hash('sha256', $rawToken);

            $stmt = $this->conn->prepare("
            INSERT INTO auth_signup_tokens (
                token_uid,
                purpose,
                email,
                user_uid,
                token_hash,
                expires_at
            ) VALUES (
                :token_uid,
                :purpose,
                :email,
                :user_uid,
                :token_hash,
                DATE_ADD(NOW(), INTERVAL 48 HOUR)
            )
        ");
            $stmt->execute([
                'token_uid'  => $token_uid,
                'purpose'    => 'account_activation',
                'email'      => $email,
                'user_uid'   => $user_uid,
                'token_hash' => $tokenHash
            ]);

            // ===============================
            // 8) SEND MAIL
            // ===============================
            $frontend = rtrim((string)Auth_Frontend::Origin, '/');
            if ($frontend === '') {
                throw new RuntimeException('FRONTEND_ORIGIN not configured');
            }

            $activationLink = $frontend . '?activation_token=' . urlencode($rawToken);

            $smtp = new smtpObj();

            $html = templatesObj::render('', 'signup_activation', '', [
                'first_name' => $first_name,
                'email' => $email,
                'activate_link' => $activationLink,
                'expires_hours' => 24,
                'support_email' => 'supporto@vcf.it',
                'company' => 'VCF',
            ]);
            $smtp->sendMail($email, templatesObj::resolveSubject('', 'signup_activation', []), $html);

            // ===============================
            // 9) COMMIT
            // ===============================
            $this->conn->commit();

            return [
                "success" => true,
                "message" => "signup.success.activationMailSent",
                "data" => [
                    "user_uid" => $user_uid,
                    "email"    => $email
                ]
            ];
        } catch (Exception $e) {
            if ($this->conn->inTransaction()) {
                $this->conn->rollBack();
            }

            return [
                "success" => false,
                "message" => "signup.failed",
                "error"   => $e->getMessage()
            ];
        }
    }

    public function activate_account(string $tokenRaw): array
    {
        try {
            $tokenRaw = trim($tokenRaw);
            if ($tokenRaw === '') {
                return [
                    "success" => false,
                    "message" => "signup.activation.invalid",
                    "error"   => "Missing token"
                ];
            }

            $tokenHash = hash('sha256', $tokenRaw);

            // ✅ prendo anche email dal token (dato che ce l'hai in tabella)
            $sql = "
            SELECT
                token_uid,
                user_uid,
                email,
                token_hash,
                purpose,
                expires_at,
                used_at
            FROM auth_signup_tokens
            WHERE token_hash = :token_hash
              AND purpose = :purpose
            LIMIT 1
        ";

            $stmt = $this->conn->prepare($sql);
            $stmt->execute([
                ':token_hash' => $tokenHash,
                ':purpose'    => 'account_activation'
            ]);

            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$row) {
                return [
                    "success" => false,
                    "message" => "signup.activation.invalid",
                    "error"   => "Token not found"
                ];
            }

            // scaduto?
            if (!empty($row['expires_at'])) {
                $expiresAt = strtotime((string)$row['expires_at']);
                if ($expiresAt !== false && $expiresAt < time()) {
                    return [
                        "success" => false,
                        "message" => "signup.activation.expired",
                        "error"   => "Token expired"
                    ];
                }
            }

            // ✅ carico user (per validazione e fallback email)
            $stmtUser = $this->conn->prepare("
            SELECT user_uid, email
            FROM acl_users
            WHERE user_uid = :user_uid
            LIMIT 1
        ");
            $stmtUser->execute([':user_uid' => $row['user_uid']]);
            $user = $stmtUser->fetch(PDO::FETCH_ASSOC);

            if (!$user) {
                return [
                    "success" => false,
                    "message" => "signup.activation.invalid",
                    "error"   => "User not found for this token"
                ];
            }

            // ✅ email preferita: token.email (se presente), altrimenti acl_users.email
            $resolvedEmail = null;
            if (!empty($row['email'])) {
                $resolvedEmail = $row['email'];
            } elseif (!empty($user['email'])) {
                $resolvedEmail = $user['email'];
            }

            // già usato?
            if (!empty($row['used_at'])) {
                return [
                    "success" => true,
                    "message" => "signup.activation.already_done",
                    "data"    => [
                        "user_uid" => $row['user_uid'],
                        "email"    => $resolvedEmail
                    ]
                ];
            }

            // Consumo token in transazione (idempotente)
            $this->conn->beginTransaction();

            $stmtUpd = $this->conn->prepare("
            UPDATE auth_signup_tokens
            SET used_at = NOW()
            WHERE token_uid = :token_uid
              AND used_at IS NULL
            LIMIT 1
        ");
            $stmtUpd->execute([
                ':token_uid' => $row['token_uid']
            ]);

            // Se 0 righe, significa che qualcuno l'ha consumato nel frattempo (race condition)
            // In tal caso rispondiamo comunque "already_done" con email.
            $updatedRows = $stmtUpd->rowCount();

            $this->conn->commit();

            if ($updatedRows === 0) {
                return [
                    "success" => true,
                    "message" => "signup.activation.already_done",
                    "data"    => [
                        "user_uid" => $row['user_uid'],
                        "email"    => $resolvedEmail
                    ]
                ];
            }

            return [
                "success" => true,
                "message" => "signup.activation.success",
                "data"    => [
                    "user_uid" => $user['user_uid'],
                    "email"    => $resolvedEmail
                ]
            ];
        } catch (Exception $e) {
            if ($this->conn->inTransaction()) {
                $this->conn->rollBack();
            }
            return [
                "success" => false,
                "message" => "signup.activation.failed",
                "error"   => $e->getMessage()
            ];
        }
    }
}
