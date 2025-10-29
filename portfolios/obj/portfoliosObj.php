<?php
require_once("{$_SERVER['DOCUMENT_ROOT']}/auth/obj/authManager.php");
require_once("{$_SERVER['DOCUMENT_ROOT']}/auth/obj/permsManager.php");

class portfolioObjBase
{
    protected authManager $authManager;
    protected permsManager $permsManager;
    protected PDO $conn;
    protected array $user_data;
    protected string $company_uid;

    protected const TABLE_INFO   = 'data_portfolios_info';
    protected const TABLE_ASSETS = 'data_portfolios_assets';

    /**
     * Tutti i campi della tabella info (inclusi timestamp per SELECT; non per insert/update manuale).
     */
    protected const ALL_FIELDS_INFO = [
        'user_uid',
        'title',
        'type',           // 'custom' | 'managed'
        'managed_uid',
        'target',
        'time_horizon_years',
        'cash_position',
        'automatic_savings',
        'isDeleted',
        'isDraft',
        'isRanked',
        'updated_at',
        'created_at'
    ];

    /**
     * Campi modificabili manualmente via UPDATE parziale.
     * (type NON modificabile una volta creato, lo togliamo dai campi mutabili).
     */
    protected const MUTABLE_FIELDS_INFO = [
        'title',
        'managed_uid',
        'target',
        'time_horizon_years',
        'cash_position',
        'automatic_savings',
        'isDraft',
        'isRanked',
    ];

    /**
     * Campi richiesti all'INSERT.
     */
    protected const REQUIRED_FIELDS_INSERT = [
        'user_uid',
        'title',
        'type',
        'target',
        'time_horizon_years',
        'cash_position',
        'automatic_savings',
        // isDraft può essere deciso al momento dell'upload/creazione (default 0)
    ];

    public function __construct(authManager $authManager, permsManager $permsManager)
    {
        $this->authManager  = $authManager;
        $this->permsManager = $permsManager;
        $this->conn         = $authManager->get_dbConn();
        $this->user_data    = $authManager->get_userData();
        $this->company_uid  = $this->user_data['company_uid'];

        $this->conn->setAttribute(PDO::ATTR_EMULATE_PREPARES, true);
        $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    }

    public static function get_allFields(): array
    {
        return self::ALL_FIELDS_INFO;
    }
    public static function get_mutableFields(): array
    {
        return self::MUTABLE_FIELDS_INFO;
    }
    public static function get_requiredFieldsInsert(): array
    {
        return self::REQUIRED_FIELDS_INSERT;
    }
}


class portfolioObj extends portfolioObjBase
{
    private ?string $portfolio_uid;
    private array $portfolio_info = [];
    private array $assets = [];

    public function __construct(authManager $authManager, permsManager $permsManager, ?string $portfolio_uid = null)
    {
        parent::__construct($authManager, $permsManager);
        $this->portfolio_uid = $portfolio_uid;
        if ($this->portfolio_uid) {
            $this->load_data();
        }
    }

    private function load_data(): void
    {
        $this->portfolio_info = $this->load_portfolioInfo();
        if (!empty($this->portfolio_info['success']) && $this->portfolio_info['success'] === false) {
            // lascio l'errore propagare nel getter
            return;
        }
        $this->assets = $this->load_assets();
    }

