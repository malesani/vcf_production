<?php
$srcPath = $_SERVER["DOCUMENT_ROOT"];
if ($srcPath == "") $srcPath = "/var/www/html";

require_once("$srcPath/auth/obj/authManager.php");
require_once("$srcPath/auth/obj/signupManager.php");
require_once("$srcPath/auth/obj/permsManager.php");
require_once("$srcPath/auth/obj/JwtService.php");

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);


class custTeamMemberBase {
    protected authManager $authManager;
    protected permsManager $permsManager;
    protected PDO         $conn;
    protected array      $user_data;
    protected string      $company_uid;

    protected const ALL_FIELDS = [
        'teamMember_uid',
        'customer_uid',
        'first_name',
        'last_name',
        'email',
        'phone',
        'user_uid',
        'teamRole_uid'	
    ];
    protected const REQUIRED_FIELDS = [
        'first_name',
        'last_name',
        'email',
        'teamRole_uid'	
    ];

    protected string $customer_uid;


    public function __construct(authManager $authManager, permsManager $permsManager, string $customer_uid) {
        $this->authManager  = $authManager;
        $this->permsManager = $permsManager;
        $this->conn         = $this->authManager->get_dbConn();
        $this->conn->setAttribute(PDO::ATTR_EMULATE_PREPARES, true);
        $this->conn->setAttribute(PDO::ATTR_ERRMODE,        PDO::ERRMODE_EXCEPTION);

        $this->user_data = $this->authManager->get_userData();
        $this->company_uid = $this->user_data['company_uid'];

        $this->customer_uid = $customer_uid;
    }

    public function get_allFields(): array {
        return self::ALL_FIELDS;
    }
    public function get_requiredFields(): array {
        return self::REQUIRED_FIELDS;
    }
}

class custTeamMember extends custTeamMemberBase {
    private ?string $teamMember_uid;
    private array   $teamMember_info = [];
    private bool $isLoaded = false;

    public function __construct(
        authManager $authManager,
        permsManager $permsManager,
        string $customer_uid,
        ?string $teamMember_uid = null
    ) {
        parent::__construct($authManager, $permsManager, $customer_uid);
        $this->teamMember_uid = $teamMember_uid;
        if ($this->teamMember_uid) {
            $this->teamMember_info = $this->load_teamMemberInfo();
        }
    }

