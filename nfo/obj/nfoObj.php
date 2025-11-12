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
        'month_num',         // SSE type=='report' => INT 1-12
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
    }

    protected static function isValidType(?string $type): bool
    {
        return in_array($type, ['report', 'alert'], true);
    }
    protected static function isValidMonth(int $m): bool
    {
        return $m >= 1 && $m <= 12;
    }
    protected static function isValidStatus(?string $status): bool
    {
        return in_array($status, ['active', 'draft', 'deleted'], true);
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
    private ?string $nfo_uid = null;
    private array $nfo_info = [];
    private array $assets   = []; // [{symbol, percentage}]

    public function __construct(authManager $authManager, permsManager $permsManager, ?string $nfo_uid = null)
    {
        parent::__construct($authManager, $permsManager);
        if ($nfo_uid) {
            $this->set_nfo($nfo_uid);
        }
    }

    public function set_nfo(string $nfo_uid): array
    {
        try {
            $this->nfo_uid = $nfo_uid;
            $this->load_data();
            return [
                'success' => true,
                'message' => "nfo.loadData.success",
                'data' => []
            ];
        } catch (Exception $e) {
            throw new Exception($e->getMessage());
        }
    }

    private function load_data(): void
    {
        $this->nfo_info = $this->load_info();
        if (empty($this->nfo_info)) {
            throw new Exception("This nfo_uid doesn't exist.");
        }
        $this->assets = $this->load_assets();
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

    private function load_assets(): array
    {
        $stmt = $this->conn->prepare("
                SELECT symbol, percentage
                FROM `nfo_assets`
                WHERE company_uid = :company_uid AND nfo_uid = :nfo_uid
                ORDER BY symbol ASC
            ");
        $stmt->execute([
            'company_uid' => $this->company_uid,
            'nfo_uid'     => $this->nfo_uid
        ]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /** Set NFO draft flag: 1 => draft, 0 => active */
    public function set_draft(bool $isDraft): array
    {
        if (!$this->nfo_uid) {
            return ['success' => false, 'message' => 'nfo.missingUID', 'error' => 'nfo_uid not set'];
        }

        try {
            $this->nfo_info = $this->load_info();

            if (empty($this->nfo_info)) {
                return ['success' => false, 'message' => 'nfo.notFound', 'error' => "NFO not found: {$this->nfo_uid}"];
            }
            if (!self::isValidStatus($this->nfo_info['status'] ?? null)) {
                $bad = $this->nfo_info['status'] ?? '';
                return ['success' => false, 'message' => 'nfo.invalidStatus', 'error' => "Invalid status: [$bad]"];
            }
            if ($this->nfo_info['status'] === 'deleted') {
                return ['success' => false, 'message' => 'nfo.status.deletedLocked', 'error' => 'Cannot change status of deleted NFO'];
            }

            $targetStatus = $isDraft ? 'draft' : 'active';

            if ($targetStatus == $this->nfo_info['status']) {
                return ['success' => true, 'message' => "nfo.draft.already.$targetStatus", 'data' => $this->nfo_uid];
            }

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

    /** CREATE end-to-end (info + assets per type) */
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
        $status = $data['status'] ?? 'active';
        if (!self::isValidStatus($status ?? null)) {
            $bad = $data['status'] ?? '';
            return ['success' => false, 'message' => 'nfo.invalidStatus', 'error' => "Invalid status: [$bad]"];
        }

        $type = $data['type'];

        // Validazioni per type
        if ($type === 'report') {
            $missingReport = array_diff(self::REQUIRED_CREATE_REPORT, array_keys($data));
            if (!empty($missingReport)) {
                return ['success' => false, 'message' => 'nfo.report.missingFields', 'error' => 'Missing report fields: ' . json_encode(array_values($missingReport))];
            }
            if (!self::isValidMonth((int)$data['month_num'])) {
                return ['success' => false, 'message' => 'nfo.report.invalidMonth', 'error' => 'month_num must be 1..12'];
            }
            if (!is_numeric($data['year'])) {
                return ['success' => false, 'message' => 'nfo.report.invalidYear', 'error' => 'year must be integer'];
            }
        }


        if (empty($data['assets']) || !is_array($data['assets'])) {
            return ['success' => false, 'message' => 'nfo.assets.missingAssets', 'error' => 'assets required.'];
        }
        foreach ($data['assets'] as $i => $a) {
            if (empty($a['symbol'])) {
                return ['success' => false, 'message' => 'nfo.assets.invalidAsset.symbol', 'error' => "Asset[$i] empty symbol"];
            }
            // 1 <= percentage <= 100 (int)
            if (!isset($a['percentage']) || !is_numeric($a['percentage'])) {
                return ['success' => false, 'message' => 'nfo.assets.invalidAsset.percentage', 'error' => "Asset[$i] invalid percentage (missing or non numeric)"];
            }
            $p = (float)$a['percentage'];
            if ($p < 0 || $p > 100) {
                return ['success' => false, 'message' => 'nfo.assets.invalidAsset.percentageRange', 'error' => "Asset[$i] percentage must be 0..100"];
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

            $this->nfo_uid = $uid;
            $this->nfo_info = $this->load_info();

            $up = $this->update_assets($data['assets'], true, false); // inside tx
            if (!$up['success']) {
                throw new RuntimeException($up['error'] ?? 'report assets upsert failed');
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

    /** UPDATE GENERICO: se esiste aggiorna info (no cambio type/managed),
     * opzionalmente upsert asset (replace=true di default), se non esiste crea.
     */
    public function update_data(array $data, bool $replaceAssets = true): array
    {
        $target_uid = $this->nfo_uid ?? ($data['nfo_uid'] ?? null);
        if (!$target_uid) {
            return ['success' => false, 'message' => 'nfo.missingUID', 'error' => 'Missing nfo_uid'];
        }

        if ($target_uid != $this->nfo_uid) {
            $setNfo = $this->set_nfo($target_uid);
            if (!$setNfo['success']) {
                return $setNfo;
            }
        }

        if (empty($data['assets']) || !is_array($data['assets'])) {
            return ['success' => false, 'message' => 'nfo.400.missingRequiredParameters', 'error' => 'Missing or invalid: assets.'];
        }

        $infoUpd = $this->update_info($data);
        if (!$infoUpd['success']) return $infoUpd;

        $assetsUpd = $this->update_assets($data['assets'], $replaceAssets);
        if (!$assetsUpd['success']) return $assetsUpd;

        $this->load_data();
        return ['success' => true, 'message' => 'nfo.data.updated', 'data' => $this->nfo_info];
    }

    /** Upsert INFO (no cambio type/managed_uid).
     * Aggiorna SOLO i campi presenti in $newData e ammessi.
     */
    public function update_info(array $newData): array
    {
        try {
            if (!$this->nfo_uid) {
                return ['success' => false, 'message' => 'nfo.missingUID', 'error' => 'Missing nfo_uid'];
            }
            if (empty($this->nfo_info['nfo_uid'])) {
                $this->load_data();
                if (empty($this->nfo_info['nfo_uid'])) {
                    return ['success' => false, 'message' => 'nfo.notFound', 'error' => "NFO not found: {$this->nfo_uid}"];
                }
            }

            if (array_key_exists('status', $newData) && !self::isValidStatus($newData['status'])) {
                return ['success' => false, 'message' => 'nfo.invalidStatus', 'error' => "Invalid status: [{$newData['status']}]"];
            }

            // Blocca immutabili se provati a cambiare
            foreach (self::IMMUTABLE_FIELDS as $imm) {
                if (array_key_exists($imm, $newData) && $newData[$imm] != $this->nfo_info[$imm]) {
                    return ['success' => false, 'message' => 'nfo.immutableField', 'error' => "Field '$imm' cannot change"];
                }
            }

            // Validazioni opzionali per type report (solo se i campi vengono passati)
            if (($this->nfo_info['type'] ?? '') === 'report') {
                if (array_key_exists('month_num', $newData) && !self::isValidMonth((int)$newData['month_num'])) {
                    return ['success' => false, 'message' => 'nfo.report.invalidMonth', 'error' => 'month_num must be 1..12'];
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

    /** Upsert ASSET — REPORT
     * @param string $nfo_uid
     * @param array  $assets [ {symbol, percentage}, ... ]
     * @param bool   $replace se true rimuove le righe non presenti nell'array
     * @param bool   $useTx se true apre/chiude una transazione qui
     */
    public function update_assets(array $assets, bool $replace = true, bool $useTx = true): array
    {
        if (empty($this->nfo_uid)) {
            return ['success' => false, 'message' => 'nfo.assets.update.missingNfoUid', 'error' => 'nfo_uid must be set before updating assets.'];
        }
        if ($useTx) {
            $this->conn->beginTransaction();
        }
        try {
            // Validazione minima
            foreach ($assets as $i => $a) {
                if (empty($a['symbol'])) {
                    throw new InvalidArgumentException("report.assets[$i] empty symbol");
                }
                if (!isset($a['percentage']) || !is_numeric($a['percentage'])) {
                    throw new InvalidArgumentException("report.assets[$i] invalid percentage (missing or non numeric)");
                }
                $p = (float)$a['percentage'];
                if ($p < 0 || $p > 100) {
                    throw new InvalidArgumentException("report.assets[$i] percentage must be between 0 and 100");
                }
            }

            // Upsert per singola riga
            $sql = "
                INSERT INTO `nfo_assets` (`company_uid`, `nfo_uid`, `symbol`, `percentage`)
                VALUES (:company_uid, :nfo_uid, :symbol, :percentage)
                ON DUPLICATE KEY UPDATE `percentage` = VALUES(`percentage`)
            ";
            $stmt = $this->conn->prepare($sql);

            $symbols = [];
            foreach ($assets as $a) {
                $stmt->execute([
                    'company_uid' => $this->company_uid,
                    'nfo_uid'     => $this->nfo_uid,
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
                        DELETE FROM `nfo_assets`
                        WHERE company_uid = ?
                          AND nfo_uid = ?
                          AND symbol NOT IN ($in)
                    ");
                    $del->execute(array_merge([$this->company_uid, $this->nfo_uid], $symbols));
                } else {
                    // Se lista vuota e replace=true → cancella tutte
                    $del = $this->conn->prepare("
                        DELETE FROM `nfo_assets` WHERE company_uid = :company_uid AND nfo_uid = :nfo_uid
                    ");
                    $del->execute(['company_uid' => $this->company_uid, 'nfo_uid' => $this->nfo_uid]);
                }
            }

            if ($useTx) {
                $this->conn->commit();
            }

            $this->load_assets();

            return ['success' => true, 'message' => 'nfo.assets.update.success', 'data' => $this->assets];
        } catch (Throwable $t) {
            if ($useTx) {
                $this->conn->rollBack();
            }
            return ['success' => false, 'message' => 'nfo.assets.update.error', 'error' => $t->getMessage()];
        }
    }
}

/**
 * NFO — Lista
 */
class nfoObjList extends nfoObjBase
{
    /** Lista NFO (report/alert)
     * Filtri supportati:
     * - search, type, managed_uid, status, month_num, year
     * - scheduled_from / scheduled_to
     * - valid_only (bool): status='active' AND scheduled_at <= now(Europe/Rome)
     *
     * @param array $filters
     * @param bool  $extractAll  Se true ritorna TUTTE le righe (data = array[]). Se false ritorna {rows, meta}.
     * @param int   $page
     * @param int   $perPage
     * @param bool  $includeAssets  Se true, include per ogni NFO anche l’array 'assets' (symbol, percentage)
     * @return array { success, message, data }
     */
    public function get_nfoList(
        array $filters = [],
        bool $extractAll = false,
        int $page = 1,
        int $perPage = 25,
        bool $includeAssets = false
    ): array {
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
                $wheres[] = "(`title` LIKE :search_title)";
                $params['search_title'] = "%{$filters['search']}%";
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
                $wheres[]         = "`status` = :status";
                $params['status'] = $filters['status'];
            }
            if (!empty($filters['month_num'])) {
                $wheres[]                = "`month_num` = :month_num";
                $params['month_num']     = (string)$filters['month_num'];
            }
            if (!empty($filters['year'])) {
                $wheres[]        = "`year` = :year";
                $params['year']  = (int)$filters['year'];
            }
            if (!empty($filters['scheduled_from'])) {
                $wheres[]                   = "`scheduled_at` >= :scheduled_from";
                $params['scheduled_from']   = $filters['scheduled_from'];
            }
            if (!empty($filters['scheduled_to'])) {
                $wheres[]                 = "`scheduled_at` <= :scheduled_to";
                $params['scheduled_to']   = $filters['scheduled_to'];
            }

            // valid_only: status=active e scheduled_at <= now (Europe/Rome)
            if (!empty($filters['valid_only'])) {
                $tz  = new DateTimeZone('Europe/Rome');
                $now = (new DateTime('now', $tz))->format('Y-m-d H:i:s');
                $wheres[]            = "`status` = 'active'";
                $wheres[]            = "`scheduled_at` <= :now_valid";
                $params['now_valid'] = $now;
            }

            $whereSql = $wheres ? ('WHERE ' . implode(' AND ', $wheres)) : '';
            $cols = "`managed_uid`,`type`,`title`,`description`,`html_body`,`month_num`,`year`,`status`,`scheduled_at`,`nfo_uid`";

            if ($extractAll) {
                $sqlRows = "SELECT $cols FROM `nfo_info` $whereSql
                           ORDER BY `scheduled_at` DESC, `title` ASC";
                $stmt = $this->conn->prepare($sqlRows);
                foreach ($params as $k => $v) $stmt->bindValue(":$k", $v);
                $stmt->execute();
                $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

                if ($includeAssets && !empty($rows)) {
                    $this->hydrateAssetsIntoRows($rows);
                }

                return [
                    'success' => true,
                    'message' => 'nfo.list.success',
                    'data'    => $rows
                ];
            }

            // paginata
            $sqlRows = "SELECT $cols FROM `nfo_info` $whereSql
                        ORDER BY `scheduled_at` DESC, `title` ASC
                        LIMIT :offset, :perPage";
            $stmt = $this->conn->prepare($sqlRows);
            foreach ($params as $k => $v) $stmt->bindValue(":$k", $v);
            $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
            $stmt->bindValue(':perPage', $perPage, PDO::PARAM_INT);
            $stmt->execute();
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $sqlCount = "SELECT COUNT(*) FROM `nfo_info` $whereSql";
            $stmtCnt = $this->conn->prepare($sqlCount);
            foreach ($params as $k => $v) $stmtCnt->bindValue(":$k", $v);
            $stmtCnt->execute();
            $total = (int)$stmtCnt->fetchColumn();

            if ($includeAssets && !empty($rows)) {
                $this->hydrateAssetsIntoRows($rows);
            }

            $pages_num = (int)ceil(($total ?: 0) / $perPage);

            return [
                'success' => true,
                'message' => 'nfo.list.success',
                'data'    => [
                    'rows' => $rows,
                    'meta' => [
                        'items_num' => $total,
                        'pages_num' => $pages_num,
                        'page'      => $page,
                        'per_page'  => $perPage,
                    ]
                ]
            ];
        } catch (Throwable $e) {
            return [
                'success' => false,
                'message' => 'nfo.list.error',
                'error'   => $e->getMessage()
            ];
        }
    }

    /** Carica gli assets per un insieme di nfo_uid in una sola query
     * e li inserisce nelle righe come $row['assets'] = [ {symbol, percentage}, ... ].
     *
     * @param array<int,array<string,mixed>> &$rows  Righe risultato con chiave 'nfo_uid'
     */
    private function hydrateAssetsIntoRows(array &$rows): void
    {
        // raccogli gli uid (e pre-inizializza assets)
        $uids = [];
        foreach ($rows as $i => $r) {
            if (!empty($r['nfo_uid'])) {
                $uids[$r['nfo_uid']] = true;
                $rows[$i]['assets'] = [];
            }
        }
        if (empty($uids)) return;

        $uidsArr = array_keys($uids);

        // costruisci placeholder nominativi :uid0,:uid1,...
        $ph = [];
        $params = ['company_uid' => $this->company_uid];
        foreach ($uidsArr as $i => $uid) {
            $key = "uid{$i}";
            $ph[] = ":{$key}";
            $params[$key] = $uid; // string o int ok
        }

        $inList = implode(',', $ph);

        $sql = "SELECT nfo_uid, symbol, percentage
            FROM `nfo_assets`
            WHERE company_uid = :company_uid
              AND nfo_uid IN ($inList)
            ORDER BY symbol ASC";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);
        $assetsRows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // mappa nfo_uid => assets[]
        $assetsMap = [];
        foreach ($assetsRows as $a) {
            $uid = $a['nfo_uid'];
            $assetsMap[$uid][] = [
                'symbol'     => $a['symbol'],
                'percentage' => (float)$a['percentage'],
            ];
        }

        // merge nelle righe
        foreach ($rows as &$row) {
            $uid = $row['nfo_uid'] ?? null;
            if ($uid && isset($assetsMap[$uid])) {
                $row['assets'] = $assetsMap[$uid];
            }
        }
        unset($row);
    }

    // Get last active report for managed_uid (scheduled_at <= now)
    public function get_lastValidReport(string $managed_uid): array
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

            // Ordina per scheduled_at più recente
            $sql .= " ORDER BY `scheduled_at` DESC LIMIT 1";

            $stmt = $this->conn->prepare($sql);
            $stmt->execute($params);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$row) {
                return ['success' => false, 'message' => 'nfo.report.notFound', 'error' => 'No valid report found.'];
            }

            // Carico anche gli assets del report
            $stmtA = $this->conn->prepare("SELECT symbol, percentage
                FROM `nfo_assets` WHERE `company_uid` = :company_uid AND `nfo_uid` = :nfo_uid
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
        bool $extractAll = true,
        int $page = 1,
        int $perPage = 25
    ): array {
        try {
            $page    = max(1, $page);
            $perPage = max(1, $perPage);

            $lastReport_resp = $this->get_lastValidReport($managed_uid);
            if (!$lastReport_resp['success']) {
                return [
                    'success' => false,
                    'message' => 'nfo.alerts.noValidReports',
                    'error'   => "No valid report found."
                ];
            }

            $since = $lastReport_resp['data']['scheduled_at'] ?? null;

            return $this->get_nfoList([
                "managed_uid" => $managed_uid,
                "type" => 'alert',
                "scheduled_from" => $since,
                "valid_only" => true
            ], $extractAll, $page, $perPage, true);
        } catch (Throwable $e) {
            return [
                'success' => false,
                'message' => 'nfo.alerts.validAfterLatestReportFailed',
                'error'   => $e->getMessage()
            ];
        }
    }
}
