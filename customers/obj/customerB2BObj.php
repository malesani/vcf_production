<?php

require_once("{$_SERVER['DOCUMENT_ROOT']}/auth/obj/authManager.php");
require_once("{$_SERVER['DOCUMENT_ROOT']}/auth/obj/permsManager.php");

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);


class CustomerB2BBase {
    protected authManager $authManager;
    protected permsManager $permsManager;
    protected PDO         $conn;
    protected array      $user_data;
    protected string      $company_uid;

    protected const ALL_FIELDS = [
        'customer_uid',
        'user_uid',
        'business_name',
        'address',
        'city',
        'zip_code',
        'province',
        'general_email',
        'website',
        'vat_number',
        'fiscal_code',
        'sdi_code',
        'pec',
        'deposit_payment_method',
        'balance_payment_method',
        'payment_terms',
        'iban',
        'intent_declaration',
        'financing_tender',
        'additional_requirements',
    ];
    protected const REQUIRED_FIELDS = [
        'business_name',
        'city',
        'province',
        'zip_code',
        'general_email',
        'vat_number',
    ];
    protected const USER_FIELDS = [
        "user_uid",
        "first_name",
        "last_name",
        "email",
        "phone"
    ];

    public function __construct(authManager $authManager, permsManager $permsManager) {
        $this->authManager  = $authManager;
        $this->permsManager = $permsManager;
        $this->conn         = $this->authManager->get_dbConn();
        $this->conn->setAttribute(PDO::ATTR_EMULATE_PREPARES, true);
        $this->conn->setAttribute(PDO::ATTR_ERRMODE,        PDO::ERRMODE_EXCEPTION);

        $this->user_data = $this->authManager->get_userData();
        $this->company_uid = $this->user_data['company_uid'];
    }

    public function get_allFields(): array {
        return self::ALL_FIELDS;
    }
    public function get_requiredFields(): array {
        return self::REQUIRED_FIELDS;
    }
}

class CustomerB2B extends CustomerB2BBase {
    private ?string $customer_uid;
    private array   $customer_info = [];
    private array   $user_info = [];

    public function __construct(
        authManager $authManager,
        permsManager $permsManager,
        ?string $customer_uid = null
    ) {
        parent::__construct($authManager, $permsManager);
        $this->customer_uid = $customer_uid;
        if ($this->customer_uid) {
            $this->customer_info = $this->load_customerInfo();
            if (!empty($this->customer_info['user_uid'])) {
                $this->user_info = $this->load_userInfo($this->customer_info['user_uid']);
            }
        }
    }

