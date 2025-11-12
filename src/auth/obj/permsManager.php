<?php

require_once("{$_SERVER['DOCUMENT_ROOT']}/auth/obj/authManager.php");

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

class permsManager
{
    private $authManager;
    private $conn;

    private $user_data;

    private $subRole_permGroups = [];
    private $subRole_permissions = [];

    private $permGroups_info = [];
    private $permissions_info = [];

    public function __construct(authManager $authManager)
    {
        $this->authManager = $authManager;
        $this->conn = $this->authManager->get_dbConn();

        if ($this->authManager->check_isServiceLoaded()) {
            $this->user_data = [];
            $this->subRole_permGroups = [];
            $this->permGroups_info = [];


            $this->subRole_permissions = [];
            $this->permissions_info = [];
        } else {
            $this->authManager->check_isProfileLoaded();

            $this->user_data = $this->authManager->get_userData();

            $this->subRole_permGroups = $this->load_subRolePermGroups($this->user_data['subRole_uid']);
            $this->permGroups_info = $this->load_permGroupsInfo($this->subRole_permGroups);


            $this->subRole_permissions = $this->load_subRolePermissions($this->user_data['subRole_uid']);
            $this->permissions_info = $this->load_permissionsInfo($this->permGroups_info, $this->subRole_permissions);
        }
    }

