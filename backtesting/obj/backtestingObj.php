<?php
require_once("{$_SERVER['DOCUMENT_ROOT']}/auth/obj/authManager.php");
require_once("{$_SERVER['DOCUMENT_ROOT']}/auth/obj/permsManager.php");

class backtestingObjBase
{
    protected authManager $authManager;
    protected permsManager $permsManager;
    protected PDO $conn;
    protected array $user_data;
    protected string $company_uid;

    protected const TABLE_INFO   = 'data_backtesting_info';
    protected const TABLE_ASSETS = 'data_backtesting_assets';

    /**
     * Campi tabella info (inclusi timestamp per SELECT).
     */
    protected const ALL_FIELDS_INFO = [
        'user_uid',
        'title',
        'description',
        'target',
        'time_horizon_years',
        'cash_position',
        'automatic_savings',
        'isDeleted',
        'updated_at',
        'created_at'
    ];

    /**
     * Campi modificabili via UPDATE parziale.
     */
    protected const MUTABLE_FIELDS_INFO = [
        'title',
        'target',
        'time_horizon_years',
        'cash_position',
        'automatic_savings',
    ];

    /**
     * Campi richiesti per CREATE.
     * NOTA: user_uid lo imponiamo dal token/sessione, quindi non lo richiediamo in input.
     */
    protected const REQUIRED_CREATE = [
        'title',
        'target',
        'time_horizon_years',
        'cash_position',
        'automatic_savings'
    ];

    public function __construct(authManager $authManager, permsManager $permsManager)
    {
        $this->authManager  = $authManager;
        $this->permsManager = $permsManager;
        $this->conn         = $authManager->get_dbConn();
        $this->user_data    = $authManager->get_userData();
        $this->company_uid  = $this->user_data['company_uid'];
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

    protected function normalizeInfoInput(array $data): array
    {
        // cast numerici
        if (isset($data['time_horizon_years'])) $data['time_horizon_years'] = (int)$data['time_horizon_years'];
        if (isset($data['cash_position']))      $data['cash_position']      = (float)$data['cash_position'];
        if (isset($data['automatic_savings']))  $data['automatic_savings']  = (float)$data['automatic_savings'];
        if (isset($data['target']))             $data['target']             = (float)$data['target'];

        return $data;
    }

    protected function normalizeAssetsInput(array $assets): array
    {
        // atteso: [{symbol, weight_pct}, ...]
        $clean = [];
        foreach ($assets as $a) {
            $symbol = trim((string)($a['symbol'] ?? ''));
            if ($symbol === '') continue;

            $w = $a['weight_pct'] ?? null;
            $w = is_numeric($w) ? (float)$w : null;
            if ($w === null) continue;

            $clean[] = [
                'symbol' => $symbol,
                'weight_pct' => $w,
            ];
        }
        return $clean;
    }

    protected function validateAssetsWeights(array $assets, float $tolerance = 0.01): array
    {
        // opzionale: somma pesi ~ 100
        $sum = 0.0;
        foreach ($assets as $a) $sum += (float)$a['weight_pct'];
        $sum = round($sum, 3);

        $ok = (abs($sum - 100.0) <= $tolerance);
        return ['ok' => $ok, 'sum' => $sum];
    }
}

class backtestingObj extends backtestingObjBase
{
    private ?string $backtesting_uid = null;
    private array $info = [];
    private array $assets = [];

    public function __construct(authManager $authManager, permsManager $permsManager, ?string $backtesting_uid = null)
    {
        parent::__construct($authManager, $permsManager);
        if ($backtesting_uid) {
            $this->set_backtesting($backtesting_uid);
        }
    }

    public function set_backtesting(string $backtesting_uid): array
    {
        try {
            $this->backtesting_uid = $backtesting_uid;
            $this->load_data();
            return ['success' => true, 'message' => 'backtesting.loadData.success', 'data' => []];
        } catch (Throwable $e) {
            return ['success' => false, 'message' => 'backtesting.loadData.error', 'error' => $e->getMessage()];
        }
    }

    private function load_data(): void
    {
        $this->info = $this->load_info();
        if (empty($this->info)) {
            throw new Exception("This backtesting_uid doesn't exist.");
        }
        $this->assets = $this->load_assets();
    }

