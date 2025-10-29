<?php
require_once("{$_SERVER['DOCUMENT_ROOT']}/auth/obj/authManager.php");
require_once("{$_SERVER['DOCUMENT_ROOT']}/auth/obj/permsManager.php");

class projectObjBase {
    protected authManager $authManager;
    protected permsManager $permsManager;
    protected PDO         $conn;
    protected array       $user_data;
    protected string      $company_uid;

    protected const ALL_FIELDS = [
        'project_uid',
        'customer_uid',
        'title',
        'location',
        'start_date',
        'end_date',
        'stand'
    ];
    protected const REQUIRED_FIELDS = [
        'customer_uid',
        'title',
        'start_date',
        'end_date'
    ];

    public function __construct(authManager $authManager, permsManager $permsManager) {
        $this->authManager  = $authManager;
        $this->permsManager = $permsManager;
        $this->conn         = $this->authManager->get_dbConn();
        $this->conn->setAttribute(PDO::ATTR_EMULATE_PREPARES, true);
        $this->conn->setAttribute(PDO::ATTR_ERRMODE,        PDO::ERRMODE_EXCEPTION);

        $this->user_data    = $this->authManager->get_userData();
        $this->company_uid  = $this->user_data['company_uid'];
    }

    public function get_allFields(): array {
        return self::ALL_FIELDS;
    }
    public function get_requiredFields(): array {
        return self::REQUIRED_FIELDS;
    }
}


class projectObj extends projectObjBase {
    private ?string $project_uid;
    private array   $project_info = [];

    public function __construct(
        authManager $authManager,
        permsManager $permsManager,
        ?string $project_uid = null,
    ) {
        parent::__construct($authManager, $permsManager);
        $this->project_uid = $project_uid;
        if ($this->project_uid) {
            $this->project_info = $this->load_projectInfo();
        }
    }

    private function load_projectInfo(): array {
        $cols = implode(', ', array_map(fn($f) => "`$f`", self::ALL_FIELDS));
        $sql  = "SELECT $cols
                   FROM `projects`
                  WHERE `company_uid` = :company_uid
                    AND `project_uid` = :project_uid AND status='active';";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([
            'company_uid' => $this->company_uid,
            'project_uid' => $this->project_uid
        ]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            throw new Exception("Project not found: {$this->project_uid}");
        }
        return $row;
    }

    public function set_projectInfo(array $newData): array {
        // verifica campi obbligatori
        $missing = array_diff(self::REQUIRED_FIELDS, array_keys($newData));
        if (!empty($missing)) {
            return [
                'success' => false,
                'message' => 'project.missingInfo',
                'error'   => 'Missing required fields: ' . implode(', ', $missing),
            ];
        }
        // filtra solo campi validi (esclude project_uid)
        $fieldsToUpdate = array_intersect(
            array_keys($newData),
            array_diff(self::ALL_FIELDS, ['project_uid'])
        );
        if (empty($fieldsToUpdate)) {
            return [
                'success' => false,
                'message' => 'project.noFieldsToUpdate',
                'error'   => 'No updatable fields provided',
            ];
        }

        $setParts = [];
        $params   = [];
        foreach ($fieldsToUpdate as $f) {
            $setParts[]   = "`$f` = :$f";
            $params[$f]   = $newData[$f];
        }
        $params['company_uid'] = $this->company_uid;
        $params['project_uid'] = $this->project_uid;

        $sql = sprintf(
            "UPDATE `projects` SET %s WHERE `company_uid` = :company_uid AND `project_uid` = :project_uid",
            implode(', ', $setParts)
        );

        try {
            $stmt = $this->conn->prepare($sql);
            $stmt->execute($params);
            // aggiorna interno
            foreach ($fieldsToUpdate as $f) {
                $this->project_info[$f] = $newData[$f];
            }
            return ['success' => true, 'message' => 'project.infoUpdated'];
        } catch (PDOException $e) {
            return [
                'success' => false,
                'message' => 'project.fatalError',
                'error'   => $e->getMessage(),
            ];
        }
    }

    public function insert_projectInfo(array $newData): array {
        // verifica campi obbligatori
        $missing = array_diff(self::REQUIRED_FIELDS, array_keys($newData));
        if (!empty($missing)) {
            return [
                'success' => false,
                'message' => 'project.missingInfo',
                'error'   => 'Missing required fields: ' . implode(', ', $missing),
            ];
        }

        try {
            // nuovo UID
            $new_uid = $this->authManager->generateUniqueUID('projects', 'project_uid');

            // filtra solo campi validi
            $validData = array_intersect_key(
                $newData,
                array_flip(array_diff(self::ALL_FIELDS, ['project_uid']))
            );

            // prepara colonne e placeholder
            $fields       = array_merge(['company_uid', 'project_uid'], array_keys($validData));
            $cols         = implode(', ', array_map(fn($f) => "`$f`", $fields));
            $placeholders = implode(', ', array_map(fn($f) => ":$f", $fields));

            // params ed esecuzione
            $params = array_merge(
                ['company_uid'=> $this->company_uid, 'project_uid' => $new_uid],
                $validData
            );
            $sql    = "INSERT INTO `projects` ($cols, status) VALUES ($placeholders, 'active');";

            $stmt = $this->conn->prepare($sql);
            $stmt->execute($params);

            // aggiorna interno
            $this->project_uid  = $new_uid;
            $this->project_info = array_merge(
                ['company_uid'=> $this->company_uid, 'project_uid' => $new_uid],
                $validData
            );

            return ['success' => true, 'message' => 'project.infoInserted'];
        } catch (PDOException $e) {
            return [
                'success' => false,
                'message' => 'project.fatalError',
                'error'   => $e->getMessage(),
            ];
        }
    }

    public function get_projectInfo(): array {
        return $this->project_info;
    }
}

