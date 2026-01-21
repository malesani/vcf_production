<?php

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

class presetsDataManager
{
    private PDO $conn;

    public function __construct(PDO $conn)
    {
        $this->conn = $conn;
    }

    /* =========================================================
       READ
       ========================================================= */

    public function getByUserAndVersion(string $user_uid, string $quiz_version): ?array
    {
        $stmt = $this->conn->prepare("
            SELECT uid, user_uid, quiz_uid, quiz_version, preset_json, created_at, updated_at
            FROM data_presets
            WHERE user_uid = :user_uid
              AND quiz_version = :quiz_version
            LIMIT 1
        ");
        $stmt->execute([
            'user_uid' => $user_uid,
            'quiz_version' => $quiz_version
        ]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    /**
     * Se quiz_version è null -> ritorna lista di presets per user (tutte le versioni)
     */
    public function listByUser(string $user_uid): array
    {
        $stmt = $this->conn->prepare("
            SELECT uid, user_uid, quiz_uid, quiz_version, preset_json, created_at, updated_at
            FROM data_presets
            WHERE user_uid = :user_uid
            ORDER BY created_at DESC
        ");
        $stmt->execute(['user_uid' => $user_uid]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    /* =========================================================
       CREATE/UPSERT (usata quando assegni quiz -> user)
       ========================================================= */

    public function upsertPreset(string $user_uid, string $quiz_uid, string $quiz_version, $preset_json): array
    {
        try {
            $user_uid = trim((string)$user_uid);
            $quiz_uid = trim((string)$quiz_uid);
            $quiz_version = trim((string)$quiz_version);

            if ($user_uid === '' || $quiz_uid === '' || $quiz_version === '') {
                return [
                    'success' => false,
                    'message' => 'presets.missingParameters',
                    'error' => 'user_uid, quiz_uid, quiz_version are required'
                ];
            }

            $preset_json_str = $this->normalizeJson($preset_json);
            $existing = $this->getByUserAndVersion($user_uid, $quiz_version);

            if ($existing) {
                $stmt = $this->conn->prepare("
                    UPDATE data_presets
                    SET
                        quiz_uid = :quiz_uid,
                        preset_json = :preset_json
                    WHERE user_uid = :user_uid
                      AND quiz_version = :quiz_version
                    LIMIT 1
                ");
                $stmt->execute([
                    'quiz_uid' => $quiz_uid,
                    'preset_json' => $preset_json_str,
                    'user_uid' => $user_uid,
                    'quiz_version' => $quiz_version,
                ]);

                return [
                    'success' => true,
                    'message' => 'presets.updated',
                    'data' => [
                        'uid' => $existing['uid'],
                        'user_uid' => $user_uid,
                        'quiz_uid' => $quiz_uid,
                        'quiz_version' => $quiz_version
                    ]
                ];
            }

            $uid = $this->generateUniqueUID('data_presets', 'uid', 25);

            $stmt = $this->conn->prepare("
                INSERT INTO data_presets (
                    uid,
                    user_uid,
                    quiz_uid,
                    quiz_version,
                    preset_json
                ) VALUES (
                    :uid,
                    :user_uid,
                    :quiz_uid,
                    :quiz_version,
                    :preset_json
                )
            ");

            $stmt->execute([
                'uid' => $uid,
                'user_uid' => $user_uid,
                'quiz_uid' => $quiz_uid,
                'quiz_version' => $quiz_version,
                'preset_json' => $preset_json_str,
            ]);

            return [
                'success' => true,
                'message' => 'presets.created',
                'data' => [
                    'uid' => $uid,
                    'user_uid' => $user_uid,
                    'quiz_uid' => $quiz_uid,
                    'quiz_version' => $quiz_version
                ]
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'presets.fatalError',
                'error' => $e->getMessage()
            ];
        }
    }

    /* =========================================================
       UPDATE (patch parziale del preset_json)
       ========================================================= */

    /**
     * Patch parziale:
     * - legge preset_json
     * - merge ricorsivo con $patch
     * - supporta delete esplicito:
     *    patch: { "__delete": ["path.to.key", "answers.step_2.age"] }
     *
     * NB: path è dot-notation.
     */
    public function patchPresetJson(string $user_uid, string $quiz_version, $patch, ?string $expected_uid = null): array
    {
        try {
            $user_uid = trim((string)$user_uid);
            $quiz_version = trim((string)$quiz_version);

            if ($user_uid === '' || $quiz_version === '') {
                return [
                    'success' => false,
                    'message' => 'presets.missingParameters',
                    'error' => 'user_uid and quiz_version are required'
                ];
            }

            if (!is_array($patch) && !is_object($patch) && !is_string($patch)) {
                return [
                    'success' => false,
                    'message' => 'presets.invalidPatch',
                    'error' => 'patch must be object/array (or json string)'
                ];
            }

            $row = $this->getByUserAndVersion($user_uid, $quiz_version);
            if (!$row) {
                return [
                    'success' => false,
                    'message' => 'presets.notFound',
                    'error' => 'preset not found for this user/version'
                ];
            }

            if ($expected_uid !== null && $expected_uid !== '' && $expected_uid !== $row['uid']) {
                return [
                    'success' => false,
                    'message' => 'presets.conflict',
                    'error' => 'uid mismatch (stale client data)'
                ];
            }

            $current = json_decode((string)$row['preset_json'], true);
            if (!is_array($current)) $current = [];

            $patchArr = $this->normalizeToArray($patch);

            // deletes
            if (isset($patchArr['__delete'])) {
                $toDelete = $patchArr['__delete'];
                unset($patchArr['__delete']);

                if (is_array($toDelete)) {
                    foreach ($toDelete as $path) {
                        if (is_string($path) && $path !== '') {
                            $this->deleteByPath($current, $path);
                        }
                    }
                }
            }

            // merge ricorsivo
            $merged = $this->recursiveMerge($current, $patchArr);

            $mergedStr = json_encode($merged, JSON_UNESCAPED_UNICODE);
            if ($mergedStr === false) {
                throw new Exception('json encode failed');
            }

            $stmt = $this->conn->prepare("
                UPDATE data_presets
                SET preset_json = :preset_json
                WHERE user_uid = :user_uid
                  AND quiz_version = :quiz_version
                LIMIT 1
            ");
            $stmt->execute([
                'preset_json' => $mergedStr,
                'user_uid' => $user_uid,
                'quiz_version' => $quiz_version,
            ]);

            return [
                'success' => true,
                'message' => 'presets.patched',
                'data' => [
                    'uid' => $row['uid'],
                    'user_uid' => $user_uid,
                    'quiz_version' => $quiz_version
                ]
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'presets.fatalError',
                'error' => $e->getMessage()
            ];
        }
    }

    /* =========================================================
       Helpers
       ========================================================= */

    private function normalizeJson($value): string
    {
        if (is_string($value)) {
            json_decode($value, true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                throw new Exception("preset_json is not valid json string");
            }
            return $value;
        }

        if (is_array($value) || is_object($value)) {
            $enc = json_encode($value, JSON_UNESCAPED_UNICODE);
            if ($enc === false) throw new Exception("preset_json encode failed");
            return $enc;
        }

        throw new Exception("preset_json invalid type");
    }

    private function normalizeToArray($value): array
    {
        if (is_string($value)) {
            $decoded = json_decode($value, true);
            if (json_last_error() !== JSON_ERROR_NONE || !is_array($decoded)) {
                throw new Exception("patch json invalid");
            }
            return $decoded;
        }

        if (is_object($value)) {
            $value = (array)$value;
        }

        if (!is_array($value)) {
            throw new Exception("patch must be array/object");
        }

        return $value;
    }

    private function recursiveMerge(array $base, array $patch): array
    {
        foreach ($patch as $k => $v) {
            if (is_array($v) && isset($base[$k]) && is_array($base[$k])) {
                $base[$k] = $this->recursiveMerge($base[$k], $v);
            } else {
                $base[$k] = $v;
            }
        }
        return $base;
    }

    private function deleteByPath(array &$arr, string $path): void
    {
        $parts = explode('.', $path);
        $ref =& $arr;

        for ($i = 0; $i < count($parts) - 1; $i++) {
            $p = $parts[$i];
            if (!is_array($ref) || !array_key_exists($p, $ref)) {
                return;
            }
            $ref =& $ref[$p];
        }

        $last = $parts[count($parts) - 1];
        if (is_array($ref) && array_key_exists($last, $ref)) {
            unset($ref[$last]);
        }
    }

    private function generateUniqueUID(string $tableName, string $columnName, int $len = 8): string
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
}
