<?php
require_once("{$_SERVER['DOCUMENT_ROOT']}/auth/obj/authManager.php");
require_once("{$_SERVER['DOCUMENT_ROOT']}/auth/obj/permsManager.php");
require_once("{$_SERVER['DOCUMENT_ROOT']}/nfo/obj/nfoObj.php");

/**
 * OPERATIONS — Base class con utilità comuni
 */
class operationsObjBase
{
    protected authManager $authManager;
    protected permsManager $permsManager;
    protected PDO $conn;
    protected array $user_data;
    protected string $company_uid;

    // Campi ammessi su data_operations per INSERT/UPDATE (no chiavi primarie/tenant)
    protected const OP_FIELDS_MUTABLE = [
        'symbol',
        'operation',      // 'buy' | 'sell'
        'unitQuantity',   // INT > 0
        'unitaryPrice',   // DECIMAL > 0
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

    /** Verifica se l'operazione è valida (buy|sell) */
    protected static function isValidOperation(?string $op): bool
    {
        return in_array($op, ['buy', 'sell'], true);
    }

    /** Verifica che il valore sia un intero positivo */
    protected static function isPositiveInt($v): bool
    {
        return is_numeric($v) && (int)$v > 0 && (string)(int)$v === (string)$v;
    }

    /** Verifica che il valore sia un numero positivo (float) */
    protected static function isPositiveNumber($v): bool
    {
        return is_numeric($v) && (float)$v > 0;
    }

    /**
     * Normalizza una stringa data/ora in 'Y-m-d H:i:s' se possibile.
     * Accetta già 'Y-m-d H:i:s' o ISO 8601.
     */
    protected static function normalizeDateTime(?string $dt): ?string
    {
        if ($dt === null || $dt === '') return null;
        try {
            $d = new DateTime($dt);
            return $d->format('Y-m-d H:i:s');
        } catch (Throwable $e) {
            return null;
        }
    }
}

/**
 * OPERATIONS — Gestione operazioni per singolo portfolio
 */
class operationsObj extends operationsObjBase
{
    private string $portfolio_uid;
    private string $portfolio_type; // 'custom' | 'managed'
    private ?string $managed_uid = null;

    private array $assetsCurrent = [];
    private float $cashNow = 0.0;
    private float $totalNow = 0.0;

    /** Costruttore: inizializza contesto portfolio e assets correnti */
    public function __construct(authManager $authManager, permsManager $permsManager, string $portfolio_uid)
    {
        parent::__construct($authManager, $permsManager);
        $this->portfolio_uid = $portfolio_uid;
        $this->load_portfolioContext();
        $this->load_portfolioAssets();
    }