    private function load_portfolioInfo(): array
    {
        $cols = implode(', ', array_map(fn($f) => "`$f`", self::ALL_FIELDS_INFO));
        $sql = "SELECT $cols, portfolio_uid FROM `" . self::TABLE_INFO . "`\n                WHERE `company_uid` = :company_uid\n                  AND `user_uid`    = :user_uid\n                  AND `portfolio_uid` = :portfolio_uid\n                  AND `isDeleted` = '0'\n                LIMIT 1";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([
            'company_uid'   => $this->company_uid,
            'user_uid'      => $this->user_data['user_uid'],
            'portfolio_uid' => $this->portfolio_uid
        ]);
        $info = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$info) {
            return ['success' => false, 'message' => 'portfolio.notFound', 'error' => "Portfolio not found: {$this->portfolio_uid}"];
        }
        return $info;
    }

    private function load_assets(): array
    {
        if (!$this->portfolio_uid) return [];

        $sql = "SELECT symbol, unitQuantity, unitaryPrice_lastOp\n                FROM `" . self::TABLE_ASSETS . "`\n                WHERE `company_uid` = :company_uid AND `portfolio_uid` = :portfolio_uid";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([
            'company_uid'   => $this->company_uid,
            'portfolio_uid' => $this->portfolio_uid
        ]);
        $assets = $stmt->fetchAll(PDO::FETCH_ASSOC);
        if (!$assets) return [];

        // Fetch prezzi in batch
        $symbols = array_values(array_unique(array_column($assets, 'symbol')));
        if ($symbols) {
            $in  = implode(',', array_fill(0, count($symbols), '?'));
            $ps  = $this->conn->prepare("SELECT symbol, currentPrice FROM fin_stocks_info WHERE symbol IN ($in)");
            $ps->execute($symbols);
            $priceRows = $ps->fetchAll(PDO::FETCH_KEY_PAIR); // symbol => currentPrice
        } else {
            $priceRows = [];
        }

        foreach ($assets as &$a) {
            $symbol = $a['symbol'];
            $unitaryPrice_now = isset($priceRows[$symbol]) && is_numeric($priceRows[$symbol])
                ? (float)$priceRows[$symbol]
                : null;

            $a['unitaryPrice_now'] = $unitaryPrice_now;
            $a['pctGrowth'] = $this->pctGrowth(
                isset($a['unitaryPrice_lastOp']) ? (float)$a['unitaryPrice_lastOp'] : null,
                $unitaryPrice_now
            );
            $a['value_now'] = ($a['unitaryPrice_now'] !== null && is_numeric($a['unitQuantity']))
                ? round(((float)$a['unitQuantity']) * (float)$a['unitaryPrice_now'], 2)
                : null;
        }
        unset($a);

        return $assets;
    }

    private function pctGrowth(?float $unitPriceLastOp, ?float $unitPriceNow): ?float
    {
        if ($unitPriceLastOp === null || $unitPriceNow === null) return null;
        if ($unitPriceLastOp == 0.0) return null; // oppure lancia eccezione
        return (($unitPriceNow / $unitPriceLastOp) - 1.0);
    }

    public function get_portfolioInfo(): array
    {
        if (isset($this->portfolio_info['success']) && $this->portfolio_info['success'] === false) {
            return $this->portfolio_info; // già contiene errore
        }
        $info = $this->portfolio_info;
        $info['assets'] = $this->assets;
        return [
            'success' => true,
            'message' => 'portfolio.fetched',
            'data'    => $info
        ];
    }

    /** INSERT
     * - type: 'custom' | 'managed'
     * - Se 'custom': assets obbligatori (lista di {symbol, unitQuantity, unitaryPrice_lastOp})
     * - Se 'managed': managed_uid obbligatorio e assets preset vuoto
     */
    public function insert_portfolioInfo(array $data): array
    {
        // required base
        $missing = array_diff(self::REQUIRED_FIELDS_INSERT, array_keys($data));
        if (!empty($missing)) {
            return ['success' => false, 'message' => 'portfolio.create.400.missingInfo', 'error' => 'Missing fields: ' . implode(', ', $missing)];
        }

        if (!in_array($data['type'], ['custom', 'managed'], true)) {
            return ['success' => false, 'message' => 'portfolio.create.400.invalidType', 'error' => 'Invalid type'];
        }

        if ($data['type'] === 'custom') {
            if (empty($data['assets']) || !is_array($data['assets'])) {
                return ['success' => false, 'message' => 'portfolio.create.400.missingAssets', 'error' => 'Assets is empty'];
            }
            foreach ($data['assets'] as $a) {
                if (empty($a['symbol'])) {
                    return ['success' => false, 'message' => 'portfolio.create.400.invalidAsset.emptySymbol', 'error' => 'Asset symbol required'];
                }
                if (!isset($a['unitaryPrice_lastOp']) || !is_numeric($a['unitaryPrice_lastOp']) || $a['unitaryPrice_lastOp'] < 0) {
                    return ['success' => false, 'message' => 'portfolio.create.400.invalidAsset.unitaryPrice_lastOp', 'error' => 'Invalid unitaryPrice_lastOp'];
                }
                if (isset($a['unitQuantity']) && (!is_numeric($a['unitQuantity']) || $a['unitQuantity'] < 0)) {
                    return ['success' => false, 'message' => 'portfolio.create.400.invalidAsset.unitQuantity', 'error' => 'Invalid unitQuantity'];
                }
            }
        }

        if ($data['type'] === 'managed') {
            if (empty($data['managed_uid'])) {
                return ['success' => false, 'message' => 'portfolio.create.400.missingManagedUID', 'error' => 'Missing managed_uid'];
            }
            $data['assets'] = []; // preset vuoto
        }

        $uid = $this->authManager->generateUniqueUID(self::TABLE_INFO, 'portfolio_uid');
        $data['portfolio_uid'] = $uid;
        $data['company_uid']   = $this->company_uid;
        $data['user_uid']      = $this->user_data['user_uid'];

        // default isDeleted/isDraft se non passati
        $data['isDeleted'] = isset($data['isDeleted']) ? (string)$data['isDeleted'] : '0';
        if (!isset($data['isDraft'])) $data['isDraft'] = '0';

        // Prepara campi validi per insert: PK + all_fields_info esclusi timestamp
        $insertable = array_intersect_key(
            $data,
            array_flip(array_merge(['portfolio_uid', 'company_uid'], self::ALL_FIELDS_INFO))
        );

        $fields = array_keys($insertable);
        $cols   = implode(', ', array_map(fn($f) => "`$f`", $fields));
        $vals   = implode(', ', array_map(fn($f) => ":$f", $fields));

        try {
            $this->conn->beginTransaction();

            $stmt = $this->conn->prepare("INSERT INTO `" . self::TABLE_INFO . "` ($cols) VALUES ($vals)");
            foreach ($insertable as $k => $v) {
                $stmt->bindValue(":$k", $v);
            }
            $stmt->execute();

            if (!empty($data['assets'])) {
                $this->insert_assets($uid, $data['assets']);
            }

            $this->conn->commit();
            return ['success' => true, 'message' => 'portfolio.create.200.created', 'data' => ['portfolio_uid' => $uid]];
        } catch (Throwable $e) {
            if ($this->conn->inTransaction()) $this->conn->rollBack();
            return ['success' => false, 'message' => 'portfolio.create.500.fatalError', 'error' => $e->getMessage()];
        }
    }

    /** UPDATE parziale: aggiorna solo i campi passati e ammessi (MUTABLE_FIELDS_INFO).
     * - type NON modificabile
     */
    public function set_portfolioInfo(array $newData): array
    {
        if (!$this->portfolio_uid) {
            return ['success' => false, 'message' => 'portfolio.update.400.missingUID', 'error' => 'Missing portfolio_uid'];
        }
        // blocca type
        if (array_key_exists('type', $newData)) {
            unset($newData['type']);
        }

        $fieldsToUpdate = array_intersect(array_keys($newData), self::MUTABLE_FIELDS_INFO);
        if (empty($fieldsToUpdate)) {
            return ['success' => false, 'message' => 'portfolio.update.400.noFields', 'error' => 'No updatable fields provided'];
        }

        $setParts = [];
        $params = [
            'company_uid'   => $this->company_uid,
            'portfolio_uid' => $this->portfolio_uid,
        ];
        foreach ($fieldsToUpdate as $f) {
            $setParts[] = "`$f` = :$f";
            $params[$f] = $newData[$f] ?? null;
        }

        $sql = "UPDATE `" . self::TABLE_INFO . "`\n                SET " . implode(', ', $setParts) . "\n                WHERE `company_uid`=:company_uid AND `portfolio_uid`=:portfolio_uid AND `isDeleted`='0'";
        try {
            $stmt = $this->conn->prepare($sql);
            foreach ($params as $k => $v) {
                $stmt->bindValue(":$k", $v);
            }
            $stmt->execute();

            $this->load_data();
            return ['success' => true, 'message' => 'portfolio.update.200.updated', 'data' => $this->get_portfolioInfo()['data'] ?? []];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'portfolio.update.500.fatalError', 'error' => $e->getMessage()];
        }
    }

    private function insert_assets(string $portfolio_uid, array $assets): void
    {
        $sql = "INSERT INTO `" . self::TABLE_ASSETS . "`\n                (`company_uid`, `portfolio_uid`, `symbol`, `unitQuantity`, `unitaryPrice_lastOp`)\n                VALUES (:company_uid, :portfolio_uid, :symbol, :unitQuantity, :unitaryPrice_lastOp)";
        $stmt = $this->conn->prepare($sql);

        foreach ($assets as $asset) {
            $stmt->execute([
                'company_uid'         => $this->company_uid,
                'portfolio_uid'       => $portfolio_uid,
                'symbol'              => $asset['symbol'],
                'unitQuantity'        => $asset['unitQuantity'] ?? 0,
                'unitaryPrice_lastOp' => $asset['unitaryPrice_lastOp']
            ]);
            $this->incrementStockWatcher($asset['symbol']);
        }
    }

    private function incrementStockWatcher(string $symbol): void
    {
        $stmt = $this->conn->prepare("\n            INSERT INTO `fin_stocks_priority` (`symbol`, `watchers_count`, `updated_at`)\n            VALUES (:symbol, 1, :ts)\n            ON DUPLICATE KEY UPDATE\n                `watchers_count` = `watchers_count` + 1,\n                `updated_at` = :ts\n        ");
        $stmt->execute(['symbol' => $symbol, 'ts' => time()]);
    }

    private function decrementStockWatcher(string $symbol): void
    {
        $stmt = $this->conn->prepare("\n            UPDATE `fin_stocks_priority`\n            SET `watchers_count` = GREATEST(`watchers_count` - 1, 0),\n                `updated_at` = :ts\n            WHERE `symbol` = :symbol\n        ");
        $stmt->execute(['symbol' => $symbol, 'ts' => time()]);
    }

    public function get_assetPrices(): array
    {
        $symbols = array_column($this->assets, 'symbol') ?? [];
        if (empty($symbols)) {
            return [
                'success' => true,
                'message' => 'portfolio.assetPricesFetched',
                'data'    => ['prices' => []],
            ];
        }

        try {
            $inClause = implode(',', array_fill(0, count($symbols), '?'));
            $stmt = $this->conn->prepare("SELECT symbol, currentPrice FROM fin_stocks_info WHERE symbol IN ($inClause)");
            $stmt->execute($symbols);
            $prices = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return [
                'success' => true,
                'message' => 'portfolio.assetPricesFetched',
                'data'    => ['prices' => $prices],
            ];
        } catch (Throwable $e) {
            return [
                'success' => false,
                'message' => 'portfolio.failedToFetchAssetPrices',
                'error'   => $e->getMessage(),
            ];
        }
    }
}


