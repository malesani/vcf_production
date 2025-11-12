<?php
require_once("{$_SERVER['DOCUMENT_ROOT']}/auth/obj/authManager.php");
require_once("{$_SERVER['DOCUMENT_ROOT']}/auth/obj/permsManager.php");
require_once("{$_SERVER['DOCUMENT_ROOT']}/financialData/obj/StockPriceProvider.php");


class portfolioObjBase
{
    protected authManager $authManager;
    protected permsManager $permsManager;
    protected PDO $conn;
    protected array $user_data;
    protected string $company_uid;

    protected StockPriceProvider $priceProv;

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
    protected const REQUIRED_CREATE = [
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

        $this->priceProv = new StockPriceProvider($authManager);
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
        return self::REQUIRED_CREATE;
    }


    public static function isValidType(?string $type): bool
    {
        return in_array($type, ['custom', 'managed'], true);
    }

    protected function computeTotalsFromAssets(array $assets, float $cashPosition = 0.0): array
    {
        $total_now = 0.0;
        foreach ($assets as $a) {
            $qty  = is_numeric($a['unitQuantity'] ?? null) ? (float)$a['unitQuantity'] : 0.0;
            $pNow = isset($a['unitaryPrice_now']) && is_numeric($a['unitaryPrice_now']) ? (float)$a['unitaryPrice_now'] : null;
            if ($pNow !== null) $total_now += $qty * $pNow;
        }

        $total_now        = round($total_now, 2);
        $total_with_cash  = round($total_now + $cashPosition, 2);

        return [
            'cash_position'    => round($cashPosition, 2),
            'total_assets_now' => $total_now,
            'total_with_cash'  => $total_with_cash,
        ];
    }
}
class portfolioObj extends portfolioObjBase
{
    private ?string $portfolio_uid = null;
    private array $portfolio_info = [];
    private array $assets = [];

    public function __construct(authManager $authManager, permsManager $permsManager, ?string $portfolio_uid = null)
    {
        parent::__construct($authManager, $permsManager);
        if ($portfolio_uid) {
            $this->set_portfolio($portfolio_uid);
        }
    }

    public function set_portfolio(string $portfolio_uid): array
    {
        try {
            $this->portfolio_uid = $portfolio_uid;
            $this->load_data();
            return [
                'success' => true,
                'message' => "portfolio.loadData.success",
                'data' => []
            ];
        } catch (Exception $e) {
            throw new Exception($e->getMessage());
        }
    }

    private function load_data(): void
    {
        $this->portfolio_info = $this->load_info();
        if (empty($this->portfolio_info)) {
            throw new Exception("This portfolio_uid doesn't exist.");
        }
        $this->assets = $this->load_assets();

        $this->portfolio_info['totals'] = $this->load_totals();
    }

