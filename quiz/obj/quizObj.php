<?php
// /quiz/obj/quizObj.php

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

require_once("$srcPath/auth/obj/authManager.php");
require_once "$srcPath/smtp/obj/smtpObj.php";
require_once "$srcPath/smtp/obj/templatesObj.php";
require_once "$srcPath/presetsData/obj/presetsDataManager.php";

/**
 * quizObj NON dipende da authManager.
 *
 * PATCH: supporto "draft" con quiz_uid persistente (client o server).
 * - Se arriva quiz_uid: UPSERT su quella riga (niente nuove entry per ogni step)
 * - completed_at SOLO quando finalize=true
 * - meta: inserita UNA sola volta per quiz_uid (se già presente non reinserisce)
 *
 * Attese colonne data_quiz (come da tua tabella reale):
 * uid, user_uid, email, quiz_json, version, created_at, updated_at,
 * completed_at, applied_to_user_uid, applied_at, discarded_at, discard_reason
 *
 * data_quiz_meta:
 * uid, quiz_uid, ip_hash, user_agent, accept_language, referrer, created_at
 */
class quizObj
{
    private PDO $conn;

    private presetsDataManager $presetsMgr;

    public function __construct(PDO $conn)
    {
        $this->conn = $conn;

        $this->presetsMgr = new presetsDataManager($conn);
    }

    /* ===========================
       Public API
       =========================== */