class portfolioObjList extends portfolioObjBase
{
    /**
     * Filtri supportati:
     * - search (match su title)
     * - type ('custom' | 'managed')
     * - user_uid (default: utente corrente)
     * - isDraft ('0'|'1' o booleano)
     * - managed_uid
     * - ranked_only (boolean): se true, isRanked = 1
     * - created_from / created_to (YYYY-MM-DD)
     * - updated_from / updated_to (YYYY-MM-DD)
     * - include_deleted (FALSE by default) -> in genere NO: isDeleted=0 come soft delete globale
     *
     * @param array $filters
     * @param bool  $extractAll (se true, nessuna paginazione e nessun meta)
     * @param int   $page
     * @param int   $perPage
     * @return array
     */
    public function get_portfoliosList(array $filters = [], bool $extractAll = false, int $page = 1, int $perPage = 25): array
    {
        try {
            $page    = max(1, $page);
            $perPage = max(1, $perPage);
            $offset  = ($page - 1) * $perPage;

            $wheres = [];
            $params = [];

            $wheres[]              = "`p`.`company_uid` = :company_uid";
            $params['company_uid'] = $this->company_uid;

            // Soft delete: sempre applicato
            $wheres[] = "`p`.`isDeleted` = '0'";

            // Utente: default utente corrente; consentire override via filtro (se permessi lo consentono)
            if (!empty($filters['user_uid'])) {
                $wheres[]            = "`p`.`user_uid` = :user_uid";
                $params['user_uid']  = $filters['user_uid'];
            } else {
                $wheres[]            = "`p`.`user_uid` = :user_uid";
                $params['user_uid']  = $this->user_data['user_uid'];
            }

            if (!empty($filters['search'])) {
                $wheres[]          = "`p`.`title` LIKE :search";
                $params['search']  = "%{$filters['search']}%";
            }
            if (!empty($filters['type'])) {
                $wheres[]         = "`p`.`type` = :type";
                $params['type']   = $filters['type'];
            }
            if (isset($filters['isDraft'])) { // accetta '0'|'1' o bool
                $wheres[]            = "`p`.`isDraft` = :isDraft";
                $params['isDraft']   = is_bool($filters['isDraft']) ? (int)$filters['isDraft'] : $filters['isDraft'];
            }
            if (!empty($filters['managed_uid'])) {
                $wheres[]              = "`p`.`managed_uid` = :managed_uid";
                $params['managed_uid'] = $filters['managed_uid'];
            }
            if (!empty($filters['ranked_only'])) {
                $wheres[] = "`p`.`isRanked` = '1'";
            }
            if (!empty($filters['created_from'])) {
                $wheres[]               = "DATE(`p`.`created_at`) >= :created_from";
                $params['created_from'] = $filters['created_from'];
            }
            if (!empty($filters['created_to'])) {
                $wheres[]             = "DATE(`p`.`created_at`) <= :created_to";
                $params['created_to'] = $filters['created_to'];
            }
            if (!empty($filters['updated_from'])) {
                $wheres[]               = "DATE(`p`.`updated_at`) >= :updated_from";
                $params['updated_from'] = $filters['updated_from'];
            }
            if (!empty($filters['updated_to'])) {
                $wheres[]             = "DATE(`p`.`updated_at`) <= :updated_to";
                $params['updated_to'] = $filters['updated_to'];
            }

            $whereSql = $wheres ? ('WHERE ' . implode(' AND ', $wheres)) : '';
            $cols = implode(', ', array_map(fn($f) => "`p`.`$f`", self::ALL_FIELDS_INFO));

            $sql = "\n                SELECT SQL_CALC_FOUND_ROWS\n                    $cols, `p`.`portfolio_uid`\n                FROM `" . self::TABLE_INFO . "` p\n                $whereSql\n                ORDER BY `p`.`created_at` DESC\n            ";
            if (!$extractAll) {
                $sql .= " LIMIT :offset, :perPage";
            }

            $stmt = $this->conn->prepare($sql);
            foreach ($params as $k => $v) {
                $stmt->bindValue(":$k", $v);
            }
            if (!$extractAll) {
                $stmt->bindValue(':offset',  $offset,  PDO::PARAM_INT);
                $stmt->bindValue(':perPage', $perPage, PDO::PARAM_INT);
            }
            $stmt->execute();

            $rows  = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $total = (int)$this->conn->query("SELECT COUNT(*)")->fetchColumn();

            $return = [
                'success' => true,
                'message' => 'portfolio.list.200.success',
                'data'    => $rows
            ];

            if (!$extractAll) {
                $pages_num = (int)ceil(($total ?: 0) / $perPage);
                $return['data'] = [
                    'rows' => $rows,
                    'meta' => [
                        'items_num' => $total,
                        'pages_num' => $pages_num,
                        'page'      => $page,
                        'per_page'  => $perPage,
                    ]
                ];
            }

            return $return;
        } catch (Throwable $e) {
            return [
                'success' => false,
                'message' => 'portfolio.list.500.error',
                'error'   => $e->getMessage()
            ];
        }
    }
}