    private function load_teamMemberInfo(): array {
        $cols = implode(', ', array_map(fn($f) => "`$f`", self::ALL_FIELDS));
        $sql  = "SELECT $cols 
                   FROM customer_teams 
                  WHERE company_uid = :company_uid 
                    AND customer_uid = :customer_uid
                    AND teamMember_uid = :teamMember_uid;";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([
            'company_uid'  => $this->company_uid,
            'customer_uid' => $this->customer_uid,
            'teamMember_uid' => $this->teamMember_uid
        ]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            throw new Exception("Team member not found: customer_uid={$this->customer_uid} | teamMember_uid={$this->teamMember_uid}");
        }
        $this->isLoaded = true;
        return $row;
    }
   
    public function set_teamMemberInfo(array $newData): array {
        // 1) verifica required
        $missing = array_diff(self::REQUIRED_FIELDS, array_keys($newData));
        if (!empty($missing)) {
            return [
                'success' => false,
                'message' => 'teamMember.missingInfo',
                'error'   => 'Missing required fields: ' . implode(', ', $missing),
            ];
        }

        // 2) prendo solo i campi validi (no customer_uid ne teamMember_uid)
        $fieldsToUpdate = array_intersect(
            array_keys($newData),
            array_diff(self::ALL_FIELDS, ['customer_uid', 'teamMember_uid'])
        );
        if (empty($fieldsToUpdate)) {
            return [
                'success' => false,
                'message' => 'teamMember.noFieldsToUpdate',
                'error'   => 'No updatable fields provided',
            ];
        }

        // 3) costruisco SET e params
        $setParts = [];
        $params   = [];
        foreach ($fieldsToUpdate as $f) {
            $setParts[]   = "`$f` = :$f";
            $params[$f]   = $newData[$f];
        }
        $params['company_uid'] = $this->user_data['company_uid'];
        $params['customer_uid'] = $this->customer_uid;
        $params['teamMember_uid'] = $this->teamMember_uid;

        $sql = sprintf(
            "UPDATE `customer_teams` SET %s WHERE `company_uid` = :company_uid AND `customer_uid` = :customer_uid AND teamMember_uid = :teamMember_uid;",
            implode(', ', $setParts)
        );

        try {
            $stmt = $this->conn->prepare($sql);
            $stmt->execute($params);
            // aggiorno interno
            foreach ($fieldsToUpdate as $f) {
                $this->teamMember_info[$f] = $newData[$f];
            }
            return ['success' => true, 'message' => 'teamMember.infoUpdated'];
        } catch (PDOException $e) {
            return [
                'success' => false,
                'message' => 'teamMember.fatalError',
                'error'   => $e->getMessage(),
            ];
        }
    }

    public function insert_teamMemberInfo(array $newData): array {
        // 1) verifica required
        $missing = array_diff(self::REQUIRED_FIELDS, array_keys($newData));
        if (!empty($missing)) {
            return [
                'success' => false,
                'message' => 'teamMember.missingInfo',
                'error'   => 'Missing required fields: ' . implode(', ', $missing),
            ];
        }

        if (!empty($newData['email'])) {
            $check = $this->conn->prepare("
                SELECT COUNT(*) 
                  FROM `customer_teams`
                 WHERE company_uid  = :company_uid
                   AND customer_uid = :customer_uid
                   AND email        = :email
            ");
            $check->execute([
                'company_uid'  => $this->company_uid,
                'customer_uid' => $this->customer_uid,
                'email'        => $newData['email'],
            ]);
            if ((int)$check->fetchColumn() > 0) {
                return [
                    'success' => false,
                    'message' => 'teamMember.emailExists',
                    'error'   => 'Email already in use for this customer',
                ];
            }
        }

        try {
            // 2) nuovo UID
            $new_uid = $this->authManager->generateUniqueUID('customer_teams', 'teamMember_uid');

            // 3) filtro i soli campi validi (no customer_uid)
            $validData = array_intersect_key(
                $newData,
                array_flip(array_diff(self::ALL_FIELDS, ['customer_uid', 'teamMember_uid']))
            );

            // 4) preparo colonne + placeholder
            $fields       = array_merge(['company_uid', 'customer_uid', 'teamMember_uid'], array_keys($validData));
            $cols         = implode(', ', array_map(fn($f) => "`$f`", $fields));
            $placeholders = implode(', ', array_map(fn($f) => ":$f", $fields));

            // 5) params + execute
            $params = array_merge(['company_uid'=> $this->company_uid, 'customer_uid' => $this->customer_uid, 'teamMember_uid' => $new_uid], $validData);
            $sql    = "INSERT INTO `customer_teams` ($cols) VALUES ($placeholders);";

            $stmt = $this->conn->prepare($sql);


            if ($stmt->execute($params)) {
                // 6) agg. interno
                $this->teamMember_uid  = $new_uid;
                $this->teamMember_info = array_merge(['company_uid'=> $this->company_uid, 'customer_uid' => $this->customer_uid, 'teamMember_uid' => $this->teamMember_uid], $validData);

                return ['success' => true, 'message' => 'teamMember.infoInserted'];
            } else {
                throw new Exception("Fail to load to Db.");
            }
            
        } catch (PDOException $e) {
            return [
                'success' => false,
                'message' => 'teamMember.fatalError',
                'error'   => $e->getMessage(),
            ];
        }
    }

    public function delete_teamMemberInfo(): array {
        try {
            if (!$this->isLoaded) {
                throw new Exception("No team member load in object.");
            }

            $stmt = $this->conn->prepare("DELETE FROM customer_teams WHERE company_uid=:company_uid AND customer_uid=:customer_uid AND teamMember_uid=:teamMember_uid;");

            if ($stmt->execute([
                'company_uid'  => $this->company_uid,
                'customer_uid' => $this->customer_uid,
                'teamMember_uid' => $this->teamMember_uid
            ])) {

                return ['success' => true, 'message' => 'teamMember.recordDeleted'];
            } else {
                throw new Exception("Fail to delete in Db.");
            }
            
        } catch (PDOException $e) {
            return [
                'success' => false,
                'message' => 'teamMember.fatalError',
                'error'   => $e->getMessage(),
            ];
        }
    }

    public function generate_invitation() {

        $signupManager = new signupManager( $this->authManager );

        $required = [
            'company_uid',
            'customer_uid',
            'teamMember_uid',
            'email',
            'first_name',
            'last_name',
        ];

        $raw = [
            'company_uid'     => $this->company_uid,
            'customer_uid'    => $this->customer_uid,
            'teamMember_uid'  => $this->teamMember_uid  ?? null,
            'email'           => $this->teamMember_info['email']    ?? null,
            'first_name'      => $this->teamMember_info['first_name']?? null,
            'last_name'       => $this->teamMember_info['last_name'] ?? null,
            'phone'           => $this->teamMember_info['phone']     ?? null,
        ];

        $missing = [];
        foreach ($required as $key) {
            if (empty($raw[$key])) {
                $missing[] = $key;
            }
        }

        if (!empty($missing)) {
            return false;
        }

        $data = [
            'company_uid'       => $raw['company_uid'],
            'customer_uid'      => $raw['customer_uid'],
            'teamMember_uid'    => $raw['teamMember_uid'],
            'sendToEmail'       => $raw['email'],
            // METADATA
            'first_name' => $raw['first_name'],
            'last_name'  => $raw['last_name'],
            'email'      => $raw['email'],
            'phone'      => $raw['phone'] ?: NULL,      // se vuoto, invia NULL
        ];

        $generate_inviteRestrictedToken = $signupManager->generate_inviteRestrictedToken($data);

        if ($generate_inviteRestrictedToken['success']) {
            return [
                'success' => true, 
                'message' => $generate_inviteRestrictedToken['message'],
                'data' => $generate_inviteRestrictedToken["data"]
            ];
        } else {
            return [
                'success' => false, 
                'message' => $generate_inviteRestrictedToken['message'],
                'error' => $generate_inviteRestrictedToken['error'],
            ];
        }
    }

    public function get_teamMemberInfo(): array {
        return $this->teamMember_info;
    }
}