    public function startDraft(array $payload): array
    {
        $version  = $payload['version'] ?? null;
        $user_uid = $payload['user_uid'] ?? null;
        $meta     = $payload['meta'] ?? null;

        if (!$version) {
            return ['success' => false, 'message' => 'quiz.missingParameters', 'error' => 'version missing'];
        }

        try {
            $this->conn->beginTransaction();

            // quiz_json iniziale (vuoto ma valido)
            $quiz_json_str = json_encode(['answers' => new stdClass()], JSON_UNESCAPED_UNICODE);

            // UID unico davvero (con check DB)
            $quiz_uid = $this->generateQuizUID('data_quiz', 'uid', 8);

            $stmt = $this->conn->prepare("
          INSERT INTO data_quiz (
            uid, user_uid, email, quiz_json, version,
            completed_at, applied_to_user_uid, applied_at,
            discarded_at, discard_reason
          ) VALUES (
            :uid, :user_uid, NULL, :quiz_json, :version,
            NULL, NULL, NULL,
            NULL, NULL
          )
        ");
            $stmt->execute([
                'uid' => $quiz_uid,
                'user_uid' => $user_uid,
                'quiz_json' => $quiz_json_str,
                'version' => $version
            ]);

            $this->insertMeta($quiz_uid, $meta);

            $this->conn->commit();

            return [
                'success' => true,
                'message' => 'quiz.started',
                'data' => ['quiz_uid' => $quiz_uid]
            ];
        } catch (Exception $e) {
            if ($this->conn->inTransaction()) $this->conn->rollBack();
            return ['success' => false, 'message' => 'quiz.fatalError', 'error' => $e->getMessage()];
        }
    }


    /**
     * submitQuiz payload atteso (minimo):
     * - version (string)
     * - quiz_json (array|string json)
     *
     * opzionali:
     * - quiz_uid (char(8))  <-- fondamentale per draft/upsert
     * - finalize (bool)     <-- true SOLO a conferma finale
     * - user_uid (char(8))  <-- se loggato
     * - email (string)      <-- se guest e inserisce mail
     * - meta (array)        <-- ip/user_agent/accept_language/referrer
     */
    public function submitQuiz(array $quizPayload): array
    {
        $quiz_json = $quizPayload['quiz_json'] ?? null;
        $version   = $quizPayload['version'] ?? null;

        $quiz_uid  = $quizPayload['quiz_uid'] ?? null;
        $finalize  = !empty($quizPayload['finalize']); // true solo su "Conferma"

        $user_uid  = $quizPayload['user_uid'] ?? null; // opzionale (token)
        $email     = $quizPayload['email'] ?? null;    // opzionale
        $meta      = $quizPayload['meta'] ?? null;     // opzionale

        if ($quiz_json === null || $version === null) {
            return [
                'success' => false,
                'message' => 'quiz.missingParameters',
                'error'   => 'quiz_json or version missing'
            ];
        }

        // quiz_uid OBBLIGATORIO per draft/upsert
        if (empty($quiz_uid)) {
            return [
                'success' => false,
                'message' => 'quiz.missingParameters',
                'error'   => 'quiz_uid missing (call opt=start first)'
            ];
        }

        $quiz_uid = trim((string)$quiz_uid);
        if (!$this->isValidUid8($quiz_uid)) {
            return [
                'success' => false,
                'message' => 'quiz.invalidQuizUid',
                'error'   => 'quiz_uid must be 8 alphanumeric chars'
            ];
        }

        // validazione email (se presente)
        if ($email !== null) {
            $email = trim(mb_strtolower((string)$email));
            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                return [
                    'success' => false,
                    'message' => 'quiz.invalidEmail',
                    'error'   => 'invalid email'
                ];
            }
        }

        $quiz_json_str = $this->normalizeJson($quiz_json);

        try {
            $this->conn->beginTransaction();

            $now = date('Y-m-d H:i:s');

            // 1) UPSERT DRAFT: crea/aggiorna sempre la stessa riga
            //    - completed_at SOLO se finalize
            $this->upsertQuizDraft([
                'uid' => $quiz_uid,
                'user_uid' => !empty($user_uid) ? $user_uid : null,
                'email' => $email,
                'quiz_json' => $quiz_json_str,
                'version' => $version,
                'completed_at' => $finalize ? $now : null
            ]);

            // 2) meta: inseriscila SOLO se non c'è già (evita duplicati ad ogni step)
            $this->insertMetaOnce($quiz_uid, $meta);

            // 3) Se NON finalize: fermati qui (salvataggio step-by-step)
            if (!$finalize) {
                $this->conn->commit();
                return [
                    'success' => true,
                    'message' => 'quiz.saved.draft',
                    'data' => [
                        'quiz_uid' => $quiz_uid,
                        'action' => 'stay_quiz'
                    ]
                ];
            }

            // 4) Da qui in poi: finalize = true (Conferma finale)
            //    Applichiamo la logica “account / guest” come prima, MA senza creare nuove righe
            //    (usiamo sempre la stessa uid)

            // Caso A) utente loggato
            if (!empty($user_uid)) {
                $user = $this->getUserByUid($user_uid);

                if (!$user) {
                    // token invalido => resti come guest (non bloccare)
                    $this->conn->commit();
                    return [
                        'success' => true,
                        'message' => 'quiz.ok',
                        'data' => [
                            'quiz_uid' => $quiz_uid,
                            'action' => 'stay_quiz'
                        ]
                    ];
                }

                // se già quiz=1 => discard ma tracciamento sulla stessa riga
                if ((int)$user['quiz'] === 1) {
                    $this->markDiscarded($quiz_uid, 'already_completed');

                    $this->conn->commit();
                    return [
                        'success' => true,
                        'message' => 'quiz.ok',
                        'data' => [
                            'quiz_uid' => $quiz_uid,
                            'action' => 'go_dashboard',
                            'note' => 'discarded_silent'
                        ]
                    ];
                }

                // quiz=0 => accetta e applica
                $this->markApplied($quiz_uid, $user_uid, $now);
                $this->applyQuizToUser($user_uid, $quiz_json_str);
                $this->createOrUpdatePresetsFromQuiz($user_uid, $quiz_uid, $version, $quiz_json_str);

                $this->conn->commit();
                return [
                    'success' => true,
                    'message' => 'quiz.saved.accepted',
                    'data' => [
                        'quiz_uid' => $quiz_uid,
                        'action' => 'go_dashboard'
                    ]
                ];
            }

            // Caso B) guest senza mail (finalize ma non ha messo mail): chiedi mail
            if (empty($email)) {
                $this->conn->commit();
                return [
                    'success' => true,
                    'message' => 'quiz.saved.anonymous',
                    'data' => [
                        'quiz_uid' => $quiz_uid,
                        'action' => 'ask_email'
                    ]
                ];
            }

            // Caso C) guest con email: se esiste utente, collega/applica o scarta
            $existingUser = $this->getUserByEmail($email);

            if ($existingUser) {
                // ✅ SEMPRE scartato se email appartiene già a un account
                $this->markDiscarded($quiz_uid, 'email_already_registered');

                // invio mail: "account già presente"
                $frontend = rtrim((string)Auth_Frontend::Origin, '/');
                if ($frontend === '') {
                    throw new RuntimeException('FRONTEND_ORIGIN not configured');
                }
                $loginLink = $frontend . '/login?email=' . urlencode($email);

                $this->sendQuizEmail('quiz_existing_account', $email, [
                    'email' => $email,
                    'login_link' => $loginLink,
                    'support_email' => 'supporto@vcf.it',
                    'company' => 'VCF',
                    'home_url' => $frontend . '/login',
                ]);

                $this->conn->commit();
                return [
                    'success' => true,
                    'message' => 'quiz.ok',
                    'data' => [
                        'quiz_uid' => $quiz_uid,
                        'action' => 'email_sent',
                        'note' => 'discarded_existing_account'
                    ]
                ];
            }


            // email non esiste => invia mail per completare registrazione
            $frontend = rtrim((string)Auth_Frontend::Origin, '/');
            if ($frontend === '') {
                throw new RuntimeException('FRONTEND_ORIGIN not configured');
            }

            // ✅ per ora: link semplice che precompila email (poi lo renderai tokenizzato)
            $signupLink = $frontend . '/signup?email=' . urlencode($email);

            $this->sendQuizEmail('quiz_signup_link', $email, [
                'email' => $email,
                'signup_link' => $signupLink,
                'support_email' => 'supporto@vcf.it',
                'company' => 'VCF',
                'home_url' => $frontend . '/login',
            ]);

            $this->conn->commit();
            return [
                'success' => true,
                'message' => 'quiz.ok',
                'data' => [
                    'quiz_uid' => $quiz_uid,
                    'action' => 'email_sent'
                ]
            ];
        } catch (Exception $e) {
            if ($this->conn->inTransaction()) {
                $this->conn->rollBack();
            }
            return [
                'success' => false,
                'message' => 'quiz.fatalError',
                'error' => $e->getMessage()
            ];
        }
    }