    private function load_info(): array
    {
        $cols = implode(', ', array_map(fn($f) => "`$f`", self::ALL_FIELDS_INFO));
        $sql = "SELECT $cols, portfolio_uid FROM `" . self::TABLE_INFO . "` WHERE `company_uid` = :company_uid 
            AND `user_uid`    = :user_uid 
            AND `portfolio_uid` = :portfolio_uid 
            AND `isDeleted` = '0' 
        LIMIT 1";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([
            'company_uid'   => $this->company_uid,
            'user_uid'      => $this->user_data['user_uid'],
            'portfolio_uid' => $this->portfolio_uid
        ]);
        $info = $stmt->fetch(PDO::FETCH_ASSOC);
        return $info;
    }

    private function load_assets(): array
    {
        if (!$this->portfolio_uid) return [];

        $sql = "SELECT symbol, unitQuantity
            FROM `" . self::TABLE_ASSETS . "` WHERE `company_uid` = :company_uid AND `portfolio_uid` = :portfolio_uid
        ";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([
            'company_uid'   => $this->company_uid,
            'portfolio_uid' => $this->portfolio_uid
        ]);
        $assets = $stmt->fetchAll(PDO::FETCH_ASSOC);
        if (!$assets) return [];

        foreach ($assets as &$a) {
            $symbol = $a['symbol'];
            $unitaryPrice_now = $this->priceProv->getPriceEURValue($symbol);

            $a['unitaryPrice_now'] = $unitaryPrice_now;
            $a['value_now'] = ($a['unitaryPrice_now'] !== null && is_numeric($a['unitQuantity']))
                ? round(((float)$a['unitQuantity']) * (float)$a['unitaryPrice_now'], 2)
                : null;
        }
        unset($a);

        return $assets;
    }

    private function load_totals(): array
    {
        $cash_position = is_numeric($this->portfolio_info['cash_position'] ?? null)
            ? (float)$this->portfolio_info['cash_position']
            : 0.0;

        return self::computeTotalsFromAssets($this->assets, $cash_position);
    }


    /** CREATE
     * - type: 'custom' | 'managed'
     * - Se 'managed': managed_uid obbligatorio e assets ignorato (empty portfolio)
     */
    public function create_emptyPortfolio(array $data): array
    {
        try {
            $this->conn->beginTransaction();
            // required fields
            $missing = array_diff(self::REQUIRED_CREATE, array_keys($data));
            if (!empty($missing)) {
                return ['success' => false, 'message' => 'portfolio.create.400.missingInfo', 'error' => 'Missing fields: ' . implode(', ', $missing)];
            }

            if (!self::isValidType($data['type'])) {
                return ['success' => false, 'message' => 'portfolio.create.400.invalidType', 'error' => "Invalid portfolio type: [" . $data['type'] . "]"];
            }

            if ($data['type'] === 'managed') {
                if (empty($data['managed_uid'])) {
                    return ['success' => false, 'message' => 'portfolio.create.400.missingManagedUID', 'error' => 'Missing managed_uid'];
                }
            }

            $uid = $this->authManager->generateUniqueUID(self::TABLE_INFO, 'portfolio_uid');
            $data['portfolio_uid'] = $uid;
            $data['company_uid']   = $this->company_uid;
            $data['user_uid']      = $this->user_data['user_uid'];

            $data['time_horizon_years'] = (int)($data['time_horizon_years'] ?? 0);
            $data['cash_position']      = (float)($data['cash_position'] ?? 0);
            $data['automatic_savings']  = (float)($data['automatic_savings'] ?? 0);

            // default isDeleted/isDraft/isRanked se non passati
            $data['isDeleted'] = isset($data['isDeleted']) ? (int)!empty($data['isDeleted']) : 0;
            $data['isDraft']   = isset($data['isDraft'])   ? (int)!empty($data['isDraft'])   : 0;
            $data['isRanked']  = isset($data['isRanked'])  ? (int)!empty($data['isRanked'])  : 0;

            $allInsertable = array_diff(self::ALL_FIELDS_INFO, ['updated_at', 'created_at']);
            $insertable = array_intersect_key(
                $data,
                array_flip(array_merge(['portfolio_uid', 'company_uid'], $allInsertable))
            );

            $fields = array_keys($insertable);
            $cols   = implode(', ', array_map(fn($f) => "`$f`", $fields));
            $vals   = implode(', ', array_map(fn($f) => ":$f", $fields));


            $stmt = $this->conn->prepare("INSERT INTO `" . self::TABLE_INFO . "` ($cols) VALUES ($vals)");
            foreach ($insertable as $k => $v) {
                $stmt->bindValue(":$k", $v);
            }
            $stmt->execute();

            $this->conn->commit();
            return ['success' => true, 'message' => 'portfolio.create.200.created', 'data' => ['portfolio_uid' => $uid]];
        } catch (Throwable $e) {
            if ($this->conn->inTransaction()) $this->conn->rollBack();
            return ['success' => false, 'message' => 'portfolio.create.500.fatalError', 'error' => $e->getMessage()];
        }
    }

    /** UPDATE 
     * - parziale: aggiorna solo i campi passati e ammessi (MUTABLE_FIELDS_INFO).
     * - type NON modificabile
     */
    public function update_portfolioInfo(array $newData)
    {
        try {
            $target_uid = $this->portfolio_uid ?? ($newData['portfolio_uid'] ?? null);
            if (!$target_uid) {
                return ['success' => false, 'message' => 'portfolio.update.400.missingUID', 'error' => 'Missing portfolio_uid'];
            }

            if ($target_uid != $this->portfolio_uid) {
                $setPortfolio = $this->set_portfolio($target_uid);
                if (!$setPortfolio['success']) {
                    return $setPortfolio;
                }
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
            $setParts[] = "`updated_at` = :updated_at";
            $params['updated_at'] = date('Y-m-d H:i:s');

            $sql = "UPDATE `" . self::TABLE_INFO . "`
                SET " . implode(', ', $setParts) . " WHERE `company_uid`=:company_uid AND `portfolio_uid`=:portfolio_uid AND `isDeleted`='0'
            ";

            $stmt = $this->conn->prepare($sql);
            foreach ($params as $k => $v) {
                $stmt->bindValue(":$k", $v);
            }
            $stmt->execute();

            $this->load_data();
            return ['success' => true, 'message' => 'portfolio.update.200.updated', 'data' => $this->portfolio_info];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'portfolio.update.500.fatalError', 'error' => $e->getMessage()];
        }
    }

    /** GETTERS */
    public function get_portfolioInfo(bool $refresh = false): array
    {
        if ($refresh) {
            $this->load_data();
        }
        return $this->portfolio_info;
    }

    public function get_portfolioAssets(bool $refresh = false): array
    {
        if ($refresh) {
            $this->assets = $this->load_assets();
        }
        return $this->assets;
    }

    public function get_portfolioData(bool $refresh = false): array
    {
        if ($refresh) {
            $this->load_data();
        }
        $info = $this->portfolio_info ?: [];
        $info['assets'] = $this->assets;

        return $info;
    }

    // Get portfolio totals
    public function get_totals(bool $refreshPrices = false): array
    {
        if ($refreshPrices) {
            // ricarica gli assets con i prezzi correnti dal DB
            $this->assets = $this->load_assets();
        }
        if (empty($this->portfolio_info)) {
            if ($this->portfolio_uid) $this->load_data();
            else {
                return ['success' => false, 'message' => 'portfolio.400.noPortfolioLoaded', 'error' => 'No portfolio loaded'];
            }
        }
        $cash_position = is_numeric($this->portfolio_info['cash_position'] ?? null) ? (float)$this->portfolio_info['cash_position'] : 0.0;
        return [
            'success' => true,
            'message' => 'portfolio.200.totals',
            'data'    => self::computeTotalsFromAssets($this->assets, $cash_position),
        ];
    }

    // Get actial price fromDb foreach portfolio's assets
    public function get_assetPrices(): array
    {
        $symbols = array_column($this->assets, 'symbol') ?? [];
        return $this->priceProv->get_assetPrices($symbols);
    }
}


