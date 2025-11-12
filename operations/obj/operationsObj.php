<?php
require_once("{$_SERVER['DOCUMENT_ROOT']}/auth/obj/authManager.php");
require_once("{$_SERVER['DOCUMENT_ROOT']}/auth/obj/permsManager.php");
require_once("{$_SERVER['DOCUMENT_ROOT']}/nfo/obj/nfoObj.php");
require_once("{$_SERVER['DOCUMENT_ROOT']}/portfolios/obj/portfoliosObj.php");
require_once("{$_SERVER['DOCUMENT_ROOT']}/financialData/obj/StockPriceProvider.php");

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

    protected StockPriceProvider $priceProv;

    public const CASH_SYMBOL = 'CASH_EUR'; // o 'CASH_POSITION'

    protected const OP_FIELDS_INSERT = ['symbol', 'operation', 'unitQuantity', 'unitaryPrice', 'source', 'nfo_uid'];
    protected const OP_FIELDS_UPDATE = ['unitQuantity', 'unitaryPrice'];

    public function __construct(authManager $authManager, permsManager $permsManager)
    {
        $this->authManager  = $authManager;
        $this->permsManager = $permsManager;
        $this->conn         = $authManager->get_dbConn();
        $this->user_data    = $authManager->get_userData();
        $this->company_uid  = $this->user_data['company_uid'];

        $this->priceProv = new StockPriceProvider($authManager);
    }

    /** Filters */
    /** Mantiene solo i campi consentiti in INSERT */
    protected static function filterInsertFields(array $data): array
    {
        return array_intersect_key($data, array_flip(self::OP_FIELDS_INSERT));
    }

    /** Mantiene solo i campi consentiti in UPDATE */
    protected static function filterUpdateFields(array $data): array
    {
        return array_intersect_key($data, array_flip(self::OP_FIELDS_UPDATE));
    }

    /** UTILS */
    protected static function isValidOperation(?string $op): bool
    {
        return in_array($op, ['buy', 'sell', 'deposit', 'withdraw'], true);
    }
    protected static function isCashSymbol(?string $sym): bool
    {
        return is_string($sym) && strtoupper($sym) === self::CASH_SYMBOL;
    }

    /** Verifica che il valore sia un intero positivo */
    protected static function isPositiveInt($v): bool
    {
        return is_numeric($v) && (int)$v > 0 && (string)(int)$v === (string)$v;
    }

    /** Verifica che il valore sia un numero positivo (float) */
    protected static function isPositiveNumber($v): bool
    {
        return is_numeric($v) && (float)$v >= 0;
    }

    /**
     * Sanitizza una stringa data/ora gestendo:
     * - URL encoding (%3A, +) e residui "3A" al posto di ":"
     * - separatore 'T' ISO 8601
     */
    protected static function sanitizeDateTimeString(?string $dt): ?string
    {
        if ($dt === null) return null;

        $s = trim($dt);
        if ($s === '') return null;

        // 1) decodifica URL (trasforma "%3A" in ":", "+" in spazio, ecc.)
        //    Se è già decodificata, non fa danni.
        $s = urldecode($s);

        // 2) fallback: se restano '+' (edge-case), sostituisci con spazio
        $s = str_replace('+', ' ', $s);

        // 3) ISO: separa data/ora "2025-10-01T00:00:00" -> "2025-10-01 00:00:00"
        $s = str_replace(['T', 't'], ' ', $s);

        // 4) casi sporchi tipo "00 3A 00 3A 00" o "003A003A00" -> usa ":" dove compare "3A" tra cifre
        //    (lasciamo intatte eventuali "3A" non fra cifre)
        $s = preg_replace('/(?<=\d)3A(?=\d)/', ':', $s);

        // 5) normalizza spazi multipli
        $s = preg_replace('/\s+/', ' ', $s);

        return trim($s);
    }

    /**
     * Normalizza una data/ora in 'Y-m-d H:i:s'.
     * - Se arriva solo la data, completa con 00:00:00 o 23:59:59 in base a $endOfDay.
     * - Se arriva data+HH:MM, aggiunge :00.
     * - Accetta formati già ISO/SQL o sporchi ma sanificabili.
     */
    protected static function normalizeDateTime(?string $dt, bool $endOfDay = false): ?string
    {
        $s = self::sanitizeDateTimeString($dt);
        if ($s === null) return null;

        // Solo data -> completa
        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $s)) {
            $s .= $endOfDay ? ' 23:59:59' : ' 00:00:00';
        }
        // Data + HH:MM -> aggiungi :00
        elseif (preg_match('/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}$/', $s)) {
            $s .= ':00';
        }

        try {
            $d = new DateTime($s);
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
    // Portfoglio Context
    private string $portfolio_uid;
    private array $portfolio_info = [];
    private array $portfolio_assets = [];

    // NFO Context
    private array $validReport = [];
    private array $allValidAlerts = [];

    private float $totalNow = 0.0;

    /** Costruttore: inizializza contesto portfolio e assets correnti */
    public function __construct(authManager $authManager, permsManager $permsManager, string $portfolio_uid)
    {
        parent::__construct($authManager, $permsManager);
        $this->load_portfolioContext($portfolio_uid);

        if ($this->portfolio_info['type'] === 'managed') {
            $this->load_nfoContext($this->portfolio_info['managed_uid']);
        }
    }

    private function load_portfolioContext(string $portfolio_uid)
    {
        $portObj = new portfolioObj($this->authManager, $this->permsManager, $portfolio_uid);
        $this->portfolio_info = $portObj->get_portfolioInfo();
        $this->portfolio_assets = $portObj->get_portfolioAssets();
        $this->portfolio_uid = $portfolio_uid;
    }

    private function load_nfoContext(string $managed_uid)
    {
        $nfoList = new nfoObjList($this->authManager, $this->permsManager);

        $resp_valReport = $nfoList->get_lastValidReport($managed_uid);
        if (!$resp_valReport['success']) {
            throw new Exception($resp_valReport['error']);
        }
        $this->validReport = $resp_valReport['data'] ?? null;

        $resp_valAlerts = $nfoList->get_allValidAlerts($managed_uid);
        if (!$resp_valAlerts['success']) {
            throw new Exception($resp_valAlerts['error']);
        }
        $this->allValidAlerts = $resp_valAlerts['data'] ?? null;
    }

    /** GET operations (eseguite) per questo portfolio
     * Filtri supportati:
     * - symbol (string, match esatto)
     * - operation ('buy'|'sell')
     * - from / to (range su created_at, string)
     * - order_by (default created_at DESC)
     * 
     * @return array { success, message, data, error? }
     *   se $extractAll=true => data = array[]
     *   altrimenti => data = { rows: array[], meta: {...} }
     */
    public function get_operations(array $filters = [], bool $extractAll = false, int $page = 1, int $perPage = 25): array
    {
        try {
            $page    = max(1, $page);
            $perPage = max(1, $perPage);
            $offset  = ($page - 1) * $perPage;

            $wheres = ["`company_uid` = :company_uid", "`portfolio_uid` = :portfolio_uid"];
            $params = ['company_uid' => $this->company_uid, 'portfolio_uid' => $this->portfolio_uid];

            if (!empty($filters['symbol'])) {
                $wheres[] = "`symbol` LIKE :symbol";
                $params['symbol'] = '%' . $filters['symbol'] . '%';
            }
            if (!empty($filters['operation']) && self::isValidOperation($filters['operation'])) {
                $wheres[] = "`operation`=:operation";
                $params['operation'] = $filters['operation'];
            }
            if (!empty($filters['from'])) {
                $from = self::normalizeDateTime($filters['from']);
                if ($from) {
                    $wheres[] = "`created_at` >= :from";
                    $params['from'] = $from;
                }
            }
            if (!empty($filters['to'])) {
                $to = self::normalizeDateTime($filters['to']);
                if ($to) {
                    $wheres[] = "`created_at` <= :to";
                    $params['to'] = $to;
                }
            }

            $whereSql = 'WHERE ' . implode(' AND ', $wheres);

            $sqlRows = "SELECT `operation_uid`, `portfolio_uid`, `managed_uid`, `symbol`, `operation`,
                           `unitQuantity`, `unitaryPrice`, `created_at`, `updated_at`
                    FROM `data_operations`
                    $whereSql
                    ORDER BY `created_at` DESC, `operation_uid` DESC";
            if (!$extractAll) $sqlRows .= " LIMIT :offset, :perPage";

            $stmt = $this->conn->prepare($sqlRows);
            foreach ($params as $k => $v) $stmt->bindValue(":$k", $v);
            if (!$extractAll) {
                $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
                $stmt->bindValue(':perPage', $perPage, PDO::PARAM_INT);
            }
            $stmt->execute();
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

            if ($extractAll) return ['success' => true, 'message' => 'operations.list.success', 'data' => $rows];

            $sqlCnt = "SELECT COUNT(*) FROM `data_operations` $whereSql";
            $stmtCnt = $this->conn->prepare($sqlCnt);
            foreach ($params as $k => $v) $stmtCnt->bindValue(":$k", $v);
            $stmtCnt->execute();
            $total = (int)$stmtCnt->fetchColumn();

            $pages_num = (int)ceil(($total ?: 0) / $perPage);
            return [
                'success' => true,
                'message' => 'operations.list.success',
                'data' => [
                    'rows' => $rows,
                    'meta' => [
                        'items_num' => $total,
                        'pages_num' => $pages_num,
                        'page' => $page,
                        'per_page' => $perPage
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
            // tieni solo i campi ammessi per INSERT (gli altri li ignoriamo silenziosamente)
            $data = self::filterInsertFields($data);
            $source  = $data['source']  ?? 'manual';
            $nfo_uid = $data['nfo_uid'] ?? null;

            // 1) Validazione base
            $op = $data['operation'] ?? null;
            if (!self::isValidOperation($op)) {
                return ['success' => false, 'message' => 'operations.400.invalidOperation', 'error' => 'operation must be buy|sell|deposit|withdraw'];
            }

            // 2) RAMO CASSA: deposit | withdraw
            if (in_array($op, ['deposit', 'withdraw'], true)) {
                if (!array_key_exists('unitaryPrice', $data) || !self::isPositiveNumber($data['unitaryPrice']) || (float)$data['unitaryPrice'] <= 0) {
                    return ['success' => false, 'message' => 'operations.400.invalidPrice', 'error' => 'unitaryPrice must be > 0'];
                }
                if (!in_array($source, ['manual', 'auto'], true)) {
                    return ['success' => false, 'message' => 'operations.400.invalidSource', 'error' => "Invalid source $source"];
                }

                $amount = round((float)$data['unitaryPrice'], 2); // per i confronti

                $this->conn->beginTransaction();

                // lock cassa
                $stmtLock = $this->conn->prepare("SELECT cash_position 
                    FROM data_portfolios_info WHERE company_uid = :company_uid AND portfolio_uid = :portfolio_uid
                    FOR UPDATE
                ");
                $stmtLock->execute([
                    'company_uid'   => $this->company_uid,
                    'portfolio_uid' => $this->portfolio_uid
                ]);
                $cashRow = $stmtLock->fetch(PDO::FETCH_ASSOC);
                if (!$cashRow) {
                    $this->conn->rollBack();
                    return ['success' => false, 'message' => 'operations.404.portfolioNotFound', 'error' => 'Portfolio not found'];
                }

                if ($op === 'withdraw' && (float)$cashRow['cash_position'] < $amount) {
                    $this->conn->rollBack();
                    return ['success' => false, 'message' => 'operations.400.insufficientCash', 'error' => 'Insufficient cash'];
                }

                // aggiorna cassa
                $deltaCash = round(($op === 'deposit' ? +1 : -1) * $amount, 2);
                $stmtCash = $this->conn->prepare("
                    UPDATE data_portfolios_info
                    SET cash_position = cash_position + :delta
                    WHERE company_uid = :company_uid AND portfolio_uid = :portfolio_uid
                ");
                $stmtCash->execute([
                    'delta'        => (string)$deltaCash,
                    'company_uid'  => $this->company_uid,
                    'portfolio_uid' => $this->portfolio_uid
                ]);

                // log operazione
                $op_uid     = $this->authManager->generateUniqueUID('data_operations', 'operation_uid');
                $managedUid = ($this->portfolio_info['type'] === 'managed' && $this->portfolio_info['managed_uid'] !== null) ? $this->portfolio_info['managed_uid'] : null;

                $stmtIns = $this->conn->prepare("
                    INSERT INTO `data_operations`
                        (`company_uid`, `operation_uid`, `portfolio_uid`, `managed_uid`,
                        `symbol`, `operation`, `unitQuantity`, `unitaryPrice`,
                        `source`, `nfo_uid`)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ");
                $stmtIns->execute([
                    $this->company_uid,
                    $op_uid,
                    $this->portfolio_uid,
                    $managedUid,
                    self::CASH_SYMBOL,     // simbolo cassa
                    $op,                   // deposit | withdraw
                    1,                     // qty fissa = 1
                    (string)$amount,       // importo come price
                    $source,
                    null                   // nfo non applicabile per cassa
                ]);

                $this->conn->commit();
                $row = $this->load_operation_row($op_uid);
                return ['success' => true, 'message' => 'operations.created', 'data' => $row];
            } else {    // 3) RAMO ASSET: buy | sell           
                $sym      = $data['symbol'] ?? null;
                $qtyRaw   = $data['unitQuantity'] ?? null;
                $priceRaw = $data['unitaryPrice'] ?? null;

                if (empty($sym)) return ['success' => false, 'message' => 'operations.400.missingSymbol', 'error' => 'Missing symbol'];
                if (!self::isPositiveInt($qtyRaw)) return ['success' => false, 'message' => 'operations.400.invalidQty', 'error' => 'unitQuantity must be positive int'];
                if (!self::isPositiveNumber($priceRaw) || (float)$priceRaw <= 0) {
                    return ['success' => false, 'message' => 'operations.400.invalidPrice', 'error' => 'unitaryPrice must be > 0'];
                }
                if (!in_array($source, ['manual', 'report', 'alert'], true)) return ['success' => false, 'message' => 'operations.400.invalidSource', 'error' => 'Invalid source'];
                if ($source !== 'manual' && empty($nfo_uid)) return ['success' => false, 'message' => 'operations.400.missingSourceUid', 'error' => 'Missing nfo_uid'];

                if (self::isCashSymbol($sym)) {
                    return ['success' => false, 'message' => 'operations.400.invalidSymbolForAssetOp', 'error' => 'CASH symbol is reserved for deposit/withdraw'];
                }

                $qty   = (int)$qtyRaw;
                $price  = round((float)$priceRaw, 2);

                $this->conn->beginTransaction();

                // lock cassa
                $stmtLock = $this->conn->prepare("SELECT cash_position FROM data_portfolios_info
                    WHERE company_uid = :company_uid AND portfolio_uid = :portfolio_uid
                    FOR UPDATE;
                ");
                $stmtLock->execute(['company_uid' => $this->company_uid, 'portfolio_uid' => $this->portfolio_uid]);
                $cashRow = $stmtLock->fetch(PDO::FETCH_ASSOC);
                if (!$cashRow) {
                    $this->conn->rollBack();
                    return ['success' => false, 'message' => 'operations.404.portfolioNotFound', 'error' => 'Portfolio not found'];
                }
                if ($op === 'buy') {
                    $cost = $qty * $price;
                    if ((float)$cashRow['cash_position'] < $cost) {
                        $this->conn->rollBack();
                        return ['success' => false, 'message' => 'operations.400.insufficientCash', 'error' => 'Insufficient cash to execute buy operation'];
                    }
                }

                // lock asset
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

                if ($op === 'sell') {
                    if ($qty > $currentQty) {
                        $this->conn->rollBack();
                        return ['success' => false, 'message' => 'operations.400.qtyExceedsHoldings', 'error' => 'Sell quantity exceeds current holdings'];
                    }
                }
                $newQty = ($op === 'buy') ? $currentQty + $qty : $currentQty - $qty;
                if ($newQty < 0) $newQty = 0;

                // upsert asset qty
                $stmtUpsert = $this->conn->prepare("
                    INSERT INTO data_portfolios_assets (company_uid, portfolio_uid, symbol, unitQuantity)
                    VALUES (:company_uid, :portfolio_uid, :symbol, :qty)
                    ON DUPLICATE KEY UPDATE unitQuantity = VALUES(unitQuantity)
                ");
                $stmtUpsert->execute([
                    'company_uid'   => $this->company_uid,
                    'portfolio_uid' => $this->portfolio_uid,
                    'symbol'        => $sym,
                    'qty'           => $newQty,
                ]);

                if ($newQty === 0) {
                    $del = $this->conn->prepare("
                    DELETE FROM data_portfolios_assets
                    WHERE company_uid=:c AND portfolio_uid=:p AND symbol=:s AND unitQuantity=0
                ");
                    $del->execute(['c' => $this->company_uid, 'p' => $this->portfolio_uid, 's' => $sym]);
                }

                // insert operazione
                $op_uid     = $this->authManager->generateUniqueUID('data_operations', 'operation_uid');
                $managedUid = ($this->portfolio_info['type'] === 'managed' && $this->portfolio_info['managed_uid'] !== null) ? $this->portfolio_info['managed_uid'] : null;
                $nfoUid     = ($source !== 'manual') ? $nfo_uid : null;

                $stmtIns = $this->conn->prepare("
                    INSERT INTO `data_operations`
                        (`company_uid`, `operation_uid`, `portfolio_uid`, `managed_uid`,
                        `symbol`, `operation`, `unitQuantity`, `unitaryPrice`,
                        `source`, `nfo_uid`)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ");
                $stmtIns->execute([
                    $this->company_uid,
                    $op_uid,
                    $this->portfolio_uid,
                    $managedUid,
                    $sym,
                    $op,
                    (int)$qty,
                    (string)$price,   // DECIMAL come stringa
                    $source,
                    $nfoUid
                ]);

                // delta cassa
                $deltaCash = round(($op === 'buy' ? -1 : +1) * ($qty * $price), 2);
                $stmtCash = $this->conn->prepare("
                    UPDATE data_portfolios_info
                    SET cash_position = cash_position + :delta
                    WHERE company_uid = :company_uid AND portfolio_uid = :portfolio_uid
                ");
                $stmtCash->execute([
                    'delta'        => (string)$deltaCash,
                    'company_uid'  => $this->company_uid,
                    'portfolio_uid' => $this->portfolio_uid
                ]);

                $this->conn->commit();
                $row = $this->load_operation_row($op_uid);
                return ['success' => true, 'message' => 'operations.created', 'data' => $row];
            }

            // Fallback di sicurezza
            return ['success' => false, 'message' => 'operations.400.invalidOperation', 'error' => 'operation must be buy|sell|deposit|withdraw'];
        } catch (Throwable $e) {
            if ($this->conn->inTransaction()) $this->conn->rollBack();
            return ['success' => false, 'message' => 'operations.create.error', 'error' => $e->getMessage()];
        }
    }

    /** UPDATE operation (solo modifica campi ammessi)
     * - CUSTOM: può aggiornare unitQuantity e unitaryPrice (opzionali, almeno uno)
     * - MANAGED: può aggiornare SOLO unitaryPrice
     * Effetti: aggiorna data_operations, poi applica i delta a data_portfolios_assets e data_portfolios_info.cash_position
     */
    public function update_operation(string $operation_uid, array $data): array
    {
        try {

            // rimuovi eventuali campi immutabili OLTRE alla whitelist
            foreach (['operation', 'symbol'] as $immutableField) {
                if (array_key_exists($immutableField, $data)) unset($data[$immutableField]);
            }
            // whitelist su UPDATE: tiene solo unitQuantity/unitaryPrice
            $data = self::filterUpdateFields($data);

            // 1) Validazione comune
            $current = $this->load_operation_row($operation_uid);
            if (!$current) return ['success' => false, 'message' => 'operations.404.notFound', 'error' => 'Operation not found'];
            if (($current['company_uid'] ?? '') !== $this->company_uid || ($current['portfolio_uid'] ?? '') !== $this->portfolio_uid)
                return ['success' => false, 'message' => 'operations.403.forbidden', 'error' => 'Forbidden'];

            $op = $current['operation']; // buy|sell|deposit|withdraw

            // 2) RAMO CASSA: deposit | withdraw
            if (in_array($op, ['deposit', 'withdraw'], true)) {
                // vieta cambiare la qty
                if (array_key_exists('unitQuantity', $data)) {
                    return ['success' => false, 'message' => 'operations.400.forbiddenFieldForCash', 'error' => 'unitQuantity cannot be changed for cash operations'];
                }
                if (!array_key_exists('unitaryPrice', $data) || !self::isPositiveNumber($data['unitaryPrice']) || (float)$data['unitaryPrice'] <= 0) {
                    return ['success' => false, 'message' => 'operations.400.invalidPrice', 'error' => 'unitaryPrice must be > 0'];
                }

                $oldAmount = round((float)$current['unitaryPrice'], 2);
                $newAmount = round((float)$data['unitaryPrice'], 2);
                if ($newAmount == $oldAmount) {
                    return ['success' => true, 'message' => 'operations.update.noChanges', 'data' => $current];
                }

                // delta cassa: deposit +amount, withdraw -amount
                $sign      = ($op === 'deposit') ? +1 : -1;
                $deltaCash = round($sign * ($newAmount - $oldAmount), 2);

                $this->conn->beginTransaction();

                // lock cassa
                $stmtLock = $this->conn->prepare("SELECT cash_position FROM data_portfolios_info
                    WHERE company_uid=:c AND portfolio_uid=:p
                    FOR UPDATE
                ");
                $stmtLock->execute(['c' => $this->company_uid, 'p' => $this->portfolio_uid]);
                $cashRow = $stmtLock->fetch(PDO::FETCH_ASSOC);
                if (!$cashRow) {
                    $this->conn->rollBack();
                    return ['success' => false, 'message' => 'operations.404.portfolioNotFound', 'error' => 'Portfolio not found'];
                }

                // se stai aumentando l'uscita (withdraw più alto), verifica fondi
                if ($deltaCash < 0 && (float)$cashRow['cash_position'] < abs($deltaCash)) {
                    $this->conn->rollBack();
                    return ['success' => false, 'message' => 'operations.400.insufficientCash', 'error' => 'Insufficient cash'];
                }

                // aggiorna operazione (solo price)
                $stmtOp = $this->conn->prepare("
                    UPDATE `data_operations`
                    SET `unitaryPrice` = :p
                    WHERE `company_uid`=:c AND `portfolio_uid`=:puid AND `operation_uid`=:opuid
                    LIMIT 1
                ");
                $stmtOp->execute([
                    'p'     => (string)$newAmount,
                    'c'     => $this->company_uid,
                    'puid'  => $this->portfolio_uid,
                    'opuid' => $operation_uid
                ]);

                // aggiorna cassa
                $stmtCash = $this->conn->prepare("
                    UPDATE data_portfolios_info
                    SET cash_position = cash_position + :delta
                    WHERE company_uid=:c AND portfolio_uid=:p
                ");
                $stmtCash->execute([
                    'delta' => (string)$deltaCash,
                    'c'     => $this->company_uid,
                    'p'     => $this->portfolio_uid
                ]);

                $this->conn->commit();

                $rowFinal = $this->load_operation_row($operation_uid);
                return ['success' => true, 'message' => 'operations.updated', 'data' => $rowFinal];
            } else {    // 3) RAMO ASSET: buy | sell 

                $oldQty   = (int)$current['unitQuantity'];
                $oldPrice = round((float)$current['unitaryPrice'], 2);

                $setParts = [];
                $params = [
                    'company_uid'   => $this->company_uid,
                    'portfolio_uid' => $this->portfolio_uid,
                    'operation_uid' => $operation_uid
                ];

                $newQty   = $oldQty;
                $newPrice = $oldPrice;

                if ($this->portfolio_info['type'] === 'custom') {
                    $wantQty   = array_key_exists('unitQuantity', $data);
                    $wantPrice = array_key_exists('unitaryPrice', $data);
                    if (!$wantQty && !$wantPrice) return ['success' => false, 'message' => 'operations.400.nothingToUpdate', 'error' => 'No fields provided'];

                    if ($wantQty) {
                        if (!self::isPositiveInt($data['unitQuantity'])) return ['success' => false, 'message' => 'operations.400.invalidQty', 'error' => 'unitQuantity must be positive int'];
                        $newQty = (int)$data['unitQuantity'];
                        $setParts[] = "`unitQuantity` = :unitQuantity";
                        $params['unitQuantity'] = $newQty;
                    }
                    if ($wantPrice) {
                        if (!self::isPositiveNumber($data['unitaryPrice']) || (float)$data['unitaryPrice'] <= 0) {
                            return ['success' => false, 'message' => 'operations.400.invalidPrice', 'error' => 'unitaryPrice must be > 0'];
                        }
                        $newPrice = round((float)$data['unitaryPrice'], 2);
                        $setParts[] = "`unitaryPrice` = :unitaryPrice";
                        $params['unitaryPrice'] = (string)$newPrice;
                    }
                } else {
                    if (array_key_exists('unitQuantity', $data)) return ['success' => false, 'message' => 'operations.400.forbiddenFieldForManaged', 'error' => 'unitQuantity cannot be changed for managed portfolios'];
                    if (!array_key_exists('unitaryPrice', $data)) return ['success' => false, 'message' => 'operations.400.nothingToUpdate', 'error' => 'No fields provided'];
                    if (!self::isPositiveNumber($data['unitaryPrice'])) return ['success' => false, 'message' => 'operations.400.invalidPrice', 'error' => 'unitaryPrice must be positive'];
                    $newPrice = round((float)$data['unitaryPrice'], 2);
                    $setParts[] = "`unitaryPrice` = :unitaryPrice";
                    $params['unitaryPrice'] = (string)$newPrice;
                }

                if (empty($setParts)) return ['success' => true, 'message' => 'operations.update.noChanges', 'data' => $current];

                // delta
                $deltaQty   = $newQty - $oldQty;
                $signCash   = ($op === 'buy') ? -1 : +1;
                $oldValue   = $oldQty * $oldPrice;
                $newValue   = $newQty * $newPrice;
                $deltaCash  = round($signCash * ($newValue - $oldValue), 2);
                $deltaAsset = ($op === 'buy') ? +$deltaQty : -$deltaQty;

                $this->conn->beginTransaction();

                // lock cassa
                $stmtLock = $this->conn->prepare("SELECT cash_position FROM data_portfolios_info
                    WHERE company_uid = :company_uid AND portfolio_uid = :portfolio_uid
                    FOR UPDATE;
                ");
                $stmtLock->execute(['company_uid' => $this->company_uid, 'portfolio_uid' => $this->portfolio_uid]);
                $cashRow = $stmtLock->fetch(PDO::FETCH_ASSOC);
                if (!$cashRow) throw new RuntimeException('Portfolio not found while locking cash_position');

                if ($op === 'buy') {
                    $extraCost = max(0.0, $newValue - $oldValue);
                    if ($extraCost > 0 && (float)$cashRow['cash_position'] < $extraCost) {
                        $this->conn->rollBack();
                        return ['success' => false, 'message' => 'operations.400.insufficientCash', 'error' => 'Insufficient cash to update buy operation'];
                    }
                }

                // lock asset
                $sym = $current['symbol'];
                $stmtCheck = $this->conn->prepare("SELECT unitQuantity FROM data_portfolios_assets
                    WHERE company_uid = :company_uid AND portfolio_uid = :portfolio_uid AND symbol = :symbol
                    FOR UPDATE;
                ");
                $stmtCheck->execute(['company_uid' => $this->company_uid, 'portfolio_uid' => $this->portfolio_uid, 'symbol' => $sym]);
                $assetRow   = $stmtCheck->fetch(PDO::FETCH_ASSOC);
                $curQty     = (int)($assetRow['unitQuantity'] ?? 0);
                $newQtyAsset = $curQty + $deltaAsset;

                if ($op === 'sell' && $newQtyAsset < 0) {
                    $this->conn->rollBack();
                    return ['success' => false, 'message' => 'operations.400.qtyExceedsHoldings', 'error' => 'Sell quantity exceeds current holdings'];
                }

                // update operation
                $sql = "UPDATE `data_operations` SET " . implode(', ', $setParts) . "
                    WHERE `company_uid`=:company_uid AND `portfolio_uid`=:portfolio_uid AND `operation_uid`=:operation_uid LIMIT 1";
                $stmt = $this->conn->prepare($sql);
                $stmt->execute($params);

                // upsert qty
                if ($op === 'buy' && $newQtyAsset > 0 || $op === 'sell') {
                    $stmtUpsert = $this->conn->prepare("
                        INSERT INTO data_portfolios_assets (company_uid, portfolio_uid, symbol, unitQuantity)
                        VALUES (:company_uid, :portfolio_uid, :symbol, :qty)
                        ON DUPLICATE KEY UPDATE unitQuantity = VALUES(unitQuantity)
                    ");
                    $stmtUpsert->execute([
                        'company_uid' => $this->company_uid,
                        'portfolio_uid' => $this->portfolio_uid,
                        'symbol' => $sym,
                        'qty' => max(0, $newQtyAsset),
                    ]);
                    if ($newQtyAsset <= 0) {
                        $del = $this->conn->prepare("DELETE FROM data_portfolios_assets
                        WHERE company_uid=:c AND portfolio_uid=:p AND symbol=:s AND unitQuantity=0");
                        $del->execute(['c' => $this->company_uid, 'p' => $this->portfolio_uid, 's' => $sym]);
                    }
                }

                // aggiorna cassa
                $stmtCash = $this->conn->prepare("UPDATE data_portfolios_info
                SET cash_position = cash_position + :delta
                WHERE company_uid = :company_uid AND portfolio_uid = :portfolio_uid");
                $stmtCash->execute(['delta' => $deltaCash, 'company_uid' => $this->company_uid, 'portfolio_uid' => $this->portfolio_uid]);

                $this->conn->commit();

                $rowFinal = $this->load_operation_row($operation_uid);
                return ['success' => true, 'message' => 'operations.updated', 'data' => $rowFinal];
            }

            // Fallback di sicurezza
            return ['success' => false, 'message' => 'operations.400.invalidOperation', 'error' => 'operation must be buy|sell|deposit|withdraw'];
        } catch (Throwable $e) {
            if ($this->conn->inTransaction()) $this->conn->rollBack();
            return ['success' => false, 'message' => 'operations.update.error', 'error' => $e->getMessage()];
        }
    }

    /** Carica una singola riga operazione dal DB */
    private function load_operation_row(string $operation_uid): ?array
    {
        $sql = "SELECT `company_uid`, `operation_uid`, `portfolio_uid`, `managed_uid`, `symbol`, `operation`,
                   `unitQuantity`, `unitaryPrice`, `created_at`, `updated_at`,
                   `source`, `nfo_uid`
            FROM `data_operations` WHERE `company_uid` = :company_uid
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

    public function compute_portfolioWeighing(): array
    {
        if ($this->portfolio_info['type'] != 'managed') {
            return [
                "success" => true,
                "message" => "operations.notManaged.success",
                "data" => []
            ];
        }

        // Calcolo da portfoglio info / 
        $total_with_cash = (float)$this->portfolio_info['totals']['total_with_cash'];

        $portfolio_weighing = [];
        foreach ($this->portfolio_assets as $asset) {
            $unitQuantity_now = (int)$asset['unitQuantity_now'];
            $unitaryPrice_now = (float)$asset['unitaryPrice_now'];
            $percentage_now = round((100 / $total_with_cash) * ($unitQuantity_now * $unitaryPrice_now), 2);

            $portfolio_weighing[] = [
                'symbol' => $asset['symbol'],
                'unitQuantity_now' => $unitQuantity_now,
                'percentage_now' => $percentage_now,
            ];
        }

        return [
            "success" => true,
            "message" => "operations.computeWeighing.success",
            "data" => $portfolio_weighing
        ];
    }

    private function compute_symbolWeighing(array $nfo_asset): array
    {
        $total_with_cash = $this->portfolio_info['totals']['total_with_cash'];

        $port_asset = [];
        foreach ($this->portfolio_assets as $asset) {
            if ($asset['symbol'] == $nfo_asset['symbol']) {
                $port_asset = $asset;
            }
        }

        if (empty($port_asset)) {
            $port_asset = [
                "symbol" => $nfo_asset['symbol'],
                "unitQuantity" => 0,
                "unitaryPrice_now" => (float)$this->priceProv->getPriceEURValue($nfo_asset['symbol']),
                "value_now" => 0
            ];
        }

        $unitQuantity_now = (int)$port_asset['unitQuantity'];
        $unitaryPrice_now = round((float)$port_asset['unitaryPrice_now'], 2);
        $percentage_now = round((100 / $total_with_cash) * ($unitQuantity_now * $unitaryPrice_now), 2);

        $percentage_suggested = round((float)$nfo_asset['percentage'], 2);
        $value_suggested = round($total_with_cash * ($percentage_suggested / 100), 2);
        $unitQuantity_suggested = round($value_suggested / $unitaryPrice_now, 0);

        return [
            "symbol" => $nfo_asset['symbol'],
            "unitQuantity_now" => $unitQuantity_now,
            "percentage_now" => $percentage_now,
            "unitQuantity_suggested" => $unitQuantity_suggested,
            "percentage_suggested" => $percentage_suggested
        ];
    }

    private function compute_nfoWeighing($nfo_info): array
    {
        $nfo_weighing = [];
        foreach ($nfo_info['assets'] as $nfo_asset) {
            $nfo_weighing[] = $this->compute_symbolWeighing($nfo_asset);
        }
        return $nfo_weighing;
    }

    public function get_validReportWeighing(): array
    {
        if ($this->portfolio_info['type'] != 'managed') {
            return [
                "success" => true,
                "message" => "operations.notManaged.success",
                "data" => []
            ];
        }
        $reportWeighing = $this->compute_nfoWeighing($this->validReport);
        return [
            'success' => true,
            'message' => 'operations.validReportWeighing.success',
            'data'    => $reportWeighing
        ];
    }

    public function get_validAlertsWeighing(): array
    {
        if ($this->portfolio_info['type'] != 'managed') {
            return [
                "success" => true,
                "message" => "operations.notManaged.success",
                "data" => []
            ];
        }
        $alertsWeighting = [];
        foreach ($this->allValidAlerts as $validAlert) {
            $alertsWeighting[] = [
                "nfo_uid" => $validAlert['nfo_uid'],
                "scheduled_at" => $validAlert['scheduled_at'],
                "weighing" => $this->compute_nfoWeighing($validAlert)
            ];
        }

        usort($alertsWeighting, function ($a, $b) {
            $sa = $a['scheduled_at'] ?? '';
            $sb = $b['scheduled_at'] ?? '';
            return strcmp((string)$sa, (string)$sb);
        });

        return [
            'success' => true,
            'message' => 'operations.nfoDerived.success',
            'data'    => $alertsWeighting
        ];
    }

    public function get_portfolioWeighing(): array
    {
        if ($this->portfolio_info['type'] != 'managed') {
            return [
                "success" => true,
                "message" => "operations.notManaged.success",
                "data" => []
            ];
        }
        try {
            $finalMap = [];
            $lastMetaBySymbol = []; // traccia ultima menzione (report/alert)

            // 1) Base: pesatura del report valido
            $resp_valReport = $this->get_validReportWeighing();
            if (!$resp_valReport['success']) return $resp_valReport;

            $reportWeighing = $resp_valReport['data'] ?? [];
            $reportMeta = [
                'source'       => 'report',
                'nfo_uid'      => $this->validReport['nfo_uid']      ?? null,
                'scheduled_at' => $this->validReport['scheduled_at'] ?? null,
            ];

            foreach ((array)$reportWeighing as $row) {
                $sym = $row['symbol'] ?? null;
                if (!$sym) continue;

                // arricchisci e metti in mappa finale
                $row = array_merge($row, $reportMeta);
                $finalMap[$sym] = $row;

                // segna ultima menzione
                $lastMetaBySymbol[$sym] = $reportMeta;
            }

            // 2) Alerts validi (ASC per scheduled_at)
            $resp_valAlertsW = $this->get_validAlertsWeighing();
            if (!$resp_valAlertsW['success']) return $resp_valAlertsW;

            $alerts = $resp_valAlertsW['data'] ?? [];
            usort($alerts, function ($a, $b) {
                return strcmp((string)($a['scheduled_at'] ?? ''), (string)($b['scheduled_at'] ?? ''));
            });

            foreach ($alerts as $alert) {
                $weighing = $alert['weighing'] ?? [];
                $alertMeta = [
                    'source'       => 'alert',
                    'nfo_uid'      => $alert['nfo_uid']      ?? null,
                    'scheduled_at' => $alert['scheduled_at'] ?? null,
                ];

                foreach ((array)$weighing as $row) {
                    $sym = $row['symbol'] ?? null;
                    if (!$sym) continue;

                    // replace: l’alert più recente vince
                    $row = array_merge($row, $alertMeta);
                    $finalMap[$sym] = $row;

                    // aggiorna ultima menzione per il simbolo
                    $lastMetaBySymbol[$sym] = $alertMeta;
                }
            }

            // 3) Aggiungi gli asset realmente detenuti ma assenti nella pesatura finale
            $total_with_cash = (float)($this->portfolio_info['totals']['total_with_cash'] ?? 0);
            foreach ((array)$this->portfolio_assets as $asset) {
                $sym = $asset['symbol'] ?? null;
                if (!$sym) continue;

                // qty_now può chiamarsi unitQuantity_now o unitQuantity a seconda della tua struttura
                $qty_now = (int)($asset['unitQuantity_now'] ?? $asset['unitQuantity'] ?? 0);
                if ($qty_now <= 0) continue;              // solo se realmente detenuto (>0)
                if (isset($finalMap[$sym])) continue;     // già presente nella pesatura finale

                // prendi prezzo attuale, se manca prova a recuperarlo da DB come fai altrove
                $price_now = (float)($asset['unitaryPrice_now'] ?? 0);
                if ($price_now <= 0) {
                    $price_now = (float)$this->priceProv->getPriceEURValue($sym);
                }

                $value_now = $qty_now * $price_now;
                $perc_now  = ($total_with_cash > 0) ? round((100 / $total_with_cash) * $value_now, 2) : 0.0;

                // meta: preferisci l'ultimo alert che (eventualmente) lo porta a 0; se non c'è, fallback report
                $meta = $lastMetaBySymbol[$sym] ?? $reportMeta;

                $finalMap[$sym] = array_merge([
                    'symbol'                 => $sym,
                    'unitQuantity_now'       => $qty_now,
                    'percentage_now'         => $perc_now,
                    'unitQuantity_suggested' => 0,      // non è in NFO => suggerito 0
                    'percentage_suggested'   => 0.0,
                ], $meta);
            }

            // 4) Ordina (opzionale) e ritorna lista
            ksort($finalMap, SORT_STRING);
            $final = array_values($finalMap);

            return [
                'success' => true,
                'message' => 'operations.portfolioWeighing.success',
                'data'    => $final
            ];
        } catch (Throwable $e) {
            return [
                'success' => false,
                'message' => 'operations.portfolioWeighing.error',
                'error'   => $e->getMessage()
            ];
        }
    }

    // Portfolio Alignment operations
    public function get_portfolioAlignmentOperation(): array
    {
        if ($this->portfolio_info['type'] != 'managed') {
            return [
                "success" => true,
                "message" => "operations.notManaged.success",
                "data" => []
            ];
        }
        try {
            $resp_portWeighing = $this->get_portfolioWeighing();
            if (!$resp_portWeighing['success']) return $resp_portWeighing;

            $portWeighing = $resp_portWeighing['data'];


            $operations = [];
            foreach ($portWeighing as $row) {
                $qty_now = (int)$row['unitQuantity_now'] ?? 0;
                $qty_sug = (int)$row['unitQuantity_suggested'] ?? 0;
                if ($qty_now == $qty_sug) {
                    continue;
                }

                $qty_mod = $qty_sug - $qty_now;
                if ($qty_mod < 0) {
                    $qty_mod *= (-1);
                }

                $operations[] = [
                    'portfolio_uid' => $this->portfolio_uid,
                    'symbol' => $row["symbol"],
                    'operation' => ($qty_now < $qty_sug ? "buy" : "sell"),
                    'unitQuantity' => $qty_mod,
                    'unitaryPrice' => (float)$this->priceProv->getPriceEURValue($row['symbol']),
                    'source' => $row['source'],
                    'nfo_uid' => $row['nfo_uid']
                ];
            }

            return [
                "success" => true,
                "message" => "operations.portfolioAlignmentOperation.success",
                "data" => $operations
            ];
        } catch (Exception $e) {
            return [
                "success" => false,
                "message" => "operations.portfolioAlignmentOperation.error",
                "error" => $e->getMessage()
            ];
        }
    }


    /** Wrapper: restituisce insieme le operazioni derivate da report e alerts */
    public function get_nfoDerivedOperations(): array
    {
        if ($this->portfolio_info['type'] != 'managed') {
            return [
                "success" => true,
                "message" => "operations.notManaged.success",
                "data" => []
            ];
        }
        $reportWeighing = $this->compute_nfoWeighing($this->validReport);

        $alertsWeighting = [];
        foreach ($this->allValidAlerts as $validAlert) {
            $alertsWeighting[] = $this->compute_nfoWeighing($validAlert);
        }

        return [
            'success' => true,
            'message' => 'operations.nfoDerived.success',
            'data'    => [
                'reportWeighing' => $reportWeighing ?? null,
                'alertsWeighting'  => $alertsWeighting ?? null
            ]
        ];
    }
}