    public function findLatestCompletedGuestQuizByEmail(string $email): ?array
    {
        $email = trim(mb_strtolower($email));
        if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return null;
        }

        $stmt = $this->conn->prepare("
        SELECT uid, version, quiz_json, completed_at, updated_at
        FROM data_quiz
        WHERE email = :email
          AND completed_at IS NOT NULL
          AND applied_to_user_uid IS NULL
          AND discarded_at IS NULL
        ORDER BY completed_at DESC, updated_at DESC
        LIMIT 1
    ");
        $stmt->execute(['email' => $email]);

        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    public function applyQuizToUserFromQuizUid(string $quiz_uid, string $user_uid): bool
    {
        $quiz_uid = trim((string)$quiz_uid);
        $user_uid = trim((string)$user_uid);

        if ($quiz_uid === '' || $user_uid === '') return false;

        // 1) marca quiz come applicato (idempotente)
        $stmt = $this->conn->prepare("
            UPDATE data_quiz
            SET applied_to_user_uid = :user_uid,
                applied_at = NOW()
            WHERE uid = :quiz_uid
            AND applied_to_user_uid IS NULL
            LIMIT 1
        ");
        $stmt->execute([
            'user_uid' => $user_uid,
            'quiz_uid' => $quiz_uid,
        ]);

        // Se non ha aggiornato nulla, potrebbe essere già stato applicato (o uid errata)
        // In ogni caso, proseguiamo a settare quiz=1 per coerenza SOLO se il quiz esiste.
        $stmtCheck = $this->conn->prepare("
            SELECT uid
            FROM data_quiz
            WHERE uid = :quiz_uid
            LIMIT 1
        ");
        $stmtCheck->execute(['quiz_uid' => $quiz_uid]);
        if (!$stmtCheck->fetchColumn()) {
            return false;
        }

        // 2) segna utente quiz=1
        $stmt2 = $this->conn->prepare("
            UPDATE acl_users
            SET quiz = 1
            WHERE user_uid = :user_uid
            LIMIT 1
        ");
        $stmt2->execute(['user_uid' => $user_uid]);

        return true;
    }

    /**
     * Crea/aggiorna data_presets a partire da un quiz_uid già salvato.
     * Usalo nel flow "guest -> signup" (dove hai quiz_uid ma non sei dentro submitQuiz()).
     */
    public function createOrUpdatePresetsFromQuizUid(string $user_uid, string $quiz_uid): void
    {
        $user_uid = trim((string)$user_uid);
        $quiz_uid = trim((string)$quiz_uid);

        if ($user_uid === '' || $quiz_uid === '') {
            throw new Exception('missing user_uid or quiz_uid');
        }

        // prendo version + quiz_json dal DB
        $row = $this->getQuizForPresetsByUid($quiz_uid);
        if (!$row) {
            throw new Exception("quiz not found for presets: {$quiz_uid}");
        }

        $quiz_version = (string)$row['version'];
        $quiz_json_str = (string)$row['quiz_json'];

        // riuso la stessa logica già usata nel ramo loggato
        $this->createOrUpdatePresetsFromQuiz($user_uid, $quiz_uid, $quiz_version, $quiz_json_str);
    }

    /**
     * Query minimale per recuperare il quiz da cui generare i presets.
     */
    private function getQuizForPresetsByUid(string $quiz_uid): ?array
    {
        $stmt = $this->conn->prepare("
            SELECT uid, version, quiz_json
            FROM data_quiz
            WHERE uid = :uid
            LIMIT 1
        ");
        $stmt->execute(['uid' => $quiz_uid]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }


    /* ===========================
       DB operations (PATCH)
       =========================== */

    /**
     * UPSERT "draft": stessa riga per tutta la sessione quiz.
     * - Se esiste: aggiorna quiz_json/version/user_uid/email/updated_at e (se finalize) completed_at
     * - Se non esiste: inserisce nuova riga
     */
    private function upsertQuizDraft(array $d): void
    {
        $uid = $d['uid'];
        $now = date('Y-m-d H:i:s');

        $existing = $this->getQuizRowByUid($uid);

        if ($existing) {
            // merge: non sovrascrivere email/user_uid con null se già presenti
            $newUserUid = $d['user_uid'] ?? null;
            $newEmail   = $d['email'] ?? null;

            $user_uid = $newUserUid ?: ($existing['user_uid'] ?? null);
            $email    = $newEmail   ?: ($existing['email'] ?? null);

            // completed_at: se già settato non lo tocchiamo; se finalize e null -> set
            $completed_at = $existing['completed_at'] ?? null;
            if ($completed_at === null && !empty($d['completed_at'])) {
                $completed_at = $d['completed_at'];
            }

            $stmt = $this->conn->prepare("
                UPDATE data_quiz
                SET
                    user_uid = :user_uid,
                    email = :email,
                    quiz_json = :quiz_json,
                    version = :version,
                    updated_at = :updated_at,
                    completed_at = :completed_at
                WHERE uid = :uid
                LIMIT 1
            ");
            $stmt->execute([
                'uid' => $uid,
                'user_uid' => $user_uid,
                'email' => $email,
                'quiz_json' => $d['quiz_json'],
                'version' => $d['version'],
                'updated_at' => $now,
                'completed_at' => $completed_at
            ]);
            return;
        }

        // insert new
        $stmt = $this->conn->prepare("
            INSERT INTO data_quiz (
                uid, user_uid, email, quiz_json, version,
                created_at, updated_at,
                completed_at,
                applied_to_user_uid, applied_at,
                discarded_at, discard_reason
            )
            VALUES (
                :uid, :user_uid, :email, :quiz_json, :version,
                :created_at, :updated_at,
                :completed_at,
                NULL, NULL,
                NULL, NULL
            )
        ");
        $stmt->execute([
            'uid' => $uid,
            'user_uid' => $d['user_uid'],
            'email' => $d['email'],
            'quiz_json' => $d['quiz_json'],
            'version' => $d['version'],
            'created_at' => $now,
            'updated_at' => $now,
            'completed_at' => $d['completed_at']
        ]);
    }

    private function markApplied(string $quiz_uid, string $applied_to_user_uid, string $applied_at): void
    {
        $stmt = $this->conn->prepare("
            UPDATE data_quiz
            SET
                applied_to_user_uid = :applied_to_user_uid,
                applied_at = :applied_at,
                updated_at = :updated_at
            WHERE uid = :uid
            LIMIT 1
        ");
        $stmt->execute([
            'uid' => $quiz_uid,
            'applied_to_user_uid' => $applied_to_user_uid,
            'applied_at' => $applied_at,
            'updated_at' => date('Y-m-d H:i:s')
        ]);
    }

    private function markDiscarded(string $quiz_uid, string $reason): void
    {
        $now = date('Y-m-d H:i:s');
        $stmt = $this->conn->prepare("
            UPDATE data_quiz
            SET
                discarded_at = :discarded_at,
                discard_reason = :discard_reason,
                updated_at = :updated_at
            WHERE uid = :uid
            LIMIT 1
        ");
        $stmt->execute([
            'uid' => $quiz_uid,
            'discarded_at' => $now,
            'discard_reason' => $reason,
            'updated_at' => $now
        ]);
    }

    private function getQuizRowByUid(string $uid): ?array
    {
        $stmt = $this->conn->prepare("
            SELECT uid, user_uid, email, completed_at
            FROM data_quiz
            WHERE uid = :uid
            LIMIT 1
        ");
        $stmt->execute(['uid' => $uid]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    /**
     * Meta: inserisci una sola volta per quiz_uid (evita duplicati step-by-step).
     */
    private function insertMetaOnce(string $quiz_uid, $meta): void
    {
        if (!$meta || !is_array($meta)) return;

        $stmt = $this->conn->prepare("
            SELECT 1
            FROM data_quiz_meta
            WHERE quiz_uid = :quiz_uid
            LIMIT 1
        ");
        $stmt->execute(['quiz_uid' => $quiz_uid]);
        if ($stmt->fetchColumn()) {
            return; // già presente
        }

        $this->insertMeta($quiz_uid, $meta);
    }

    /**
     * (invariata) Salva meta in tabella separata (data_quiz_meta).
     */
    private function insertMeta(string $quiz_uid, $meta): void
    {
        if (!$meta || !is_array($meta)) return;

        $uid = $this->genUid8();

        $ip = $meta['ip'] ?? null;
        $user_agent = $meta['user_agent'] ?? null;
        $accept_language = $meta['accept_language'] ?? null;
        $referrer = $meta['referrer'] ?? null;

        $ip_hash = null;
        if (!empty($ip)) {
            $ip_hash = $this->hashIp($ip);
        }

        $stmt = $this->conn->prepare("
            INSERT INTO data_quiz_meta (
                uid, quiz_uid, ip_hash, user_agent, accept_language, referrer
            ) VALUES (
                :uid, :quiz_uid, :ip_hash, :user_agent, :accept_language, :referrer
            )
        ");

        $stmt->execute([
            'uid' => $uid,
            'quiz_uid' => $quiz_uid,
            'ip_hash' => $ip_hash,
            'user_agent' => $user_agent ? mb_substr($user_agent, 0, 255) : null,
            'accept_language' => $accept_language ? mb_substr($accept_language, 0, 32) : null,
            'referrer' => $referrer ? mb_substr($referrer, 0, 255) : null
        ]);
    }

    /**
     * (invariata) Aggiorna utente: quiz=1 (+ mapping futuro).
     */
    private function applyQuizToUser(string $user_uid, string $quiz_json_str): void
    {
        $stmt = $this->conn->prepare("
            UPDATE acl_users
            SET quiz = 1
            WHERE user_uid = :user_uid
        ");
        $stmt->execute(['user_uid' => $user_uid]);

        // mapping futuro...
    }

    private function getUserByUid(string $user_uid): ?array
    {
        $stmt = $this->conn->prepare("
            SELECT user_uid, email, quiz
            FROM acl_users
            WHERE user_uid = :user_uid
            LIMIT 1
        ");
        $stmt->execute(['user_uid' => $user_uid]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    private function getUserByEmail(string $email): ?array
    {
        $stmt = $this->conn->prepare("
            SELECT user_uid, email, quiz
            FROM acl_users
            WHERE email = :email
            LIMIT 1
        ");
        $stmt->execute(['email' => $email]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    /* ===========================
       Utils
       =========================== */

    private function normalizeJson($value): string
    {
        if (is_string($value)) {
            json_decode($value, true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                throw new Exception("quiz_json is not valid json string");
            }
            return $value;
        }

        if (is_array($value) || is_object($value)) {
            $enc = json_encode($value, JSON_UNESCAPED_UNICODE);
            if ($enc === false) throw new Exception("quiz_json encode failed");
            return $enc;
        }

        throw new Exception("quiz_json invalid type");
    }

    private function isValidUid8(string $uid): bool
    {
        return (bool)preg_match('/^[A-Za-z0-9]{8}$/', $uid);
    }

    private function genUid8(): string
    {
        $chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        $out = '';
        for ($i = 0; $i < 8; $i++) {
            $out .= $chars[random_int(0, strlen($chars) - 1)];
        }
        return $out;
    }

    private function hashIp(string $ip): string
    {
        $salt = getenv('QUIZ_IP_SALT');
        if (!$salt) $salt = 'CHANGE_ME_SALT';
        return hash('sha256', $salt . '|' . $ip);
    }

    private function generateQuizUID(string $tableName, string $columnName, int $len = 8): string
    {
        if (!preg_match('/^[A-Za-z0-9_]+$/', $tableName) || !preg_match('/^[A-Za-z0-9_]+$/', $columnName)) {
            throw new Exception("Invalid identifier");
        }

        $sqlCheck = sprintf("SELECT COUNT(*) FROM `%s` WHERE `%s` = ?", $tableName, $columnName);
        $stmtCheck = $this->conn->prepare($sqlCheck);

        $characters = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
        $max = strlen($characters) - 1;

        do {
            $uid = '';
            for ($i = 0; $i < $len; $i++) $uid .= $characters[random_int(0, $max)];
            $stmtCheck->execute([$uid]);
            $count = (int)$stmtCheck->fetchColumn();
        } while ($count > 0);

        return $uid;
    }

    private function sendQuizEmail(string $templateName, string $email, array $data): void
    {
        $smtp = new smtpObj();
        $html = templatesObj::render('', $templateName, '', $data);
        $subject = templatesObj::resolveSubject('', $templateName, $data);
        $smtp->sendMail($email, $subject, $html);
    }

    private function createOrUpdatePresetsFromQuiz(string $user_uid, string $quiz_uid, string $quiz_version, string $quiz_json_str): void
    {
        // 1) decode quiz_json
        $quizArr = json_decode($quiz_json_str, true);
        if (!is_array($quizArr)) $quizArr = [];

        // 2) preset_json (minimal per ora)
        // poi qui ci metti la logica di calcolo vera
        $preset = [
            'source' => 'quiz',
            'generated_at' => date('c'),
            'answers' => $quizArr['answers'] ?? [],
        ];

        // 3) UPSERT su data_presets
        $resp = $this->presetsMgr->upsertPreset($user_uid, $quiz_uid, $quiz_version, $preset);

        // se vuoi essere "hard-fail" (consigliato): se non riesce, fai rollback di tutto
        if (empty($resp['success'])) {
            throw new Exception($resp['error'] ?? 'preset upsert failed');
        }
    }
}