class portfolioObjList extends portfolioObjBase
{
    /** GET Lista portafogli
     * Filtri supportati:
     * - search (match su title)
     * - type ('custom' | 'managed')
     * - isDraft ('0'|'1' o booleano)
     * - managed_uid
     * - include_assets: Used to include assets (Default true)
     * - include_totals: Used to include totals in info (Default true)
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

            // Utente: default utente corrente;
            $wheres[]            = "`p`.`user_uid` = :user_uid";
            $params['user_uid']  = $this->user_data['user_uid'];

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
                $wheres[]               = "`p`.`created_at` >= :created_from";
                $params['created_from'] = $filters['created_from'] . ' 00:00:00';
            }
            if (!empty($filters['created_to'])) {
                $wheres[]             = "`p`.`created_at` < :created_to";
                $params['created_to'] = date('Y-m-d', strtotime($filters['created_to'] . ' +1 day')) . ' 00:00:00';
            }
            if (!empty($filters['updated_from'])) {
                $wheres[]               = "`p`.`updated_at` >= :updated_from";
                $params['updated_from'] = $filters['updated_from'] . ' 00:00:00';
            }
            if (!empty($filters['updated_to'])) {
                $wheres[]             = "`p`.`updated_at` < :updated_to";
                $params['updated_to'] = date('Y-m-d', strtotime($filters['updated_to'] . ' +1 day')) . ' 00:00:00';
            }

            if (empty($filters['include_deleted'])) {
                $wheres[] = "`p`.`isDeleted` = '0'";
            }

            $whereSql = $wheres ? ('WHERE ' . implode(' AND ', $wheres)) : '';
            $cols = implode(', ', array_map(fn($f) => "`p`.`$f`", self::ALL_FIELDS_INFO));

            $sqlRows = "
                SELECT $cols, `p`.`portfolio_uid`
                FROM `" . self::TABLE_INFO . "` p
                $whereSql
                ORDER BY `p`.`created_at` DESC
            " . (!$extractAll ? "LIMIT :offset, :perPage" : "");

            $stmt = $this->conn->prepare($sqlRows);
            foreach ($params as $k => $v) $stmt->bindValue(":$k", $v);
            if (!$extractAll) {
                $stmt->bindValue(':offset',  $offset,  PDO::PARAM_INT);
                $stmt->bindValue(':perPage', $perPage, PDO::PARAM_INT);
            }
            $stmt->execute();
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Enrich info
            $includeAssets = array_key_exists('include_assets', $filters)   // Default: true se non specificati
                ? (bool)$filters['include_assets'] : true;
            $includeTotals = array_key_exists('include_totals', $filters)   // Default: true se non specificati
                ? (bool)$filters['include_totals'] : true;

            if ($includeAssets || $includeTotals) {
                $rows = $this->enrichRowsWithAssetsAndTotals($rows, $includeAssets, $includeTotals);
            }

            // COUNT coerente con i filtri
            $sqlCount = "SELECT COUNT(*) FROM `" . self::TABLE_INFO . "` p $whereSql";
            $stmtCnt = $this->conn->prepare($sqlCount);
            foreach ($params as $k => $v) $stmtCnt->bindValue(":$k", $v);
            $stmtCnt->execute();
            $total = (int)$stmtCnt->fetchColumn();

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

    /** Enrich di ogni riga con assets (prezzati) e/o totals, in batch.
     * @param array $rows         righe di data_portfolios_info già estratte
     * @param bool  $withAssets   se true, aggiunge $row['assets'] (unitaryPrice_now, value_now)
     * @param bool  $withTotals   se true, aggiunge $row['totals'] (computeTotalsFromAssets)
     * @return array              righe arricchite
     */
    private function enrichRowsWithAssetsAndTotals(array $rows, bool $withAssets, bool $withTotals): array
    {
        if (!$withAssets && !$withTotals) return $rows;
        if (empty($rows)) return $rows;

        // 1) UIDs di portafoglio
        $uids = array_column($rows, 'portfolio_uid');
        $uids = array_values(array_filter(array_unique($uids)));

        if (empty($uids)) return $rows;

        // 2) Fetch TUTTI gli assets dei portafogli (in un colpo solo)
        $inU = implode(',', array_fill(0, count($uids), '?'));
        $sqlA = "SELECT portfolio_uid, symbol, unitQuantity
             FROM `" . self::TABLE_ASSETS . "`
             WHERE `company_uid` = ? AND `portfolio_uid` IN ($inU)";
        $stmtA = $this->conn->prepare($sqlA);
        $stmtA->execute(array_merge([$this->company_uid], $uids));
        $allAssets = $stmtA->fetchAll(PDO::FETCH_ASSOC);

        // 3) Mappa assets per portfolio_uid
        $assetsByPort = [];
        $allSymbols = [];
        foreach ($allAssets as $a) {
            $pid = $a['portfolio_uid'];
            $assetsByPort[$pid][] = $a;
            if (!empty($a['symbol'])) $allSymbols[] = $a['symbol'];
        }

        // 4) Fetch prezzi correnti per TUTTI i simboli
        $priceMap = [];
        $allSymbols = array_values(array_unique($allSymbols));

        // 5) Arricchimento righe
        foreach ($rows as &$row) {
            $pid = $row['portfolio_uid'];
            $portAssets = $assetsByPort[$pid] ?? [];

            // arricchisci gli assets con unitaryPrice_now e value_now
            foreach ($portAssets as &$a) {
                $sym  = $a['symbol'];
                $pNow = (float)$this->priceProv->getPriceEURValue($sym);
                $a['unitaryPrice_now'] = $pNow;
                $a['value_now'] = ($pNow !== null && is_numeric($a['unitQuantity']))
                    ? round(((float)$a['unitQuantity']) * $pNow, 2)
                    : null;
            }
            unset($a);

            if ($withAssets) {
                $row['assets'] = $portAssets;
            }

            if ($withTotals) {
                $cash = is_numeric($row['cash_position'] ?? null) ? (float)$row['cash_position'] : 0.0;
                // usa il metodo del base per coerenza
                $row['totals'] = self::computeTotalsFromAssets($portAssets, $cash);
            }
        }
        unset($row);

        return $rows;
    }
}