class projectObjList extends projectObjBase {
    /**
     * @param array $filters ['search'=>string, 'customer_uid'=>string]
     * @param int   $page
     * @param int   $perPage
     * @return array{ projects_list: array[], total: int, page: int, per_page: int }
     */
    public function get_projectsList(array $filters = [], int $page = 1, int $perPage = 25): array {
        $page    = max(1, $page);
        $perPage = max(1, $perPage);
        $offset  = ($page - 1) * $perPage;

        $wheres = ['p.`company_uid` = :company_uid'];
        $params = ['company_uid' => $this->company_uid];

        if (!empty($filters['search'])) {
            $wheres[]          = 'p.`title` LIKE :search';
            $params['search']  = "%{$filters['search']}%";
        }
        if (!empty($filters['customer_uid'])) {
            $wheres[]              = 'p.`customer_uid` = :customer_uid';
            $params['customer_uid'] = $filters['customer_uid'];
        }

        $whereSql = implode(' AND ', $wheres);
        $projCols = implode(', ', array_map(fn($f) => "p.`$f`", self::ALL_FIELDS));

        // opzionale join per ragione sociale cliente
        $sql = "
            SELECT SQL_CALC_FOUND_ROWS
                $projCols,
                c.business_name AS client_name
              FROM `projects` p
         LEFT JOIN `customersB2B` c
                ON p.`company_uid` = c.`company_uid`
                AND p.`customer_uid` = c.`customer_uid`
             WHERE $whereSql AND p.status='active'
             ORDER BY p.`start_date` DESC
             LIMIT :offset, :perPage
        ";
        $stmt = $this->conn->prepare($sql);
        foreach ($params as $k => $v) {
            $stmt->bindValue(":$k", $v);
        }
        $stmt->bindValue(':offset',  $offset,  PDO::PARAM_INT);
        $stmt->bindValue(':perPage', $perPage, PDO::PARAM_INT);
        $stmt->execute();

        $projects_list = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $total         = (int)$this->conn->query("SELECT FOUND_ROWS()")->fetchColumn();

        return [
            'projects_list' => $projects_list,
            'total'         => $total,
            'page'          => $page,
            'per_page'      => $perPage,
        ];
    }
}


class projectRequestObj extends projectObjBase {
    private ?string $project_uid;
    private array   $request_info = [];

    public function __construct(
        authManager $authManager,
        permsManager $permsManager,
        ?string $project_uid = null
    ) {
        parent::__construct($authManager, $permsManager);
        $this->project_uid = $project_uid;
        if ($this->project_uid) {
            $this->request_info = $this->load_requestInfo();
        }
    }