    // LOAD PERMISSIONS BY ACTIVE SUBROLE
    // LOAD SUBROLE'S PERMISSIONS GROUPS [ string, ... ] By active SUBROLE_UID
    private function load_subRolePermGroups($subRole_uid)
    {

        $stmt = $this->conn->prepare("SELECT subRole_uid, GROUP_CONCAT(permGroup_uid) AS permGroup_uids
                FROM acl_subRoles_permGroup
                WHERE subRole_uid = :subRole_uid GROUP BY subRole_uid;");

        $stmt->execute(["subRole_uid" => $subRole_uid]);

        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? explode(',', $row['permGroup_uids']) : [];
    }

    // LOAD SUBROLE'S PERMISSIONS [ permission_uid => [...], ... ] By active SUBROLE_UID
    private function load_subRolePermissions($subRole_uid)
    {
        $subRolePermissions = [];

        $stmt = $this->conn->prepare("SELECT * FROM acl_subRoles_permissions
                WHERE subRole_uid = :subRole_uid;");

        $stmt->execute(["subRole_uid" => $subRole_uid]);

        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($rows as $row) {
            $subRolePermissions[$row['permission_uid']] = $row;
        }

        return $subRolePermissions;
    }
    // end

    private function load_permGroupsInfo($subRole_permGroups)
    {

        if (empty($subRole_permGroups)) {
            return [];
        }

        $placeholders = implode(',', array_fill(0, count($subRole_permGroups), '?'));

        $sql = "SELECT * FROM acl_permissionGroups WHERE permGroup_uid IN ($placeholders)";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute($subRole_permGroups);

        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $permGroupsInfo = [];

        foreach ($rows as $row) {
            $permGroupsInfo[$row['permGroup_uid']] = $row;
        }

        $permGroupsInfo = $this->check_toEnablePermGroups($permGroupsInfo);
        $permGroupsInfo = $this->check_paywalledPermGroups($permGroupsInfo);

        return $permGroupsInfo;
    }

    private function load_permissionsInfo($permGroups_info, $subRole_permissions)
    {
        $permissionsInfo = [];

        // GET all permissions by active permission groups
        if (!empty($permGroups_info)) {
            $valid_permGroupUIDs = array_keys($permGroups_info);
            $placeholders = rtrim(str_repeat('?,', count($valid_permGroupUIDs)), ',');
            $sql = "
                SELECT p.*
                FROM acl_map_permGroups_permissions AS m
                JOIN acl_permissions AS p
                  ON p.permission_uid = m.permission_uid
                WHERE m.permGroup_uid IN ($placeholders)
            ";
            $stmt = $this->conn->prepare($sql);
            $stmt->execute($valid_permGroupUIDs);

            while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                $permissionsInfo[$row['permission_uid']] = $row;
            }
        }

        // GET permissionsInfo by subRole_permissions (dict with permissions_uid and allowed = 0/1 => if 0 removed if present, if 1 added if not present in permissionsInfo)
        foreach ($subRole_permissions as $permission_uid => $subRole_permission) {
            $stmt = $this->conn->prepare("SELECT * FROM acl_permissions
            WHERE permission_uid = :permission_uid;");

            $stmt->execute(["permission_uid" => $permission_uid]);

            $row = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($subRole_permission['allowed'] == 1) {
                $permissionsInfo[$permission_uid] = $row;
            } else {
                if (isset($permissionsInfo[$permission_uid])) {
                    unset($permissionsInfo[$permission_uid]);
                }
            }
        }

        return $permissionsInfo;
    }

    private function check_toEnablePermGroups($permGroupsInfo)
    {
        if (        // Only SUPERADMIN && ADMIN
            (int)($this->user_data['role_uid'] ?? -2) === -1 &&
            (int)($this->user_data['role_uid'] ?? -2) === 0
        ) {
            return $permGroupsInfo;
        }

        // Raccogli gli UID dei gruppi da controllare
        $toEnableUids = [];
        foreach ($permGroupsInfo as $uid => $info) {
            if ((int)($info['toEnable'] ?? 0) === 1) {
                $toEnableUids[] = $uid;
            }
        }

        // Se non ce ne sono, restituisci subito
        if (empty($toEnableUids)) {
            return $permGroupsInfo;
        }

        // Prepara la query per recuperare solo i permGroup effettivamente abilitati per azienda/utente
        $placeholders = implode(',', array_fill(0, count($toEnableUids), '?'));
        $sql = "SELECT permGroup_uid
            FROM acl_enable_companies_users_permGroups
            WHERE company_uid = ?
            AND user_uid = ?
            AND permGroup_uid IN ($placeholders)
        ";
        $stmt = $this->conn->prepare($sql);

        // Parametri: company_uid, user_uid, poi tutti i permGroup_uid da testare
        $params = array_merge(
            [
                $this->user_data['company_uid'],
                $this->user_data['user_uid']
            ],
            $toEnableUids
        );

        $stmt->execute($params);
        $enabled = $stmt->fetchAll(PDO::FETCH_COLUMN); // array di permGroup_uid abilitati

        // Filtra $permGroupsInfo: per i gruppi con toEnable=1, rimuovi quelli NON presenti in $enabled
        foreach ($permGroupsInfo as $uid => $info) {
            if (((int)($info['toEnable'] ?? 0) === 1) && !in_array($uid, $enabled, true)) {
                unset($permGroupsInfo[$uid]);
            }
        }

        return $permGroupsInfo;
    }

    public function set_toEnablepermGroup(string $user_uid, string $permGroup_uid): array
    {
        if (        // Only SUPERADMIN && ADMIN
            (int)($this->user_data['role_uid'] ?? -2) === -1 &&
            (int)($this->user_data['role_uid'] ?? -2) === 0
        ) {
            return [
                'success' => false,
                'message' => 'enablePermGroup.notAllowed',
                'error'   => "YOU ARE NOT ALLOWED TO ENABLE PERMISSIONS.",
            ];
        }

        $sql = "INSERT INTO acl_enable_companies_users_permGroups
                (company_uid, user_uid, permGroup_uid)
            VALUES
                (:company_uid, :user_uid, :permGroup_uid)
            ON DUPLICATE KEY UPDATE
                updated_at = NOW()";

        $params = [
            "company_uid" => $this->user_data['company_uid'],
            "user_uid" => $user_uid,
            "permGroup_uid" => $permGroup_uid
        ];

        try {
            $stmt = $this->conn->prepare($sql);
            $stmt->execute($params);

            // rowCount(): 1 = insert; 2 = duplicate‐key + update; 0 = update no‐op (mai qui, perché il campo viene "aggiornato" a se stesso)
            $count = $stmt->rowCount();

            return [
                'success' => true,
                'message' => $count === 1
                    ? 'enablePermGroup.inserted'
                    : 'enablePermGroup.updated',
            ];
        } catch (\PDOException $e) {
            return [
                'success' => false,
                'message' => 'enablePermGroup.fatalError',
                'error'   => $e->getMessage(),
            ];
        }
    }

    // Filter by plans
    private function check_paywalledPermGroups($permGroupsInfo)
    {
        if (        // Only SUPERADMIN
            (int)($this->user_data['role_uid'] ?? -2) === -1
        ) {
            return $permGroupsInfo;
        }

        // Raccogli gli UID dei gruppi da controllare
        $paywalledUids = [];
        foreach ($permGroupsInfo as $uid => $info) {
            if ((int)($info['paywalled'] ?? 0) === 1) {
                $paywalledUids[] = $uid;
            }
        }

        // Se non ce ne sono, restituisci subito
        if (empty($paywalledUids)) {
            return $permGroupsInfo;
        }

        // Prepara la query per recuperare solo i permGroup effettivamente abilitati per azienda/utente
        $placeholders = implode(',', array_fill(0, count($paywalledUids), '?'));
        $sql = "SELECT permGroup_uid
            FROM acl_enable_plans_permGroups
            WHERE plan_uid = ? AND permGroup_uid IN ($placeholders)
        ";
        $stmt = $this->conn->prepare($sql);

        // Parametri: plan_uid, poi tutti i permGroup_uid da testare
        $params = array_merge(
            ["IMPOSTA_PLAN_UID"],
            $paywalledUids
        );

        $stmt->execute($params);
        $enabled = $stmt->fetchAll(PDO::FETCH_COLUMN); // array di permGroup_uid abilitati

        // Filtra $permGroupsInfo: per i gruppi con paywalledUids=1, rimuovi quelli NON presenti in $enabled
        foreach ($permGroupsInfo as $uid => $info) {
            if (((int)($info['paywalled'] ?? 0) === 1) && !in_array($uid, $enabled, true)) {
                unset($permGroupsInfo[$uid]);
            }
        }

        return $permGroupsInfo;
    }


    // GET PERMISSIONS BY ACTIVE SUBROLE
    // GET SUBROLE PERMISSIONS GROUPS [ string, ... ] loaded
    public function get_subRolePermGroups()
    {
        return $this->subRole_permGroups;
    }

    // GET SUBROLE PERMISSIONS [ permission_uid => [...] , ... ] loaded
    public function get_subRolePermissions()
    {
        return $this->subRole_permissions;
    }

    // GET PERMISSIONS GROUPS INFO loaded
    public function get_permGroupsInfo()
    {
        return $this->permGroups_info;
    }

    // GET PERMISSIONS INFO loaded
    public function get_permissionsInfo()
    {
        return $this->permissions_info;
    }

    /**
     * Restituisce i dati pronti per l'API permContext
     * @return array {
     *   @type array permGroupsInfo   Array di gruppi: ['key'=>'…', 'isValid'=>bool, 'paywalled'=>bool]
     *   @type array permissionsInfo  Array di permessi: ['key'=>'…', 'isValid'=>bool, 'paywalled'=>bool]
     * }
     */
    public function get_permContextData(): array
    {
        $groups = $this->permGroups_info;    // [ permGroup_uid => rowData, … ]
        $perms  = $this->permissions_info;   // [ permission_uid => rowData, … ]

        // Mappo i gruppi
        $outGroups = [];
        foreach ($groups as $uid => $info) {
            $outGroups[] = [
                'key'       => $uid,
                'isValid'   => true,                           // se è qui, è valido
                'paywalled' => (bool)($info['paywalled'] ?? 0),
            ];
        }

        // Mappo i permessi
        $outPerms = [];
        foreach ($perms as $uid => $info) {
            $outPerms[] = [
                'key'       => $uid,
                'isValid'   => true
            ];
        }

        // Ritorno l’array completo
        return [
            'permGroupsInfo'   => $outGroups,
            'permissionsInfo'  => $outPerms,
        ];
    }
    // end

    // handle per verificare la presenza di un permesso o gruppo.
    function hasPerm(string $perm_uid): bool
    {
        return isset($this->permissions_info[$perm_uid]);
    }

    function hasPermGroup(string $permGroup_uid): bool
    {
        return isset($this->permGroups_info[$permGroup_uid]);
    }
}