    private function load_customerInfo(): array {
        $cols = implode(', ', array_map(fn($f) => "`$f`", self::ALL_FIELDS));
        $sql  = "SELECT $cols 
                   FROM `customersB2B` 
                  WHERE `company_uid` = :company_uid 
                    AND `customer_uid` = :customer_uid";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([
            'company_uid'  => $this->company_uid,
            'customer_uid' => $this->customer_uid
        ]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            throw new Exception("Customer not found: {$this->customer_uid}");
        }
        return $row;
    }

    private function load_userInfo(string $user_uid): array|null {
        $sql  = "SELECT user_uid, email, first_name, last_name, phone
                   FROM acl_users WHERE user_uid = :user_uid AND blocked <> 1;";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute(['user_uid' => $user_uid]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$user) {
            throw new Exception("User not found: {$user_uid}");
        }

        return [
            "name" => $user['last_name'].' '.$user['first_name'],
            "email" => $user['email'],
            "phone" => $user['phone']
        ];
    }
   
    public function set_customerInfo(array $newData): array {
        // 1) verifica required
        $missing = array_diff(self::REQUIRED_FIELDS, array_keys($newData));
        if (!empty($missing)) {
            return [
                'success' => false,
                'message' => 'customer.missingInfo',
                'error'   => 'Missing required fields: ' . implode(', ', $missing),
            ];
        }

        // 2) prendo solo i campi validi (no customer_uid)
        $fieldsToUpdate = array_intersect(
            array_keys($newData),
            array_diff(self::ALL_FIELDS, ['customer_uid'])
        );
        if (empty($fieldsToUpdate)) {
            return [
                'success' => false,
                'message' => 'customer.noFieldsToUpdate',
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

        $sql = sprintf(
            "UPDATE `customersB2B` SET %s WHERE `company_uid` = :company_uid AND `customer_uid` = :customer_uid",
            implode(', ', $setParts)
        );

        try {
            $stmt = $this->conn->prepare($sql);
            $stmt->execute($params);
            // aggiorno interno
            foreach ($fieldsToUpdate as $f) {
                $this->customer_info[$f] = $newData[$f];
            }
            return ['success' => true, 'message' => 'customer.infoUpdated'];
        } catch (PDOException $e) {
            return [
                'success' => false,
                'message' => 'customer.fatalError',
                'error'   => $e->getMessage(),
            ];
        }
    }

    public function insert_customerInfo(array $newData): array {
        // 1) verifica required
        $missing = array_diff(self::REQUIRED_FIELDS, array_keys($newData));
        if (!empty($missing)) {
            return [
                'success' => false,
                'message' => 'customer.missingInfo',
                'error'   => 'Missing required fields: ' . implode(', ', $missing),
            ];
        }

        try {
            // 2) nuovo UID
            $new_uid = $this->authManager->generateUniqueUID('customersB2B', 'customer_uid');

            // 3) filtro i soli campi validi (no customer_uid)
            $validData = array_intersect_key(
                $newData,
                array_flip(array_diff(self::ALL_FIELDS, ['customer_uid']))
            );

            // 4) preparo colonne + placeholder
            $fields       = array_merge(['company_uid', 'customer_uid'], array_keys($validData));
            $cols         = implode(', ', array_map(fn($f) => "`$f`", $fields));
            $placeholders = implode(', ', array_map(fn($f) => ":$f", $fields));

            // 5) params + execute
            $params = array_merge(['company_uid'=> $this->company_uid, 'customer_uid' => $new_uid], $validData);
            $sql    = "INSERT INTO `customersB2B` ($cols) VALUES ($placeholders);";

            $stmt = $this->conn->prepare($sql);
            $stmt->execute($params);

            // 6) agg. interno
            $this->customer_uid  = $new_uid;
            $this->customer_info = array_merge(['company_uid'=> $this->company_uid, 'customer_uid' => $new_uid], $validData);

            return ['success' => true, 'message' => 'customer.infoInserted'];
        } catch (PDOException $e) {
            return [
                'success' => false,
                'message' => 'customer.fatalError',
                'error'   => json_encode($newData) . ' | ' . $e->getMessage(),
            ];
        }
    }

    public function get_customerInfo(): array {
        return $this->customer_info;
    }

    public function get_userInfo(): array {
        return $this->user_info;
    }
}

class CustomerB2BList extends CustomerB2BBase {
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

        $wheres = ['`company_uid` = :company_uid'];
        $params = ['company_uid' => $this->company_uid];

        if (!empty($filters['search'])) {
            $wheres[]         = '(`business_name` LIKE :search OR `general_email` LIKE :search)';
            $params['search'] = "%{$filters['search']}%";
        }
        if (!empty($filters['city'])) {
            $wheres[]       = '`city` = :city';
            $params['city'] = $filters['city'];
        }
        if (!empty($filters['province'])) {
            $wheres[]           = '`province` = :province';
            $params['province'] = $filters['province'];
        }

        $whereSql = implode(' AND ', $wheres);
        $cols     = implode(', ', array_map(fn($f) => "`$f`", self::ALL_FIELDS));

        $sql = "
            SELECT SQL_CALC_FOUND_ROWS $cols
              FROM `customersB2B`
             WHERE $whereSql
             ORDER BY `business_name` ASC
             LIMIT :offset, :perPage
        ";
        $stmt = $this->conn->prepare($sql);
        foreach ($params as $k => $v) {
            $stmt->bindValue(":$k", $v);
        }
        $stmt->bindValue(':offset',  $offset,  PDO::PARAM_INT);
        $stmt->bindValue(':perPage', $perPage, PDO::PARAM_INT);
        $stmt->execute();

        $customers_list  = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $total = (int)$this->conn->query("SELECT FOUND_ROWS()")->fetchColumn();

        return [
            'customers_list'    => $customers_list,
            'total'             => $total,
            'page'              => $page,
            'per_page'          => $perPage,
        ];
    }
}

?>