    private function load_info(): array
    {
        $cols = implode(', ', array_map(fn($f) => "`$f`", self::ALL_FIELDS_INFO));

        $sql = "SELECT $cols, `backtesting_uid`
                FROM `" . self::TABLE_INFO . "`
                WHERE `company_uid` = :company_uid
                  AND `user_uid` = :user_uid
                  AND `backtesting_uid` = :backtesting_uid
                  AND `isDeleted` = '0'
                LIMIT 1";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute([
            'company_uid'     => $this->company_uid,
            'user_uid'        => $this->user_data['user_uid'],
            'backtesting_uid' => $this->backtesting_uid
        ]);

        return $stmt->fetch(PDO::FETCH_ASSOC) ?: [];
    }

    private function load_assets(): array
    {
        if (!$this->backtesting_uid) return [];

        $sql = "SELECT `symbol`, `weight_pct`
                FROM `" . self::TABLE_ASSETS . "`
                WHERE `company_uid` = :company_uid
                  AND `backtesting_uid` = :backtesting_uid
                ORDER BY `weight_pct` DESC";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute([
            'company_uid'     => $this->company_uid,
            'backtesting_uid' => $this->backtesting_uid
        ]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    /** CREATE (info + assets opzionali)
     * Input:
     *  - title, target, time_horizon_years, cash_position, automatic_savings
     *  - assets?: [{symbol, weight_pct}]
     */
    public function create_backtesting(array $data): array
    {
        try {
            $this->conn->beginTransaction();

            $missing = array_diff(self::REQUIRED_CREATE, array_keys($data));
            if (!empty($missing)) {
                return ['success' => false, 'message' => 'backtesting.create.400.missingInfo', 'error' => 'Missing fields: ' . implode(', ', $missing)];
            }

            $assets = $this->normalizeAssetsInput($data['assets'] ?? []);
            $data   = $this->normalizeInfoInput($data);

            // genera uid
            $uid = $this->authManager->generateUniqueUID(self::TABLE_INFO, 'backtesting_uid');

            $insert = [
                'company_uid'        => $this->company_uid,
                'backtesting_uid'    => $uid,
                'user_uid'           => $this->user_data['user_uid'],
                'title'              => $data['title'],
                'description'        => $data['description'],
                'target'             => $data['target'],
                'time_horizon_years' => $data['time_horizon_years'],
                'cash_position'      => $data['cash_position'],
                'automatic_savings'  => $data['automatic_savings'],
                'isDeleted'          => 0,
            ];

            $fields = array_keys($insert);
            $cols   = implode(', ', array_map(fn($f) => "`$f`", $fields));
            $vals   = implode(', ', array_map(fn($f) => ":$f", $fields));

            $stmt = $this->conn->prepare("INSERT INTO `" . self::TABLE_INFO . "` ($cols) VALUES ($vals)");
            foreach ($insert as $k => $v) $stmt->bindValue(":$k", $v);
            $stmt->execute();

            // assets (opzionali)
            if (!empty($assets)) {
                // (opzionale) enforce somma 100
                $check = $this->validateAssetsWeights($assets);
                if (!$check['ok']) {
                    $this->conn->rollBack();
                    return [
                        'success' => false,
                        'message' => 'backtesting.create.400.invalidWeights',
                        'error'   => "Weights must sum to 100. Current sum: {$check['sum']}"
                    ];
                }

                $this->replace_assets($uid, $assets);
            }

            $this->conn->commit();

            return ['success' => true, 'message' => 'backtesting.create.200.created', 'data' => ['backtesting_uid' => $uid]];
        } catch (Throwable $e) {
            if ($this->conn->inTransaction()) $this->conn->rollBack();
            return ['success' => false, 'message' => 'backtesting.create.500.fatalError', 'error' => $e->getMessage()];
        }
    }

    /** UPDATE info parziale */
    public function update_backtestingInfo(array $newData): array
    {
        try {
            $target_uid = $this->backtesting_uid ?? ($newData['backtesting_uid'] ?? null);
            if (!$target_uid) {
                return ['success' => false, 'message' => 'backtesting.update.400.missingUID', 'error' => 'Missing backtesting_uid'];
            }

            if ($target_uid != $this->backtesting_uid) {
                $set = $this->set_backtesting($target_uid);
                if (!$set['success']) return $set;
            }

            $newData = $this->normalizeInfoInput($newData);

            $fieldsToUpdate = array_intersect(array_keys($newData), self::MUTABLE_FIELDS_INFO);
            if (empty($fieldsToUpdate)) {
                return ['success' => false, 'message' => 'backtesting.update.400.noFields', 'error' => 'No updatable fields provided'];
            }

            $setParts = [];
            $params = [
                'company_uid'     => $this->company_uid,
                'user_uid'        => $this->user_data['user_uid'],
                'backtesting_uid' => $this->backtesting_uid,
            ];

            foreach ($fieldsToUpdate as $f) {
                $setParts[] = "`$f` = :$f";
                $params[$f] = $newData[$f];
            }

            $setParts[] = "`updated_at` = :updated_at";
            $params['updated_at'] = date('Y-m-d H:i:s');

            $sql = "UPDATE `" . self::TABLE_INFO . "`
                    SET " . implode(', ', $setParts) . "
                    WHERE `company_uid`=:company_uid
                      AND `user_uid`=:user_uid
                      AND `backtesting_uid`=:backtesting_uid
                      AND `isDeleted`='0'";

            $stmt = $this->conn->prepare($sql);
            foreach ($params as $k => $v) $stmt->bindValue(":$k", $v);
            $stmt->execute();

            $this->load_data();
            return ['success' => true, 'message' => 'backtesting.update.200.updated', 'data' => $this->info];
        } catch (Throwable $e) {
            return ['success' => false, 'message' => 'backtesting.update.500.fatalError', 'error' => $e->getMessage()];
        }
    }

    /** UPDATE assets: replace totale (delete+insert) */
    public function update_backtestingAssets(array $payload): array
    {
        try {
            $target_uid = $this->backtesting_uid ?? ($payload['backtesting_uid'] ?? null);
            if (!$target_uid) {
                return ['success' => false, 'message' => 'backtesting.assets.400.missingUID', 'error' => 'Missing backtesting_uid'];
            }

            if ($target_uid != $this->backtesting_uid) {
                $set = $this->set_backtesting($target_uid);
                if (!$set['success']) return $set;
            }

            $assets = $this->normalizeAssetsInput($payload['assets'] ?? []);
            if (empty($assets)) {
                return ['success' => false, 'message' => 'backtesting.assets.400.emptyAssets', 'error' => 'Empty assets list'];
            }

            $check = $this->validateAssetsWeights($assets);
            if (!$check['ok']) {
                return ['success' => false, 'message' => 'backtesting.assets.400.invalidWeights', 'error' => "Weights must sum to 100. Current sum: {$check['sum']}"];
            }

            $this->conn->beginTransaction();
            $this->replace_assets($this->backtesting_uid, $assets);

            // aggiorna updated_at info
            $stmt = $this->conn->prepare("UPDATE `" . self::TABLE_INFO . "`
                SET `updated_at` = :u
                WHERE `company_uid`=:c AND `user_uid`=:uu AND `backtesting_uid`=:b AND `isDeleted`='0'");
            $stmt->execute([
                'u'  => date('Y-m-d H:i:s'),
                'c'  => $this->company_uid,
                'uu' => $this->user_data['user_uid'],
                'b'  => $this->backtesting_uid,
            ]);

            $this->conn->commit();

            $this->assets = $this->load_assets();
            return ['success' => true, 'message' => 'backtesting.assets.200.updated', 'data' => $this->assets];
        } catch (Throwable $e) {
            if ($this->conn->inTransaction()) $this->conn->rollBack();
            return ['success' => false, 'message' => 'backtesting.assets.500.fatalError', 'error' => $e->getMessage()];
        }
    }

    private function replace_assets(string $backtesting_uid, array $assets): void
    {
        // wipe
        $stmtD = $this->conn->prepare("DELETE FROM `" . self::TABLE_ASSETS . "`
            WHERE `company_uid` = :company_uid AND `backtesting_uid` = :backtesting_uid");
        $stmtD->execute([
            'company_uid'     => $this->company_uid,
            'backtesting_uid' => $backtesting_uid
        ]);

        // insert batch
        $sqlI = "INSERT INTO `" . self::TABLE_ASSETS . "`
            (`company_uid`, `backtesting_uid`, `symbol`, `weight_pct`)
            VALUES (:company_uid, :backtesting_uid, :symbol, :weight_pct)";
        $stmtI = $this->conn->prepare($sqlI);

        foreach ($assets as $a) {
            $stmtI->execute([
                'company_uid'     => $this->company_uid,
                'backtesting_uid' => $backtesting_uid,
                'symbol'          => $a['symbol'],
                'weight_pct'      => $a['weight_pct'],
            ]);
        }
    }

    /** SOFT DELETE */
    public function delete_backtesting(?string $backtesting_uid = null): array
    {
        try {
            $uid = $backtesting_uid ?? $this->backtesting_uid;
            if (!$uid) {
                return ['success' => false, 'message' => 'backtesting.delete.400.missingUID', 'error' => 'Missing backtesting_uid'];
            }

            $stmt = $this->conn->prepare("UPDATE `" . self::TABLE_INFO . "`
                SET `isDeleted`='1', `updated_at`=:u
                WHERE `company_uid`=:c AND `user_uid`=:uu AND `backtesting_uid`=:b AND `isDeleted`='0'");
            $stmt->execute([
                'u'  => date('Y-m-d H:i:s'),
                'c'  => $this->company_uid,
                'uu' => $this->user_data['user_uid'],
                'b'  => $uid,
            ]);

            return ['success' => true, 'message' => 'backtesting.delete.200.deleted', 'data' => ['backtesting_uid' => $uid]];
        } catch (Throwable $e) {
            return ['success' => false, 'message' => 'backtesting.delete.500.fatalError', 'error' => $e->getMessage()];
        }
    }

    /** GETTERS */
    public function get_backtestingInfo(bool $refresh = false): array
    {
        if ($refresh) $this->load_data();
        return $this->info;
    }

    public function get_backtestingAssets(bool $refresh = false): array
    {
        if ($refresh) $this->assets = $this->load_assets();
        return $this->assets;
    }

    public function get_backtestingData(bool $refresh = false): array
    {
        if ($refresh) $this->load_data();
        $info = $this->info ?: [];
        $info['assets'] = $this->assets;
        return $info;
    }

    public function run_backtesting_series(
        TwelveDataClient $td,
        string $interval = '1month',
        int $years = 10
    ): array {
        try {
            if (!$this->backtesting_uid) {
                return ['success' => false, 'message' => 'backtesting.run.400.missingUID', 'error' => 'Missing backtesting_uid'];
            }

            $info   = $this->get_backtestingInfo(true);
            $assets = $this->get_backtestingAssets(true);

            if (empty($assets)) {
                return ['success' => false, 'message' => 'backtesting.run.400.emptyAssets', 'error' => 'No assets configured'];
            }

            $years = (int)($info['time_horizon_years'] ?? $years);
            $years = max(1, min(50, $years));

            $end = new DateTimeImmutable('now', new DateTimeZone('UTC'));
            $start = $end->modify("-{$years} years");

            $startDate = $start->format('Y-m-d');
            $endDate   = $end->format('Y-m-d');

            $initial = (float)($info['cash_position'] ?? 0);          // investimento iniziale
            $monthly = (float)($info['automatic_savings'] ?? 0);      // PAC mensile

            // --- 1) scarico time_series mensile per ogni asset
            // TwelveData time_series tipicamente ritorna:
            // {status:'ok', meta:{...}, values:[{datetime:'YYYY-MM-DD', open, high, low, close}, ...]}
            $seriesBySymbol = [];
            $datesSet = [];

            foreach ($assets as $a) {
                $symbol = strtoupper(trim((string)($a['symbol'] ?? '')));
                if ($symbol === '') continue;

                $resp = $td->getTimeSeries($symbol, $interval, 600, $startDate, $endDate);

                $values = $resp['values'] ?? $resp['data']['values'] ?? null;
                if (!is_array($values) || empty($values)) {
                    return ['success' => false, 'message' => 'backtesting.run.500.noTimeseries', 'error' => "No time_series for $symbol"];
                }

                // TwelveData spesso ritorna in ordine DESC (più recente prima). Noi vogliamo ASC.
                $valuesAsc = array_reverse($values);

                // Normalizza: date => close(float)
                $map = [];
                foreach ($valuesAsc as $row) {
                    $dt = $row['datetime'] ?? $row['date'] ?? null;
                    $close = $row['close'] ?? null;
                    if (!$dt || !is_numeric($close)) continue;
                    $d = substr((string)$dt, 0, 10);
                    $map[$d] = (float)$close;
                    $datesSet[$d] = true;
                }

                if (empty($map)) {
                    return ['success' => false, 'message' => 'backtesting.run.500.noPrices', 'error' => "No valid close prices for $symbol"];
                }

                $seriesBySymbol[$symbol] = [
                    'weight' => (float)($a['weight_pct'] ?? 0),
                    'prices' => $map,
                ];
            }

            if (empty($seriesBySymbol)) {
                return ['success' => false, 'message' => 'backtesting.run.400.emptyAssets', 'error' => 'No valid assets'];
            }

            // --- 2) timeline mensile comune (intersezione “soft” con forward-fill)
            $allDates = array_keys($datesSet);
            sort($allDates); // ASC

            // taglia a "ultimi N anni" prendendo dalla fine
            $maxPoints = ($interval === '1day')
                ? ($years * 252 + 5)   // ~252 giorni borsa/anno (stima ok)
                : ($years * 12 + 1);

            if (count($allDates) > $maxPoints) {
                $allDates = array_slice($allDates, -$maxPoints);
            }

            // --- 3) inizializzazione shares usando la prima data disponibile nella timeline
            $startDate = $allDates[0];

            $shares = [];
            foreach ($seriesBySymbol as $symbol => $cfg) {
                $w = $cfg['weight'] / 100.0;
                if ($w <= 0) {
                    $shares[$symbol] = 0.0;
                    continue;
                }

                $p0 = $this->priceAtDateForwardFill($cfg['prices'], $allDates, 0);
                if ($p0 <= 0) return ['success' => false, 'message' => 'backtesting.run.500.invalidPrice', 'error' => "Invalid start price for $symbol at $startDate"];

                $alloc0 = $initial * $w;
                $shares[$symbol] = ($alloc0 > 0) ? ($alloc0 / $p0) : 0.0;
            }

            // --- 4) loop mensile: applica PAC e valorizza portfolio
            $portfolioSerie = [];
            $assetSeries = []; // opzionale: serie per asset

            foreach ($seriesBySymbol as $symbol => $_cfg) {
                $assetSeries[$symbol] = [];
            }

            foreach ($allDates as $idx => $date) {
                // PAC: aggiungi shares usando prezzo del mese
                if ($idx > 0 && $monthly > 0) {
                    foreach ($seriesBySymbol as $symbol => $cfg) {
                        $w = $cfg['weight'] / 100.0;
                        if ($w <= 0) continue;

                        $px = $this->priceAtDateForwardFill($cfg['prices'], $allDates, $idx);
                        if ($px <= 0) continue;

                        $contrib = $monthly * $w;
                        $shares[$symbol] += ($contrib / $px);
                    }
                }

                // Valorizzazione
                $total = 0.0;
                foreach ($seriesBySymbol as $symbol => $cfg) {
                    $px = $this->priceAtDateForwardFill($cfg['prices'], $allDates, $idx);
                    $val = ($shares[$symbol] ?? 0.0) * $px;
                    $total += $val;

                    // serie asset (opzionale)
                    $assetSeries[$symbol][] = ['x' => $date, 'y' => round($val, 2)];
                }

                $portfolioSerie[] = ['x' => $date, 'y' => round($total, 2)];
            }

            $nivo = [
                ['id' => 'Portfolio', 'data' => $portfolioSerie],
            ];

            // se vuoi anche le serie per asset, aggiungile:
            foreach ($assetSeries as $symbol => $data) {
                $nivo[] = ['id' => $symbol, 'data' => $data];
            }

            return [
                'success' => true,
                'message' => 'backtesting.run.200.success',
                'data' => [
                    'backtesting_uid' => $this->backtesting_uid,
                    'from' => $allDates[0],
                    'to' => $allDates[count($allDates) - 1],
                    'interval' => '1month',
                    'series' => $nivo,
                ]
            ];
        } catch (Throwable $e) {
            return ['success' => false, 'message' => 'backtesting.run.500.fatalError', 'error' => $e->getMessage()];
        }
    }

    /**
     * Forward-fill: se manca la data, usa l’ultimo prezzo disponibile precedente lungo la timeline.
     */
    private function priceAtDateForwardFill(array $priceMap, array $timeline, int $idx): float
    {
        for ($i = $idx; $i >= 0; $i--) {
            $d = $timeline[$i];
            if (isset($priceMap[$d]) && is_numeric($priceMap[$d])) {
                return (float)$priceMap[$d];
            }
        }
        return 0.0;
    }
}

class backtestingObjList extends backtestingObjBase
{
    /**
     * Listing backtesting
     * Filtri:
     * - search (title)
     * - created_from / created_to (YYYY-MM-DD)
     * - updated_from / updated_to (YYYY-MM-DD)
     * - include_assets (default true)
     * - include_deleted (default false)
     */
    public function get_backtestingsList(array $filters = [], bool $extractAll = false, int $page = 1, int $perPage = 25): array
    {
        try {
            $page    = max(1, $page);
            $perPage = max(1, $perPage);
            $offset  = ($page - 1) * $perPage;

            $wheres = [];
            $params = [];

            $wheres[]              = "`b`.`company_uid` = :company_uid";
            $params['company_uid'] = $this->company_uid;

            $wheres[]             = "`b`.`user_uid` = :user_uid";
            $params['user_uid']   = $this->user_data['user_uid'];

            if (!empty($filters['search'])) {
                $wheres[]         = "`b`.`title` LIKE :search";
                $params['search'] = "%{$filters['search']}%";
            }

            if (!empty($filters['created_from'])) {
                $wheres[]               = "`b`.`created_at` >= :created_from";
                $params['created_from'] = $filters['created_from'] . ' 00:00:00';
            }
            if (!empty($filters['created_to'])) {
                $wheres[]             = "`b`.`created_at` < :created_to";
                $params['created_to'] = date('Y-m-d', strtotime($filters['created_to'] . ' +1 day')) . ' 00:00:00';
            }
            if (!empty($filters['updated_from'])) {
                $wheres[]               = "`b`.`updated_at` >= :updated_from";
                $params['updated_from'] = $filters['updated_from'] . ' 00:00:00';
            }
            if (!empty($filters['updated_to'])) {
                $wheres[]             = "`b`.`updated_at` < :updated_to";
                $params['updated_to'] = date('Y-m-d', strtotime($filters['updated_to'] . ' +1 day')) . ' 00:00:00';
            }

            if (empty($filters['include_deleted'])) {
                $wheres[] = "`b`.`isDeleted` = '0'";
            }

            $whereSql = $wheres ? ('WHERE ' . implode(' AND ', $wheres)) : '';
            $cols = implode(', ', array_map(fn($f) => "`b`.`$f`", self::ALL_FIELDS_INFO));

            $sqlRows = "
                SELECT $cols, `b`.`backtesting_uid`
                FROM `" . self::TABLE_INFO . "` b
                $whereSql
                ORDER BY `b`.`created_at` DESC
            " . (!$extractAll ? "LIMIT :offset, :perPage" : "");

            $stmt = $this->conn->prepare($sqlRows);
            foreach ($params as $k => $v) $stmt->bindValue(":$k", $v);
            if (!$extractAll) {
                $stmt->bindValue(':offset',  $offset,  PDO::PARAM_INT);
                $stmt->bindValue(':perPage', $perPage, PDO::PARAM_INT);
            }
            $stmt->execute();
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

            $includeAssets = array_key_exists('include_assets', $filters) ? (bool)$filters['include_assets'] : true;
            if ($includeAssets && !empty($rows)) {
                $rows = $this->enrichRowsWithAssets($rows);
            }

            $sqlCount = "SELECT COUNT(*) FROM `" . self::TABLE_INFO . "` b $whereSql";
            $stmtCnt = $this->conn->prepare($sqlCount);
            foreach ($params as $k => $v) $stmtCnt->bindValue(":$k", $v);
            $stmtCnt->execute();
            $total = (int)$stmtCnt->fetchColumn();

            $return = [
                'success' => true,
                'message' => 'backtesting.list.200.success',
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
                'message' => 'backtesting.list.500.error',
                'error'   => $e->getMessage()
            ];
        }
    }

    private function enrichRowsWithAssets(array $rows): array
    {
        if (empty($rows)) return $rows;

        $uids = array_column($rows, 'backtesting_uid');
        $uids = array_values(array_filter(array_unique($uids)));
        if (empty($uids)) return $rows;

        $inU = implode(',', array_fill(0, count($uids), '?'));
        $sqlA = "SELECT backtesting_uid, symbol, weight_pct
                 FROM `" . self::TABLE_ASSETS . "`
                 WHERE `company_uid` = ?
                   AND `backtesting_uid` IN ($inU)";
        $stmtA = $this->conn->prepare($sqlA);
        $stmtA->execute(array_merge([$this->company_uid], $uids));
        $allAssets = $stmtA->fetchAll(PDO::FETCH_ASSOC) ?: [];

        $assetsBy = [];
        foreach ($allAssets as $a) {
            $bid = $a['backtesting_uid'];
            $assetsBy[$bid][] = $a;
        }

        foreach ($rows as &$row) {
            $bid = $row['backtesting_uid'];
            $row['assets'] = $assetsBy[$bid] ?? [];
        }
        unset($row);

        return $rows;
    }
}