    /** Carica info generali del portfolio (tipo, managed_uid, liquidità) */
    private function load_portfolioContext(): void
    {
        $sql = "SELECT `type`, `managed_uid`, `cash_position`
            FROM `data_portfolios_info` WHERE `company_uid` = :company_uid AND `portfolio_uid` = :portfolio_uid
            LIMIT 1
        ";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([
            'company_uid'   => $this->company_uid,
            'portfolio_uid' => $this->portfolio_uid
        ]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            throw new RuntimeException("Portfolio not found or not in company scope");
        }
        $type = $row['type'] ?? '';
        if (!in_array($type, ['custom', 'managed'], true)) {
            throw new RuntimeException("Invalid portfolio type");
        }
        $this->portfolio_type = $type;
        $this->managed_uid    = $row['managed_uid'] ?? null;
        $this->cashNow        = (float)($row['cash_position'] ?? 0);
    }

    /** Carica asset correnti del portfolio con ultimo prezzo disponibile */
    private function load_portfolioAssets(): void
    {
        $sql = "SELECT a.symbol, a.unitQuantity, a.unitaryPrice_lastOp, i.currentPrice
                FROM data_portfolios_assets a
                LEFT JOIN fin_stocks_info i ON a.symbol = i.symbol
                WHERE a.company_uid = :company_uid AND a.portfolio_uid = :portfolio_uid";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([
            'company_uid'   => $this->company_uid,
            'portfolio_uid' => $this->portfolio_uid
        ]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $this->assetsCurrent = [];
        $valueAssets = 0.0;

        foreach ($rows as $r) {
            $symbol = $r['symbol'];
            $qty    = (float)($r['unitQuantity'] ?? 0);
            $price  = is_numeric($r['currentPrice']) ? (float)$r['currentPrice'] : null;

            $this->assetsCurrent[$symbol] = [
                'symbol'             => $symbol,
                'unitQuantity'       => $qty,
                'unitaryPrice_lastOp' => (float)($r['unitaryPrice_lastOp'] ?? 0),
                'unitaryPrice_now'   => $price
            ];

            if ($qty > 0 && $price !== null) {
                $valueAssets += $qty * $price;
            }
        }
        $this->totalNow = $valueAssets + $this->cashNow;
    }

    /** GET operations (eseguite) per questo portfolio
     * Filtri supportati:
     * - symbol (string, match esatto)
     * - operation ('buy'|'sell')
     * - from / to (range su executed_at, string)
     * - order_by (default executed_at DESC)
     * 
     * @return array { success, message, data, error? }
     *   se $extractAll=true => data = array[]
     *   altrimenti => data = { rows: array[], meta: {...} }
     */
    public function get_operations(array $filters = [], bool $extractAll = false, int $page = 1, int $perPage = 25): array
    {
        try {
            // Permesso lettura (opzionale, scommenta se necessario)
            // if (!$this->permsManager->checkUserHasPerm('portfolio.operations.read')) {
            //     return ['success' => false, 'message' => 'operations.403.forbidden', 'error' => 'Forbidden'];
            // }

            $page    = max(1, $page);
            $perPage = max(1, $perPage);
            $offset  = ($page - 1) * $perPage;

            $wheres = [
                "`company_uid` = :company_uid",
                "`portfolio_uid` = :portfolio_uid"
            ];
            $params = [
                'company_uid'   => $this->company_uid,
                'portfolio_uid' => $this->portfolio_uid
            ];

            if (!empty($filters['symbol'])) {
                $wheres[]        = "`symbol` = :symbol";
                $params['symbol'] = $filters['symbol'];
            }
            if (!empty($filters['operation']) && self::isValidOperation($filters['operation'])) {
                $wheres[]            = "`operation` = :operation";
                $params['operation'] = $filters['operation'];
            }
            if (!empty($filters['from'])) {
                $from = self::normalizeDateTime($filters['from']);
                if ($from) {
                    $wheres[]       = "`executed_at` >= :from";
                    $params['from'] = $from;
                }
            }
            if (!empty($filters['to'])) {
                $to = self::normalizeDateTime($filters['to']);
                if ($to) {
                    $wheres[]     = "`executed_at` <= :to";
                    $params['to'] = $to;
                }
            }

            $whereSql = 'WHERE ' . implode(' AND ', $wheres);

            $sql = "
                SELECT SQL_CALC_FOUND_ROWS
                    `operation_uid`, `portfolio_uid`, `managed_uid`, `symbol`, `operation`,
                    `unitQuantity`, `unitaryPrice`, `executed_at`, `updated_at`
                FROM `data_operations`
                $whereSql
                ORDER BY `executed_at` DESC, `operation_uid` DESC
            ";
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
            $total = (int)$this->conn->query("SELECT FOUND_ROWS()")->fetchColumn();

            if ($extractAll) {
                return [
                    'success' => true,
                    'message' => 'operations.list.success',
                    'data'    => $rows
                ];
            }

            $pages_num = (int)ceil(($total ?: 0) / $perPage);
            return [
                'success' => true,
                'message' => 'operations.list.success',
                'data'    => [
                    'rows' => $rows,
                    'meta' => [
                        'items_num' => $total,
                        'pages_num' => $pages_num,
                        'page'      => $page,
                        'per_page'  => $perPage
                    ]
                ]
            ];
        } catch (Throwable $e) {
            return ['success' => false, 'message' => 'operations.list.error', 'error' => $e->getMessage()];
        }
    }

    /** CREATE operation
     * Richiede: symbol, operation('buy'|'sell'), unitQuantity(int>0), unitaryPrice(num>0)
     * Esegue:
     *  - INSERT su data_operations
     *  - UPDATE/INSERT su data_portfolios_assets (qty e unitaryPrice_lastOp)
     *  - UPDATE su data_portfolios_info.cash_position (buy = cassa -, sell = cassa +)
     */
    public function create_operation(array $data): array
    {
        try {
            // Validazioni
            if (empty($data['symbol'])) {
                return ['success' => false, 'message' => 'operations.400.missingSymbol', 'error' => 'Missing symbol'];
            }
            if (!self::isValidOperation($data['operation'] ?? null)) {
                return ['success' => false, 'message' => 'operations.400.invalidOperation', 'error' => 'operation must be buy|sell'];
            }
            if (!self::isPositiveInt($data['unitQuantity'] ?? null)) {
                return ['success' => false, 'message' => 'operations.400.invalidQty', 'error' => 'unitQuantity must be positive int'];
            }
            if (!self::isPositiveNumber($data['unitaryPrice'] ?? null)) {
                return ['success' => false, 'message' => 'operations.400.invalidPrice', 'error' => 'unitaryPrice must be > 0'];
            }

            $qty   = (int)$data['unitQuantity'];
            $price = (float)$data['unitaryPrice'];
            $sym   = $data['symbol'];
            $op    = $data['operation']; // buy|sell

            $this->conn->beginTransaction();

            // 0) Lock cassa (per coerenza in concorrenza)
            $stmtLock = $this->conn->prepare("SELECT cash_position FROM data_portfolios_info
                WHERE company_uid = :company_uid AND portfolio_uid = :portfolio_uid
                FOR UPDATE
            ");
            $stmtLock->execute([
                'company_uid'   => $this->company_uid,
                'portfolio_uid' => $this->portfolio_uid
            ]);
            $cashRow = $stmtLock->fetch(PDO::FETCH_ASSOC);
            if (!$cashRow) {
                throw new RuntimeException('Portfolio not found while locking cash_position');
            }

            // 1) INSERT operazione
            $op_uid = $this->authManager->generateUniqueUID('data_operations', 'operation_uid');
            $fields = [
                'company_uid'   => $this->company_uid,
                'operation_uid' => $op_uid,
                'portfolio_uid' => $this->portfolio_uid,
                'managed_uid'   => ($this->portfolio_type === 'managed') ? ($this->managed_uid ?? null) : null,
                'symbol'        => $sym,
                'operation'     => $op,
                'unitQuantity'  => $qty,
                'unitaryPrice'  => $price,
            ];
            $cols = implode(', ', array_map(fn($k) => "`$k`", array_keys($fields)));
            $vals = implode(', ', array_map(fn($k) => ":$k", array_keys($fields)));
            $stmtIns = $this->conn->prepare("INSERT INTO `data_operations` ($cols) VALUES ($vals)");
            $stmtIns->execute($fields);

            // 2) Aggiorna asset
            $stmtCheck = $this->conn->prepare("SELECT unitQuantity FROM data_portfolios_assets
                WHERE company_uid = :company_uid AND portfolio_uid = :portfolio_uid AND symbol = :symbol
                FOR UPDATE
            ");
            $stmtCheck->execute([
                'company_uid'   => $this->company_uid,
                'portfolio_uid' => $this->portfolio_uid,
                'symbol'        => $sym
            ]);
            $assetRow   = $stmtCheck->fetch(PDO::FETCH_ASSOC);
            $currentQty = (int)($assetRow['unitQuantity'] ?? 0);
            $newQty     = $op === 'buy' ? $currentQty + $qty : $currentQty - $qty;
            if ($newQty < 0) $newQty = 0;

            if ($assetRow) {
                $stmtU = $this->conn->prepare("UPDATE data_portfolios_assets
                    SET unitQuantity = :qty, unitaryPrice_lastOp = :price
                    WHERE company_uid = :company_uid AND portfolio_uid = :portfolio_uid AND symbol = :symbol
                ");
                $stmtU->execute([
                    'qty'          => $newQty,
                    'price'        => $price,
                    'company_uid'  => $this->company_uid,
                    'portfolio_uid' => $this->portfolio_uid,
                    'symbol'       => $sym
                ]);
            } else {
                if ($op === 'buy' && $newQty > 0) {
                    $stmtI = $this->conn->prepare("INSERT INTO data_portfolios_assets
                        (company_uid, portfolio_uid, symbol, unitQuantity, unitaryPrice_lastOp)
                        VALUES (:company_uid, :portfolio_uid, :symbol, :qty, :price)
                    ");
                    $stmtI->execute([
                        'company_uid'  => $this->company_uid,
                        'portfolio_uid' => $this->portfolio_uid,
                        'symbol'       => $sym,
                        'qty'          => $newQty,
                        'price'        => $price
                    ]);
                }
            }

            // 3) Aggiorna cassa
            // buy  -> cash -= qty*price
            // sell -> cash += qty*price
            $deltaCash = ($op === 'buy' ? -1 : +1) * ($qty * $price);
            $stmtCash = $this->conn->prepare("UPDATE data_portfolios_info
                SET cash_position = cash_position + :delta
                WHERE company_uid = :company_uid AND portfolio_uid = :portfolio_uid
            ");
            $stmtCash->execute([
                'delta'        => $deltaCash,
                'company_uid'  => $this->company_uid,
                'portfolio_uid' => $this->portfolio_uid
            ]);

            $this->conn->commit();

            $row = $this->load_operation_row($op_uid);
            return ['success' => true, 'message' => 'operations.created', 'data' => $row];
        } catch (Throwable $e) {
            if ($this->conn->inTransaction()) $this->conn->rollBack();
            return ['success' => false, 'message' => 'operations.create.error', 'error' => $e->getMessage()];
        }
    }

    /** UPSERT operation (solo modifica campi ammessi)
     * - CUSTOM: può aggiornare unitQuantity e unitaryPrice (opzionali, almeno uno)
     * - MANAGED: può aggiornare SOLO unitaryPrice
     * Effetti: aggiorna data_operations, poi applica i delta a data_portfolios_assets e data_portfolios_info.cash_position
     */
    public function upsert_operation(string $operation_uid, array $data): array
    {
        try {
            // Carico e verifico ownership
            $current = $this->load_operation_row($operation_uid);
            if (!$current) {
                return ['success' => false, 'message' => 'operations.404.notFound', 'error' => 'Operation not found'];
            }
            if (($current['company_uid'] ?? '') !== $this->company_uid || ($current['portfolio_uid'] ?? '') !== $this->portfolio_uid) {
                return ['success' => false, 'message' => 'operations.403.forbidden', 'error' => 'Forbidden'];
            }

            $op = $current['operation']; // buy|sell (immutabile qui)
            $oldQty   = (int)$current['unitQuantity'];
            $oldPrice = (float)$current['unitaryPrice'];

            $setParts = [];
            $params = [
                'company_uid'   => $this->company_uid,
                'portfolio_uid' => $this->portfolio_uid,
                'operation_uid' => $operation_uid
            ];

            // Regole per tipo
            $newQty   = $oldQty;
            $newPrice = $oldPrice;

            if ($this->portfolio_type === 'custom') {
                $wantQty   = array_key_exists('unitQuantity', $data);
                $wantPrice = array_key_exists('unitaryPrice', $data);
                if (!$wantQty && !$wantPrice) {
                    return ['success' => false, 'message' => 'operations.400.nothingToUpdate', 'error' => 'No fields provided'];
                }

                if ($wantQty) {
                    if (!self::isPositiveInt($data['unitQuantity'])) {
                        return ['success' => false, 'message' => 'operations.400.invalidQty', 'error' => 'unitQuantity must be positive int'];
                    }
                    $newQty = (int)$data['unitQuantity'];
                    $setParts[]             = "`unitQuantity` = :unitQuantity";
                    $params['unitQuantity'] = $newQty;
                }
                if ($wantPrice) {
                    if (!self::isPositiveNumber($data['unitaryPrice'])) {
                        return ['success' => false, 'message' => 'operations.400.invalidPrice', 'error' => 'unitaryPrice must be > 0'];
                    }
                    $newPrice = (float)$data['unitaryPrice'];
                    $setParts[]             = "`unitaryPrice` = :unitaryPrice";
                    $params['unitaryPrice'] = $newPrice;
                }
            } else { // managed
                if (array_key_exists('unitQuantity', $data)) {
                    return ['success' => false, 'message' => 'operations.400.forbiddenFieldForManaged', 'error' => 'unitQuantity cannot be changed for managed portfolios'];
                }
                if (!array_key_exists('unitaryPrice', $data)) {
                    return ['success' => false, 'message' => 'operations.400.nothingToUpdate', 'error' => 'No fields provided'];
                }
                if (!self::isPositiveNumber($data['unitaryPrice'])) {
                    return ['success' => false, 'message' => 'operations.400.invalidPrice', 'error' => 'unitaryPrice must be > 0'];
                }
                $newPrice = (float)$data['unitaryPrice'];
                $setParts[]             = "`unitaryPrice` = :unitaryPrice";
                $params['unitaryPrice'] = $newPrice;
            }

            if (empty($setParts)) {
                return ['success' => true, 'message' => 'operations.upsert.noChanges', 'data' => $current];
            }

            // Calcolo delta (rispetto ai valori precedenti)
            $deltaQty   = $newQty - $oldQty;                 // variazione quantità operata
            $signCash   = ($op === 'buy') ? -1 : +1;         // effetto su cassa
            $oldValue   = $oldQty * $oldPrice;
            $newValue   = $newQty * $newPrice;
            $deltaCash  = $signCash * ($newValue - $oldValue);
            $deltaAsset = ($op === 'buy') ? +$deltaQty : -$deltaQty;

            $this->conn->beginTransaction();

            // 0) Lock cassa per aggiornamento coerente
            $stmtLock = $this->conn->prepare("SELECT cash_position FROM data_portfolios_info
                WHERE company_uid = :company_uid AND portfolio_uid = :portfolio_uid
                FOR UPDATE
            ");
            $stmtLock->execute([
                'company_uid'   => $this->company_uid,
                'portfolio_uid' => $this->portfolio_uid
            ]);
            if (!$stmtLock->fetch(PDO::FETCH_ASSOC)) {
                throw new RuntimeException('Portfolio not found while locking cash_position');
            }

            // 1) Update operazione
            $sql = "UPDATE `data_operations`
                SET " . implode(', ', $setParts) . "
                WHERE `company_uid` = :company_uid
                  AND `portfolio_uid` = :portfolio_uid
                  AND `operation_uid` = :operation_uid
                LIMIT 1
            ";
            $stmt = $this->conn->prepare($sql);
            $stmt->execute($params);

            // 2) Aggiorna asset (apply delta)
            $sym = $current['symbol'];
            $stmtCheck = $this->conn->prepare("SELECT unitQuantity FROM data_portfolios_assets
                WHERE company_uid = :company_uid AND portfolio_uid = :portfolio_uid AND symbol = :symbol
                FOR UPDATE
            ");
            $stmtCheck->execute([
                'company_uid'   => $this->company_uid,
                'portfolio_uid' => $this->portfolio_uid,
                'symbol'        => $sym
            ]);
            $assetRow   = $stmtCheck->fetch(PDO::FETCH_ASSOC);
            $curQty     = (int)($assetRow['unitQuantity'] ?? 0);
            $newQtyAsset = $curQty + $deltaAsset;
            if ($newQtyAsset < 0) $newQtyAsset = 0;

            if ($assetRow) {
                $stmtU = $this->conn->prepare("
                UPDATE data_portfolios_assets
                SET unitQuantity = :qty, unitaryPrice_lastOp = :price
                WHERE company_uid = :company_uid AND portfolio_uid = :portfolio_uid AND symbol = :symbol
            ");
                $stmtU->execute([
                    'qty'          => $newQtyAsset,
                    'price'        => $newPrice, // ultimo prezzo dell’ultima operazione
                    'company_uid'  => $this->company_uid,
                    'portfolio_uid' => $this->portfolio_uid,
                    'symbol'       => $sym
                ]);
            } else {
                // Se prima non esisteva riga e l'operazione è buy con qty > 0 post-delta → crea
                if ($op === 'buy' && $newQtyAsset > 0) {
                    $stmtI = $this->conn->prepare("
                    INSERT INTO data_portfolios_assets
                    (company_uid, portfolio_uid, symbol, unitQuantity, unitaryPrice_lastOp)
                    VALUES (:company_uid, :portfolio_uid, :symbol, :qty, :price)
                ");
                    $stmtI->execute([
                        'company_uid'  => $this->company_uid,
                        'portfolio_uid' => $this->portfolio_uid,
                        'symbol'       => $sym,
                        'qty'          => $newQtyAsset,
                        'price'        => $newPrice
                    ]);
                }
                // Se non esiste e l'operazione è sell, non si inserisce nulla (non ha senso avere qty 0)
            }

            // 3) Aggiorna cassa con il delta
            $stmtCash = $this->conn->prepare("UPDATE data_portfolios_info
                SET cash_position = cash_position + :delta
                WHERE company_uid = :company_uid AND portfolio_uid = :portfolio_uid
            ");
            $stmtCash->execute([
                'delta'        => $deltaCash,
                'company_uid'  => $this->company_uid,
                'portfolio_uid' => $this->portfolio_uid
            ]);

            $this->conn->commit();

            $rowFinal = $this->load_operation_row($operation_uid);
            return ['success' => true, 'message' => 'operations.upserted', 'data' => $rowFinal];
        } catch (Throwable $e) {
            if ($this->conn->inTransaction()) $this->conn->rollBack();
            return ['success' => false, 'message' => 'operations.upsert.error', 'error' => $e->getMessage()];
        }
    }


    /** Carica una singola riga operazione dal DB */
    private function load_operation_row(string $operation_uid): ?array
    {
        $sql = "SELECT `company_uid`, `operation_uid`, `portfolio_uid`, `managed_uid`, `symbol`, `operation`,
                       `unitQuantity`, `unitaryPrice`, `executed_at`, `updated_at`
                FROM `data_operations`
                WHERE `company_uid` = :company_uid
                  AND `portfolio_uid` = :portfolio_uid
                  AND `operation_uid` = :operation_uid
                LIMIT 1";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([
            'company_uid'   => $this->company_uid,
            'portfolio_uid' => $this->portfolio_uid,
            'operation_uid' => $operation_uid
        ]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
        return $row ?: null;
    }

    /** Recupera contesto NFO per un managed portfolio (report + alerts) */
    public function get_nfoDerivedContext(): array
    {
        if ($this->portfolio_type !== 'managed' || empty($this->managed_uid)) {
            return [
                'success' => false,
                'message' => 'operations.nfoContext.notManaged',
                'error'   => 'This portfolio is not managed or missing managed_uid'
            ];
        }

        try {
            $nfoList = new nfoObjList($this->authManager, $this->permsManager);

            // 1) Ultimo report valido
            $lastReport = $nfoList->get_lastValidReport($this->managed_uid);
            if (!$lastReport['success']) {
                return [
                    'success' => false,
                    'message' => 'operations.nfoContext.noReport',
                    'error'   => $lastReport['error'] ?? 'No report found'
                ];
            }
            $reportData = $lastReport['data'] ?? null;

            // 2) Alert validi successivi al report
            $alertsRes = $nfoList->get_allValidAlerts($this->managed_uid, true);
            if (!$alertsRes['success']) {
                return [
                    'success' => false,
                    'message' => 'operations.nfoContext.alertsFailed',
                    'error'   => $alertsRes['error'] ?? 'Failed fetching alerts'
                ];
            }
            $alerts = $alertsRes['data'] ?? [];

            // 3) Carico assets per ogni alert
            foreach ($alerts as &$a) {
                $stmtA = $this->conn->prepare("SELECT symbol, operator, percentage
                    FROM `nfo_alert_assets` WHERE company_uid = :company_uid
                        AND nfo_uid = :nfo_uid
                    ORDER BY symbol ASC
                ");
                $stmtA->execute([
                    'company_uid' => $this->company_uid,
                    'nfo_uid'     => $a['nfo_uid']
                ]);
                $a['assets'] = $stmtA->fetchAll(PDO::FETCH_ASSOC);
            }

            return [
                'success' => true,
                'message' => 'operations.nfoContext.success',
                'data'    => [
                    'report' => $reportData,
                    'alerts' => $alerts
                ]
            ];
        } catch (Throwable $e) {
            return [
                'success' => false,
                'message' => 'operations.nfoContext.failed',
                'error'   => $e->getMessage()
            ];
        }
    }


    /** Operazioni da REPORT */
    private function compute_alignmentOperations(array $report): array
    {
        try {
            if (($report['type'] ?? '') !== 'report') {
                return ['success' => false, 'message' => 'operations.align.invalidReport', 'error' => 'Invalid report'];
            }

            $assetsReport = $report['assets'] ?? [];
            if (empty($assetsReport)) {
                return ['success' => false, 'message' => 'operations.align.noAssets', 'error' => 'Report has no assets'];
            }

            if ($this->totalNow <= 0) {
                return ['success' => false, 'message' => 'operations.align.noValue', 'error' => 'Portfolio has no value'];
            }

            $sumPerc  = array_sum(array_column($assetsReport, 'percentage'));
            $warnings = [];
            $operations = [];

            foreach ($assetsReport as $r) {
                $symbol      = $r['symbol'];
                $pct         = (float)$r['percentage'];
                $targetValue = $this->totalNow * ($pct / 100.0);

                $currentPrice = $this->assetsCurrent[$symbol]['unitaryPrice_now'] ?? null;
                if (!$currentPrice || $currentPrice <= 0) {
                    $warnings[] = "Missing current price for $symbol, skipped.";
                    continue;
                }

                $desiredUnits = (int)floor($targetValue / $currentPrice);
                $currentUnits = $this->assetsCurrent[$symbol]['unitQuantity'] ?? 0;

                $delta = $desiredUnits - $currentUnits;
                if ($delta > 0) {
                    $operations[] = ['symbol' => $symbol, 'operation' => 'buy', 'unitQuantity' => $delta, 'unitaryPrice' => $currentPrice];
                } elseif ($delta < 0) {
                    $operations[] = ['symbol' => $symbol, 'operation' => 'sell', 'unitQuantity' => abs($delta), 'unitaryPrice' => $currentPrice];
                }
            }

            // Vendere asset fuori dal report
            foreach ($this->assetsCurrent as $sym => $a) {
                if (!in_array($sym, array_column($assetsReport, 'symbol'))) {
                    if (($a['unitQuantity'] ?? 0) > 0 && ($a['unitaryPrice_now'] ?? 0) > 0) {
                        $operations[] = [
                            'symbol' => $sym,
                            'operation' => 'sell',
                            'unitQuantity' => (int)$a['unitQuantity'],
                            'unitaryPrice' => (float)$a['unitaryPrice_now']
                        ];
                    }
                }
            }

            return [
                'success' => true,
                'message' => 'operations.align.ok',
                'data' => [
                    'operations' => $operations,
                    'nfo_info' => $report,
                    'total_value' => $this->totalNow,
                    'cash_now' => $this->cashNow,
                    'report_pct' => $sumPerc,
                    'cash_target' => 100.0 - $sumPerc,
                    'warnings' => $warnings
                ]
            ];
        } catch (Throwable $e) {
            return ['success' => false, 'message' => 'operations.align.error', 'error' => $e->getMessage()];
        }
    }

    /** Operazioni da ALERTS */
    private function compute_alertOperations(array $alerts): array
    {
        try {
            if (empty($alerts)) {
                return ['success' => false, 'message' => 'operations.alerts.noAlerts', 'error' => 'No alerts provided'];
            }

            $operationsByAlert = [];

            foreach ($alerts as $alert) {
                $alertUid    = $alert['nfo_uid'] ?? null;
                $assetsAlert = $alert['assets'] ?? [];
                $ops         = [];
                $warnings    = [];

                foreach ($assetsAlert as $r) {
                    $symbol    = $r['symbol'] ?? null;
                    $opDir     = $r['operator'] ?? null;       // 'buy' | 'sell' (dall'alert, ora VINCOLANTE)
                    $pct       = isset($r['percentage']) ? (float)$r['percentage'] : null;

                    if (!$symbol || !in_array($opDir, ['buy', 'sell'], true) || $pct === null || $pct < 0) {
                        $warnings[] = "Invalid alert row for symbol '{$symbol}': operator or percentage missing/invalid.";
                        continue;
                    }

                    // Unità attuali in portafoglio per il simbolo (0 se non presente)
                    $currentUnits = (int)($this->assetsCurrent[$symbol]['unitQuantity'] ?? 0);

                    // Quantità da comprare/vendere = floor(currentUnits * pct / 100)
                    // Se non possiedo il titolo e devo comprare, con questa regola risulterebbe 0: nessuna operazione.
                    $deltaUnits = (int)floor($currentUnits * ($pct / 100.0));

                    if ($deltaUnits <= 0) {
                        // Nessuna operazione se l’arrotondamento dà 0
                        continue;
                    }

                    // Prezzo corrente richiesto per quotare l’operazione
                    $currentPrice = $this->assetsCurrent[$symbol]['unitaryPrice_now'] ?? null;
                    if (!$currentPrice || $currentPrice <= 0) {
                        $warnings[] = "Missing current price for {$symbol}, skipped.";
                        continue;
                    }

                    if ($opDir === 'sell') {
                        // Non vendere più di quanto si possiede (in teoria deltaUnits <= currentUnits già, ma per sicurezza)
                        $qtyToSell = min($deltaUnits, $currentUnits);
                        if ($qtyToSell <= 0) {
                            continue;
                        }
                        $ops[] = [
                            'symbol'       => $symbol,
                            'operation'    => 'sell',
                            'unitQuantity' => $qtyToSell,
                            'unitaryPrice' => (float)$currentPrice,
                        ];
                    } else { // buy
                        $ops[] = [
                            'symbol'       => $symbol,
                            'operation'    => 'buy',
                            'unitQuantity' => $deltaUnits,
                            'unitaryPrice' => (float)$currentPrice,
                        ];
                    }
                }

                $operationsByAlert[$alertUid] = [
                    'operations'   => $ops,
                    'nfo_info'     => $alert,
                    'warnings'     => $warnings,
                    'alert_title'  => $alert['title'] ?? null,
                    'scheduled_at' => $alert['scheduled_at'] ?? null
                ];
            }

            return [
                'success' => true,
                'message' => 'operations.alerts.ok',
                'data'    => [
                    'operations_byAlert' => $operationsByAlert,
                    // Questi due campi restano per compatibilità, ma non influenzano più i calcoli alert
                    'total_value' => $this->totalNow,
                    'cash_now'    => $this->cashNow
                ]
            ];
        } catch (Throwable $e) {
            return ['success' => false, 'message' => 'operations.alerts.error', 'error' => $e->getMessage()];
        }
    }

    /** Wrapper: restituisce insieme le operazioni derivate da report e alerts */
    public function get_nfoDerivedOperations(): array
    {
        $ctx = $this->get_nfoDerivedContext();
        if (!$ctx['success']) {
            return $ctx;
        }

        $report = $ctx['data']['report'] ?? null;
        $alerts = $ctx['data']['alerts'] ?? [];

        $opsReport = $report ? $this->compute_alignmentOperations($report) : null;
        $opsAlerts = !empty($alerts) ? $this->compute_alertOperations($alerts) : null;

        return [
            'success' => true,
            'message' => 'operations.nfoDerived.success',
            'data'    => [
                'report_operations' => $opsReport['data'] ?? null,
                'alert_operations'  => $opsAlerts['data'] ?? null
            ]
        ];
    }
}