    private function load_requestInfo(): array {
        $cols = implode(', ', array_map(fn($f) => "`$f`", self::ALL_FIELDS));
        $sql  = "SELECT $cols
                   FROM `projects`
                  WHERE `company_uid` = :company_uid
                    AND `project_uid` = :project_uid
                    AND `status` = 'request';";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([
            'company_uid' => $this->company_uid,
            'project_uid' => $this->project_uid
        ]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            throw new Exception("Project request not found: {$this->project_uid}");
        }
        return $row;
    }

    public function set_requestInfo(array $newData): array {
        $missing = array_diff(self::REQUIRED_FIELDS, array_keys($newData));
        if (!empty($missing)) {
            return [
                'success' => false,
                'message' => 'request.missingInfo',
                'error'   => 'Missing required fields: ' . implode(', ', $missing),
            ];
        }

        $fieldsToUpdate = array_intersect(
            array_keys($newData),
            array_diff(self::ALL_FIELDS, ['project_uid'])
        );
        if (empty($fieldsToUpdate)) {
            return [
                'success' => false,
                'message' => 'request.noFieldsToUpdate',
                'error'   => 'No updatable fields provided',
            ];
        }

        $setParts = [];
        $params   = [];
        foreach ($fieldsToUpdate as $f) {
            $setParts[] = "`$f` = :$f";
            $params[$f] = $newData[$f];
        }
        $params['company_uid'] = $this->company_uid;
        $params['project_uid'] = $this->project_uid;

        $sql = sprintf(
            "UPDATE `projects`
                SET %s
              WHERE `company_uid` = :company_uid
                AND `project_uid` = :project_uid
                AND `status` = 'request'",
            implode(', ', $setParts)
        );

        try {
            $stmt = $this->conn->prepare($sql);
            $stmt->execute($params);
            // aggiorna interno
            foreach ($fieldsToUpdate as $f) {
                $this->request_info[$f] = $newData[$f];
            }
            return ['success' => true, 'message' => 'request.infoUpdated'];
        } catch (PDOException $e) {
            return [
                'success' => false,
                'message' => 'request.fatalError',
                'error'   => $e->getMessage(),
            ];
        }
    }

    public function insert_requestInfo(array $newData): array {
        $missing = array_diff(self::REQUIRED_FIELDS, array_keys($newData));
        if (!empty($missing)) {
            return [
                'success' => false,
                'message' => 'request.missingInfo',
                'error'   => 'Missing required fields: ' . implode(', ', $missing),
            ];
        }

        try {
            $new_uid = $this->authManager->generateUniqueUID('projects', 'project_uid');
            $validData = array_intersect_key(
                $newData,
                array_flip(array_diff(self::ALL_FIELDS, ['project_uid']))
            );

            $fields       = array_merge(['company_uid','project_uid'], array_keys($validData));
            $cols         = implode(', ', array_map(fn($f) => "`$f`", $fields));
            $placeholders = implode(', ', array_map(fn($f) => ":$f", $fields));
            $params = array_merge(
                ['company_uid'=> $this->company_uid, 'project_uid'=>$new_uid],
                $validData
            );

            $sql = "
                INSERT INTO `projects` ($cols, `status`)
                     VALUES ($placeholders, 'request');
            ";
            $stmt = $this->conn->prepare($sql);
            $stmt->execute($params);

            $this->project_uid  = $new_uid;
            $this->request_info = array_merge(
                ['company_uid'=> $this->company_uid, 'project_uid'=>$new_uid],
                $validData
            );

            return ['success'=> true, 'message'=>'request.infoInserted'];
        } catch (PDOException $e) {
            return [
                'success'=> false,
                'message'=> 'request.fatalError',
                'error'  => $e->getMessage(),
            ];
        }
    }

    public function get_requestInfo(): array {
        return $this->request_info;
    }
}

class projectRequestObjList extends projectObjBase {
    /**
     * @param array $filters ['search'=>string, 'customer_uid'=>string]
     * @param int   $page
     * @param int   $perPage
     * @return array{ requests_list: array[], total: int, page: int, per_page: int }
     */
    public function get_requestsList(array $filters = [], int $page = 1, int $perPage = 25): array {
        $page    = max(1, $page);
        $perPage = max(1, $perPage);
        $offset  = ($page - 1) * $perPage;

        $wheres = ['p.`company_uid` = :company_uid'];
        $params = ['company_uid' => $this->company_uid];

        if (!empty($filters['search'])) {
            $wheres[]         = 'p.`title` LIKE :search';
            $params['search'] = "%{$filters['search']}%";
        }
        if (!empty($filters['customer_uid'])) {
            $wheres[]               = 'p.`customer_uid` = :customer_uid';
            $params['customer_uid'] = $filters['customer_uid'];
        }

        $whereSql = implode(' AND ', $wheres);
        $projCols = implode(', ', array_map(fn($f) => "p.`$f`", self::ALL_FIELDS));

        $sql = "
            SELECT SQL_CALC_FOUND_ROWS
                $projCols,
                c.business_name AS client_name
              FROM `projects` p
         LEFT JOIN `customersB2B` c
                ON p.`company_uid` = c.`company_uid`
               AND p.`customer_uid` = c.`customer_uid`
             WHERE $whereSql
               AND p.`status` = 'request'
             ORDER BY p.`start_date` DESC
             LIMIT :offset, :perPage
        ";
        $stmt = $this->conn->prepare($sql);
        foreach ($params as $k => $v) {
            $stmt->bindValue(":$k", $v);
        }
        $stmt->bindValue(':offset',  $offset,  PDO::PARAM_INT);
        $stmt->bindValue(':perPage', $perPage, PDO::PARAM_INT);
        $stmt->execute();

        $requests_list = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $total         = (int)$this->conn->query("SELECT FOUND_ROWS()")->fetchColumn();

        return [
            'projects_list' => $requests_list,
            'total'         => $total,
            'page'          => $page,
            'per_page'      => $perPage,
        ];
    }
}
?>