class custTeamMembersList extends custTeamMemberBase {

    public function __construct(
        authManager $authManager,
        permsManager $permsManager,
        string $customer_uid
    ) {
        parent::__construct($authManager, $permsManager, $customer_uid);
    }


    /**
     * @param array $filters ['search'=>string, 'city'=>string, 'province'=>string]
     * @param int   $page
     * @param int   $perPage
     * @return array{ data: array[], total: int, page: int, per_page: int }
     */
    public function get_customersList(array $filters = [], int $page = 1, int $perPage = 25): array {
        $page    = max(1, $page);
        $perPage = max(1, $perPage);
        $offset  = ($page - 1) * $perPage;

        $wheres = ['`company_uid` = :company_uid AND `customer_uid`=:customer_uid'];
        $params = ['company_uid' => $this->company_uid, 'customer_uid' => $this->customer_uid];

        if (!empty($filters['search'])) {
            $wheres[]         = '(`first_name` LIKE :search OR `last_name` LIKE :search OR `email` LIKE :search)';
            $params['search'] = "%{$filters['search']}%";
        }

        $whereSql = implode(' AND ', $wheres);
        $cols     = implode(', ', array_map(fn($f) => "`$f`", self::ALL_FIELDS));

        $sql = "
            SELECT SQL_CALC_FOUND_ROWS $cols
              FROM `customer_teams`
             WHERE $whereSql
             ORDER BY `email` ASC
             LIMIT :offset, :perPage
        ";
        $stmt = $this->conn->prepare($sql);
        foreach ($params as $k => $v) {
            $stmt->bindValue(":$k", $v);
        }
        $stmt->bindValue(':offset',  $offset,  PDO::PARAM_INT);
        $stmt->bindValue(':perPage', $perPage, PDO::PARAM_INT);
        $stmt->execute();

        $teamMembers_list  = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $total = (int)$this->conn->query("SELECT FOUND_ROWS()")->fetchColumn();

        return [
            'teamMembers_list'     => $teamMembers_list,
            'total'    => $total,
            'page'     => $page,
            'per_page' => $perPage,
        ];
    }
}

?>
