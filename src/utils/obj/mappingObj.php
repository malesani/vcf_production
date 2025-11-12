<?php

require_once("{$_SERVER['DOCUMENT_ROOT']}/auth/obj/authManager.php");
require_once("{$_SERVER['DOCUMENT_ROOT']}/auth/obj/permsManager.php");

/**
 * Base class for util_map lookups: holds DB connection and lookup logic.
 */
class UtilMapBase {
    protected authManager  $authManager;
    protected permsManager $permsManager;
    protected PDO          $conn;

    public function __construct(authManager $authManager, permsManager $permsManager) {
        $this->authManager  = $authManager;
        $this->permsManager = $permsManager;
        $this->conn         = $this->authManager->get_dbConn();
    }
}

/**
 * Retrieves a mapping of values to labels from util_map table.
 */
class MappingObj extends UtilMapBase {
    /**
     * Fetches value => label pairs for given type and key.
     *
     * @param string $mapType  The type (e.g. 'contracts', 'procedures').
     * @param string $mapKey   The key (e.g. 'status', 'type').
     * @return array<int,string>  Associative array: [value => label].
     * @throws Exception if parameters missing or DB errors.
     */
    public function getMapping(string $mapType, string $mapKey): array {
        if (empty($mapType) || empty($mapKey)) {
            throw new Exception("Missing required parameters: type and key");
        }

        $sql = "
            SELECT `value`, `label`
              FROM `util_map`
             WHERE `type` = :type
               AND `key`  = :key
        ";

        $stmt = $this->conn->prepare($sql);
        $stmt->bindValue(':type', $mapType, PDO::PARAM_STR);
        $stmt->bindValue(':key',  $mapKey,  PDO::PARAM_STR);
        $stmt->execute();

        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $mapping = [];
        foreach ($rows as $row) {
            $mapping[(string)$row['value']] = $row['label'];
        }

        return $mapping;
    }

    /**
     * Helper to get a single label by value, falling back to the raw value as string.
     *
     * @param string $mapType
     * @param string $mapKey
     * @param int    $value
     * @return string
     */
    public function getLabel(string $mapType, string $mapKey, int $value): string {
        $map = $this->getMapping($mapType, $mapKey);
        return $map[$value] ?? (string)$value;
    }
}
