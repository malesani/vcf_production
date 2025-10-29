<?php
require_once("{$_SERVER['DOCUMENT_ROOT']}/auth/obj/authManager.php");
require_once("{$_SERVER['DOCUMENT_ROOT']}/auth/obj/permsManager.php");

/**
 * NFO (report/alert) — Base
 */
class nfoObjBase
{
    protected authManager $authManager;
    protected permsManager $permsManager;
    protected PDO $conn;
    protected array $user_data;
    protected string $company_uid;

    // Campi ammessi in nfo_info (no chiavi)
    protected const INFO_FIELDS = [
        'managed_uid',
        'type',              // 'report' | 'alert' (immutabile dopo creazione)
        'status',            // 'active'|'draft'|'deleted'
        'title',
        'description',
        'html_body',
        'month_num',         // SSE type=='report' => ENUM '1'..'12'
        'year',              // SSE type=='report' => INT
        'scheduled_at'      // DATETIME (opz.)
    ];

    // Required comuni in creazione
    protected const REQUIRED_CREATE_COMMON = [
        'managed_uid',
        'type',
        'title',
        'description',
        'html_body'
    ];

    // Required extra per type=report in creazione
    protected const REQUIRED_CREATE_REPORT = [
        'month_num',
        'year'
    ];

    // Campi immutabili in update
    protected const IMMUTABLE_FIELDS = ['type', 'managed_uid'];

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

    protected static function isValidType(?string $type): bool
    {
        return in_array($type, ['report', 'alert'], true);
    }

    protected static function isValidMonth(?string $m): bool
    {
        if ($m === null) return false;
        return in_array($m, ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'], true);
    }

    public static function get_infoFields(): array
    {
        return self::INFO_FIELDS;
    }
}

/**
 * NFO — Singolo
 */
class nfoObj extends nfoObjBase
{
    private ?string $nfo_uid;
    private array $nfo_info = [];
    private array $assets   = []; // report: [{symbol, percentage}], alert: [{symbol, operator, percentage}]

    public function __construct(authManager $authManager, permsManager $permsManager, ?string $nfo_uid = null)
    {
        parent::__construct($authManager, $permsManager);
        $this->nfo_uid = $nfo_uid;
        if ($this->nfo_uid) {
            $this->load_data();
        }
    }

    private function load_data(): void
    {
        $this->nfo_info = $this->load_info();
        if (!empty($this->nfo_info['type'])) {
            $this->assets = $this->load_assets_byType($this->nfo_info['type']);
        } else {
            $this->assets = [];
        }
    }

    private function load_info(): array
    {
        $cols = implode(', ', array_map(fn($f) => "`$f`", self::INFO_FIELDS));
        $sql  = "SELECT $cols, `nfo_uid`
                 FROM `nfo_info`
                 WHERE `company_uid` = :company_uid
                   AND `nfo_uid` = :nfo_uid
                 LIMIT 1";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([
            'company_uid' => $this->company_uid,
            'nfo_uid'     => $this->nfo_uid
        ]);
        $info = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];
        return $info;
    }

    private function load_assets_byType(string $type): array
    {
        if ($type === 'report') {
            $stmt = $this->conn->prepare("
                SELECT symbol, percentage
                FROM `nfo_report_assets`
                WHERE company_uid = :company_uid AND nfo_uid = :nfo_uid
                ORDER BY symbol ASC
            ");
            $stmt->execute([
                'company_uid' => $this->company_uid,
                'nfo_uid'     => $this->nfo_uid
            ]);
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } elseif ($type === 'alert') {
            $stmt = $this->conn->prepare("
                SELECT symbol, operator, percentage
                FROM `nfo_alert_assets`
                WHERE company_uid = :company_uid
                  AND managed_uid = :managed_uid
                  AND nfo_uid = :nfo_uid
                ORDER BY symbol ASC
            ");
            $stmt->execute([
                'company_uid'       => $this->company_uid,
                'managed_uid'       => $this->nfo_info['managed_uid'] ?? '',
                'nfo_uid'           => $this->nfo_uid
            ]);
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        }
        return [];
    }

    /** Set NFO draft flag: 1 => draft, 0 => active */
    public function set_draft(bool $isDraft): array
    {
        if (!$this->nfo_uid) {
            return ['success' => false, 'message' => 'nfo.missingUID', 'error' => 'Missing nfo_uid'];
        }

        $this->load_data();

        if (empty($this->nfo_info['nfo_uid'])) {
            return ['success' => false, 'message' => 'nfo.notFound', 'error' => "NFO not found: {$this->nfo_uid}"];
        }
        if (($this->nfo_info['status'] ?? '') === 'deleted') {
            return ['success' => false, 'message' => 'nfo.status.deletedLocked', 'error' => 'Cannot change status of deleted NFO'];
        }

        $targetStatus = $isDraft ? 'draft' : 'active';

        try {
            $stmt = $this->conn->prepare("UPDATE `nfo_info` SET `status` = :status
                WHERE `company_uid` = :company_uid AND `nfo_uid` = :nfo_uid LIMIT 1
            ");
            $stmt->execute([
                'status'      => $targetStatus,
                'company_uid' => $this->company_uid,
                'nfo_uid'     => $this->nfo_uid
            ]);

            $this->load_data();

            return ['success' => true, 'message' => 'nfo.draft.updated', 'data' => $this->nfo_uid];
        } catch (Throwable $e) {
            return ['success' => false, 'message' => 'nfo.draft.failed', 'error' => $e->getMessage()];
        }
    }

    // GETTERS
    public function get_nfoInfo(): array
    {
        return $this->nfo_info;
    }

    public function get_nfoAssets(): array
    {
        return $this->assets;
    }

    public function get_nfoData(): array
    {
        $info = $this->nfo_info ?: [];
        $info['assets'] = $this->assets;
        return $info;
    }

    /**
     * CREATE end-to-end (info + assets per type)
     */
    public function create_nfo(array $data): array
    {
        // 1) Validazioni base
        $missingCommon = array_diff(self::REQUIRED_CREATE_COMMON, array_keys($data));
        if (!empty($missingCommon)) {
            return ['success' => false, 'message' => 'nfo.missingCommon', 'error' => 'Missing fields: ' . json_encode(array_values($missingCommon))];
        }
        if (!self::isValidType($data['type'] ?? null)) {
            return ['success' => false, 'message' => 'nfo.invalidType', 'error' => 'Invalid type'];
        }

        $type = $data['type'];
        $status = in_array(($data['status'] ?? ''), ['active', 'draft', 'deleted'], true)
            ? $data['status']
            : 'draft';

        // Validazioni per type
        if ($type === 'report') {
            $missingReport = array_diff(self::REQUIRED_CREATE_REPORT, array_keys($data));
            if (!empty($missingReport)) {
                return ['success' => false, 'message' => 'nfo.report.missingFields', 'error' => 'Missing report fields: ' . json_encode(array_values($missingReport))];
            }
            if (!self::isValidMonth((string)$data['month_num'])) {
                return ['success' => false, 'message' => 'nfo.report.invalidMonth', 'error' => 'month_num must be 1..12 as string'];
            }
            if (!is_numeric($data['year'])) {
                return ['success' => false, 'message' => 'nfo.report.invalidYear', 'error' => 'year must be integer'];
            }
        } else { // alert
            if (empty($data['assets']) || !is_array($data['assets'])) {
                return ['success' => false, 'message' => 'nfo.alert.missingAssets', 'error' => 'assets required for alert'];
            }
            foreach ($data['assets'] as $i => $a) {
                if (empty($a['symbol'])) {
                    return ['success' => false, 'message' => 'nfo.alert.invalidAsset.symbol', 'error' => "Asset[$i] empty symbol"];
                }
                if (!in_array($a['operator'] ?? '', ['buy', 'sell'], true)) {
                    return ['success' => false, 'message' => 'nfo.alert.invalidAsset.operator', 'error' => "Asset[$i] invalid operator"];
                }
                if (!isset($a['percentage']) || !is_numeric($a['percentage']) || (int)$a['percentage'] <= 0) {
                    return ['success' => false, 'message' => 'nfo.alert.invalidAsset.percentage', 'error' => "Asset[$i] invalid percentage"];
                }
            }
        }

        // 2) Insert info
        try {
            $this->conn->beginTransaction();

            $uid = $this->authManager->generateUniqueUID('nfo_info', 'nfo_uid');

            $fields = array_intersect_key($data, array_flip(self::INFO_FIELDS));
            $fields['company_uid'] = $this->company_uid;
            $fields['nfo_uid']     = $uid;
            $fields['type']     = $type;
            $fields['status']     = $status;

            $cols = implode(', ', array_map(fn($f) => "`$f`", array_keys($fields)));
            $vals = implode(', ', array_map(fn($f) => ":$f", array_keys($fields)));

            $sql  = "INSERT INTO `nfo_info` ($cols) VALUES ($vals)";
            $stmt = $this->conn->prepare($sql);
            $stmt->execute($fields);

            // 3) Assets per type (opzionali per report, obbligatori per alert)
            if ($type === 'report' && !empty($data['assets'])) {
                $up = $this->upsert_reportAssets($uid, $data['assets'], true, false); // inside tx
                if (!$up['success']) {
                    throw new RuntimeException($up['error'] ?? 'report assets upsert failed');
                }
            } elseif ($type === 'alert') {
                $up = $this->upsert_alertAssets($uid, $fields['managed_uid'], $data['assets'], true, false); // inside tx
                if (!$up['success']) {
                    throw new RuntimeException($up['error'] ?? 'alert assets upsert failed');
                }
            }

            $this->conn->commit();

            // Ricarica stato oggetto
            $this->nfo_uid = $uid;
            $this->load_data();

            return ['success' => true, 'message' => 'nfo.created', 'data' => $this->nfo_info];
        } catch (PDOException $e) {
            $this->conn->rollBack();
            // Violazione unique (report mensile per managed)
            if ((int)$e->errorInfo[1] === 1062) {
                return ['success' => false, 'message' => 'nfo.report.duplicate', 'error' => $e->getMessage()];
            }
            return ['success' => false, 'message' => 'nfo.fatalError', 'error' => $e->getMessage()];
        } catch (Throwable $t) {
            $this->conn->rollBack();
            return ['success' => false, 'message' => 'nfo.fatalError', 'error' => $t->getMessage()];
        }
    }

    /**
     * UPSERT GENERICO: se esiste aggiorna info (no cambio type/managed),
     * opzionalmente upsert asset (replace=true di default), se non esiste crea.
     */
    public function upsert_nfo(array $data, bool $replaceAssets = true): array
    {
        // Se ho già un nfo_uid nel costruttore, uso quello; altrimenti provo da payload
        $target_uid = $this->nfo_uid ?? ($data['nfo_uid'] ?? null);

        if ($target_uid) {
            // Carico; se non trovato, vado in create (richiede type + comuni)
            $this->nfo_uid = $target_uid;
            $this->load_data();
            if (!isset($this->nfo_info['nfo_uid'])) {
                // Non esiste → create
                return $this->create_nfo($data);
            }

            // Esiste → upsert info (parziale), poi (se forniti) assets per type corrente
            $infoUpd = $this->upsert_info($data);
            if (!$infoUpd['success']) {
                return $infoUpd;
            }

            if (!empty($data['assets']) && is_array($data['assets'])) {
                $type = $this->nfo_info['type'];
                if ($type === 'report') {
                    return $this->upsert_reportAssets($this->nfo_uid, $data['assets'], $replaceAssets);
                } else {
                    return $this->upsert_alertAssets($this->nfo_uid, $this->nfo_info['managed_uid'], $data['assets'], $replaceAssets);
                }
            }

            $this->nfo_info['nfo_uid'] = $this->nfo_uid;

            $this->load_data();
            return ['success' => true, 'message' => 'nfo.info.upserted', 'data' => $this->nfo_info];
        }

        // Nessun uid → create
        return $this->create_nfo($data);
    }

    /**
     * Upsert INFO (no cambio type/managed_uid).
     * Aggiorna SOLO i campi presenti in $newData e ammessi.
     */
    public function upsert_info(array $newData): array
    {
        if (!$this->nfo_uid) {
            return ['success' => false, 'message' => 'nfo.missingUID', 'error' => 'Missing nfo_uid'];
        }
        if (empty($this->nfo_info['nfo_uid'])) {
            $this->load_data();
            if (empty($this->nfo_info['nfo_uid'])) {
                return ['success' => false, 'message' => 'nfo.notFound', 'error' => "NFO not found: {$this->nfo_uid}"];
            }
        }

        // Blocca immutabili se provati a cambiare
        foreach (self::IMMUTABLE_FIELDS as $imm) {
            if (array_key_exists($imm, $newData) && $newData[$imm] != $this->nfo_info[$imm]) {
                return ['success' => false, 'message' => 'nfo.immutableField', 'error' => "Field '$imm' cannot change"];
            }
        }

        // Validazioni opzionali per type report (solo se i campi vengono passati)
        if (($this->nfo_info['type'] ?? '') === 'report') {
            if (array_key_exists('month_num', $newData) && !self::isValidMonth((string)$newData['month_num'])) {
                return ['success' => false, 'message' => 'nfo.report.invalidMonth', 'error' => 'month_num must be 1..12 as string'];
            }
            if (array_key_exists('year', $newData) && !is_numeric($newData['year'])) {
                return ['success' => false, 'message' => 'nfo.report.invalidYear', 'error' => 'year must be integer'];
            }
        }

        // Costruzione UPDATE parziale
        $fieldsToUpdate = array_values(array_intersect(array_keys($newData), self::INFO_FIELDS));
        if (empty($fieldsToUpdate)) {
            return ['success' => true, 'message' => 'nfo.info.noChanges'];
        }

        $setParts = [];
        $params = [
            'company_uid' => $this->company_uid,
            'nfo_uid'     => $this->nfo_uid
        ];

        foreach ($fieldsToUpdate as $f) {
            $setParts[]   = "`$f` = :$f";
            $params[$f]   = $newData[$f];
        }

        try {
            $sql  = "UPDATE `nfo_info` SET " . implode(', ', $setParts) .
                " WHERE `company_uid` = :company_uid AND `nfo_uid` = :nfo_uid";
            $stmt = $this->conn->prepare($sql);
            $stmt->execute($params);

            $this->load_data();
            return ['success' => true, 'message' => 'nfo.info.upserted'];
        } catch (PDOException $e) {
            if ((int)$e->errorInfo[1] === 1062) {
                // Violazione UNIQUE (report duplicato mese/anno)
                return ['success' => false, 'message' => 'nfo.report.duplicate', 'error' => $e->getMessage()];
            }
            return ['success' => false, 'message' => 'nfo.fatalError', 'error' => $e->getMessage()];
        }
    }

    /**
     * Upsert ASSET — REPORT
     * @param string $nfo_uid
     * @param array  $assets [ {symbol, percentage}... ]
     * @param bool   $replace se true rimuove le righe non presenti nell'array
     * @param bool   $useTx se true apre/chiude una transazione qui
     */
    public function upsert_reportAssets(string $nfo_uid, array $assets, bool $replace = true, bool $useTx = true): array
    {
        if ($useTx) {
            $this->conn->beginTransaction();
        }
        try {
            // Validazione minima
            foreach ($assets as $i => $a) {
                if (empty($a['symbol'])) {
                    throw new InvalidArgumentException("report.assets[$i] empty symbol");
                }
                if (!isset($a['percentage']) || !is_numeric($a['percentage']) || $a['percentage'] < 0) {
                    throw new InvalidArgumentException("report.assets[$i] invalid percentage");
                }
            }

            // Upsert per singola riga
            $sql = "
                INSERT INTO `nfo_report_assets` (`company_uid`, `nfo_uid`, `symbol`, `percentage`)
                VALUES (:company_uid, :nfo_uid, :symbol, :percentage)
                ON DUPLICATE KEY UPDATE `percentage` = VALUES(`percentage`)
            ";
            $stmt = $this->conn->prepare($sql);

            $symbols = [];
            foreach ($assets as $a) {
                $stmt->execute([
                    'company_uid' => $this->company_uid,
                    'nfo_uid'     => $nfo_uid,
                    'symbol'      => $a['symbol'],
                    'percentage'  => (float)$a['percentage']
                ]);
                $symbols[] = $a['symbol'];
            }

            if ($replace) {
                // Cancella righe NON presenti nella lista
                if (!empty($symbols)) {
                    $in = implode(',', array_fill(0, count($symbols), '?'));
                    $del = $this->conn->prepare("
                        DELETE FROM `nfo_report_assets`
                        WHERE company_uid = ?
                          AND nfo_uid = ?
                          AND symbol NOT IN ($in)
                    ");
                    $del->execute(array_merge([$this->company_uid, $nfo_uid], $symbols));
                } else {
                    // Se lista vuota e replace=true → cancella tutte
                    $del = $this->conn->prepare("
                        DELETE FROM `nfo_report_assets` WHERE company_uid = :company_uid AND nfo_uid = :nfo_uid
                    ");
                    $del->execute(['company_uid' => $this->company_uid, 'nfo_uid' => $nfo_uid]);
                }
            }

            if ($useTx) {
                $this->conn->commit();
            }
            // Ricarica se sto lavorando sull'istanza corrente
            if ($this->nfo_uid === $nfo_uid) {
                $this->load_data();
            }

            return ['success' => true, 'message' => 'nfo.reportAssets.upserted'];
        } catch (Throwable $t) {
            if ($useTx) {
                $this->conn->rollBack();
            }
            return ['success' => false, 'message' => 'nfo.reportAssets.failed', 'error' => $t->getMessage()];
        }
    }

    /**
     * Upsert ASSET — ALERT
     * @param string $nfo_uid
     * @param string $managed_uid necessario per PK della tabella alert
     * @param array  $assets [ {symbol, operator(buy|sell), percentage(int>0)}... ]
     * @param bool   $replace se true rimuove le righe non presenti nell'array
     * @param bool   $useTx se true apre/chiude una transazione qui
     */
    public function upsert_alertAssets(string $nfo_uid, string $managed_uid, array $assets, bool $replace = true, bool $useTx = true): array
    {
        if ($useTx) {
            $this->conn->beginTransaction();
        }
        try {
            foreach ($assets as $i => $a) {
                if (empty($a['symbol'])) {
                    throw new InvalidArgumentException("alert.assets[$i] empty symbol");
                }
                if (!in_array($a['operator'] ?? '', ['buy', 'sell'], true)) {
                    throw new InvalidArgumentException("alert.assets[$i] invalid operator");
                }
                if (!isset($a['percentage']) || !is_numeric($a['percentage']) || (int)$a['percentage'] <= 0) {
                    throw new InvalidArgumentException("alert.assets[$i] invalid percentage");
                }
            }

            $sql = "
                INSERT INTO `nfo_alert_assets`
                    (`company_uid`, `managed_uid`, `nfo_uid`, `symbol`, `operator`, `percentage`)
                VALUES
                    (:company_uid, :managed_uid, :nfo_uid, :symbol, :operator, :percentage)
                ON DUPLICATE KEY UPDATE
                    `operator` = VALUES(`operator`),
                    `percentage` = VALUES(`percentage`)
            ";
            $stmt = $this->conn->prepare($sql);

            $symbols = [];
            foreach ($assets as $a) {
                $stmt->execute([
                    'company_uid' => $this->company_uid,
                    'managed_uid' => $managed_uid,
                    'nfo_uid'     => $nfo_uid,
                    'symbol'      => $a['symbol'],
                    'operator'    => $a['operator'],
                    'percentage'   => (int)$a['percentage']
                ]);
                $symbols[] = $a['symbol'];
            }

            if ($replace) {
                if (!empty($symbols)) {
                    $in = implode(',', array_fill(0, count($symbols), '?'));
                    $del = $this->conn->prepare("
                        DELETE FROM `nfo_alert_assets`
                        WHERE company_uid = ?
                          AND managed_uid = ?
                          AND nfo_uid = ?
                          AND symbol NOT IN ($in)
                    ");
                    $del->execute(array_merge([$this->company_uid, $managed_uid, $nfo_uid], $symbols));
                } else {
                    $del = $this->conn->prepare("
                        DELETE FROM `nfo_alert_assets`
                        WHERE company_uid = :company_uid AND managed_uid = :managed_uid AND nfo_uid = :nfo_uid
                    ");
                    $del->execute(['company_uid' => $this->company_uid, 'managed_uid' => $managed_uid, 'nfo_uid' => $nfo_uid]);
                }
            }

            if ($useTx) {
                $this->conn->commit();
            }
            if ($this->nfo_uid === $nfo_uid) {
                $this->load_data();
            }

            return ['success' => true, 'message' => 'nfo.alertAssets.upserted'];
        } catch (Throwable $t) {
            if ($useTx) {
                $this->conn->rollBack();
            }
            return ['success' => false, 'message' => 'nfo.alertAssets.failed', 'error' => $t->getMessage()];
        }
    }
}

/**
 * NFO — Lista
 */
class nfoObjList extends nfoObjBase
{
    /** Lista NFO (report/alert) — interfaccia analoga a productObjList
     * Filtri supportati:
     * - search (match su title o description)
     * - type ('report'|'alert')
     * - managed_uid
     * - status ('active'|'draft'|'deleted')
     * - month_num ('1'..'12')
     * - year (int)
     * - scheduled_from / scheduled_to (YYYY-MM-DD HH:MM:SS o ISO)
     * - valid_only (bool): se true -> status='active' AND scheduled_at <= now(Europe/Rome)
     *
     * @param array $filters
     * @param bool  $extractAll  Se true ritorna TUTTE le righe (data = array[]). Se false ritorna {rows, meta}.
     * @param int   $page
     * @param int   $perPage
     * @return array { success, message, data }
     */
    public function get_nfoList(array $filters = [], bool $extractAll = false, int $page = 1, int $perPage = 25): array
    {
        try {
            $page    = max(1, $page);
            $perPage = max(1, $perPage);
            $offset  = ($page - 1) * $perPage;

            $wheres = [];
            $params = [];

            // sempre filtro per azienda
            $wheres[]              = "`company_uid` = :company_uid";
            $params['company_uid'] = $this->company_uid;

            if (!empty($filters['search'])) {
                $wheres[]         = "(`title` LIKE :search OR `description` LIKE :search)";
                $params['search'] = "%{$filters['search']}%";
            }
            if (!empty($filters['type']) && in_array($filters['type'], ['report', 'alert'], true)) {
                $wheres[]       = "`type` = :type";
                $params['type'] = $filters['type'];
            }
            if (!empty($filters['managed_uid'])) {
                $wheres[]              = "`managed_uid` = :managed_uid";
                $params['managed_uid'] = $filters['managed_uid'];
            }
            if (!empty($filters['status'])) {
                $wheres[]          = "`status` = :status";
                $params['status']  = $filters['status'];
            }
            if (!empty($filters['month_num'])) {
                $wheres[]               = "`month_num` = :month_num";
                $params['month_num']    = (string)$filters['month_num'];
            }
            if (!empty($filters['year'])) {
                $wheres[]          = "`year` = :year";
                $params['year']    = (int)$filters['year'];
            }
            if (!empty($filters['scheduled_from'])) {
                $wheres[]                    = "`scheduled_at` >= :scheduled_from";
                $params['scheduled_from']    = $filters['scheduled_from'];
            }
            if (!empty($filters['scheduled_to'])) {
                $wheres[]                  = "`scheduled_at` <= :scheduled_to";
                $params['scheduled_to']    = $filters['scheduled_to'];
            }

            // valid_only: status=active e scheduled_at <= now (Europe/Rome)
            if (!empty($filters['valid_only'])) {
                $tz  = new DateTimeZone('Europe/Rome');
                $now = (new DateTime('now', $tz))->format('Y-m-d H:i:s');
                $wheres[] = "`status` = 'active'";
                $wheres[] = "`scheduled_at` <= :now_valid";
                $params['now_valid'] = $now;
            }

            $whereSql = $wheres ? ('WHERE ' . implode(' AND ', $wheres)) : '';

            $cols = "`managed_uid`, `type`, `title`, `description`, `html_body`, `month_num`, `year`, `status`, `scheduled_at`, `nfo_uid`";

            $sql = "
                SELECT SQL_CALC_FOUND_ROWS
                    $cols
                FROM `nfo_info`
                $whereSql
                ORDER BY `scheduled_at` DESC, `title` ASC
            ";

            if (!$extractAll) {
                $sql .= " LIMIT :offset, :perPage";
            }

            $stmt = $this->conn->prepare($sql);

            // bind params
            foreach ($params as $k => $v) {
                $stmt->bindValue(":$k", $v);
            }
            if (!$extractAll) {
                $stmt->bindValue(':offset',  $offset,  PDO::PARAM_INT);
                $stmt->bindValue(':perPage', $perPage, PDO::PARAM_INT);
            }

            $stmt->execute();
            $rows  = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // totale
            $total = (int)$this->conn->query("SELECT FOUND_ROWS()")->fetchColumn();

            // risposta uniforme a productObjList
            $return = [
                'success' => true,
                'message' => 'nfo.list.success',
                'data'    => null
            ];

            if ($extractAll) {
                $return['data'] = $rows;
            } else {
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
                'message' => 'nfo.list.error',
                'error'   => $e->getMessage()
            ];
        }
    }

    // Get last active report for managed_uid (scheduled_at <= now)
    public function get_lastValidReport(string $managed_uid, ?int $year = null, ?int $max_month = null): array
    {
        try {
            // Ora corrente in Europe/Rome per confronto esplicito (evita dipendere dal timezone del DB)
            $tz   = new DateTimeZone('Europe/Rome');
            $now  = (new DateTime('now', $tz))->format('Y-m-d H:i:s');

            // Base query: prendi il report più recente con scheduled_at valido
            $sql = "SELECT `nfo_uid`, `managed_uid`, `type`, `title`, `description`, `html_body`,
                    `month_num`, `year`, `status`, `scheduled_at`
                FROM `nfo_info`
                WHERE `company_uid` = :company_uid
                AND `managed_uid` = :managed_uid
                AND `type` = 'report'
                AND `status` = 'active'
                AND `scheduled_at` <= :now
            ";

            $params = [
                'company_uid' => $this->company_uid,
                'managed_uid' => $managed_uid,
                'now'         => $now,
            ];

            // Filtri opzionali per anno e mese (se forniti)
            if ($year !== null) {
                $sql .= " AND `year` = :year";
                $params['year'] = $year;
            }
            if ($max_month !== null) {
                // month_num è enum('1'..'12'): cast per confronto numerico
                $sql .= " AND CAST(`month_num` AS UNSIGNED) <= :max_month";
                $params['max_month'] = $max_month;
            }

            // Ordina per scheduled_at più recente
            $sql .= " ORDER BY `scheduled_at` DESC LIMIT 1";

            $stmt = $this->conn->prepare($sql);
            $stmt->execute($params);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$row) {
                return ['success' => false, 'message' => 'nfo.report.notFound', 'error' => 'No valid report founded.'];
            }

            // Carico anche gli assets del report
            $stmtA = $this->conn->prepare("SELECT symbol, percentage
                FROM `nfo_report_assets` WHERE `company_uid` = :company_uid AND `nfo_uid` = :nfo_uid
                ORDER BY symbol ASC
            ");

            $stmtA->execute([
                'company_uid' => $this->company_uid,
                'nfo_uid'     => $row['nfo_uid']
            ]);
            $assets = $stmtA->fetchAll(PDO::FETCH_ASSOC);

            $row['assets'] = $assets;

            return ['success' => true, 'message' => 'nfo.report.latestFetched', 'data' => $row];
        } catch (Throwable $e) {
            return ['success' => false, 'message' => 'nfo.report.latestFailed', 'error' => $e->getMessage()];
        }
    }

    /** GET Valid Alerts; Alert successivi all'ultimo report valido (by managed_uid)
     * Interfaccia analoga a productObjList: $extractAll controlla il formato risposta.
     * "Valido" = status='active' AND scheduled_at <= now(Europe/Rome)
     */
    public function get_allValidAlerts(
        string $managed_uid,
        bool $extractAll = false,
        int $page = 1,
        int $perPage = 25
    ): array {
        try {
            $page    = max(1, $page);
            $perPage = max(1, $perPage);
            $offset  = ($page - 1) * $perPage;

            $tz  = new DateTimeZone('Europe/Rome');
            $now = (new DateTime('now', $tz))->format('Y-m-d H:i:s');

            // 1) Ultimo report valido
            $sqlReport = "
                SELECT `nfo_uid`, `scheduled_at`
                FROM `nfo_info`
                WHERE `company_uid` = :company_uid
                  AND `managed_uid` = :managed_uid
                  AND `type` = 'report'
                  AND `status` = 'active'
                  AND `scheduled_at` <= :now
                ORDER BY `scheduled_at` DESC
                LIMIT 1
            ";
            $stmtR = $this->conn->prepare($sqlReport);
            $stmtR->execute([
                'company_uid' => $this->company_uid,
                'managed_uid' => $managed_uid,
                'now'         => $now,
            ]);
            $lastReport = $stmtR->fetch(PDO::FETCH_ASSOC);
            $since      = $lastReport['scheduled_at'] ?? null;

            // 2) Alert validi successivi a $since (se esiste), fino a now
            $wheres = [
                "`company_uid` = :company_uid",
                "`managed_uid` = :managed_uid",
                "`type` = 'alert'",
                "`status` = 'active'",
                "`scheduled_at` <= :now"
            ];
            $params = [
                'company_uid' => $this->company_uid,
                'managed_uid' => $managed_uid,
                'now'         => $now
            ];
            if ($since !== null) {
                $wheres[]       = "`scheduled_at` > :since";
                $params['since'] = $since;
            }

            $whereSql = 'WHERE ' . implode(' AND ', $wheres);
            $cols = "`nfo_uid`, `managed_uid`, `type`, `title`, `description`, `html_body`, `month_num`, `year`, `status`, `scheduled_at`";

            $sql = "
                SELECT SQL_CALC_FOUND_ROWS
                    $cols
                FROM `nfo_info`
                $whereSql
                ORDER BY `scheduled_at` ASC
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

            // risposta uniforme
            $metaBase = [
                'since_report_scheduled_at' => $since
            ];

            if ($extractAll) {
                return [
                    'success' => true,
                    'message' => 'nfo.alerts.validAfterLatestReportFetched',
                    'data'    => $rows,
                    'meta'    => $metaBase
                ];
            } else {
                $pages_num = (int)ceil(($total ?: 0) / $perPage);
                return [
                    'success' => true,
                    'message' => 'nfo.alerts.validAfterLatestReportFetched',
                    'data'    => [
                        'rows' => $rows,
                        'meta' => array_merge($metaBase, [
                            'items_num' => $total,
                            'pages_num' => $pages_num,
                            'page'      => $page,
                            'per_page'  => $perPage,
                        ])
                    ]
                ];
            }
        } catch (Throwable $e) {
            return [
                'success' => false,
                'message' => 'nfo.alerts.validAfterLatestReportFailed',
                'error'   => $e->getMessage()
            ];
        }
    }
}
