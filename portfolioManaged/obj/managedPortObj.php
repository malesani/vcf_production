
<?php
require_once("{$_SERVER['DOCUMENT_ROOT']}/auth/obj/authManager.php");
require_once("{$_SERVER['DOCUMENT_ROOT']}/auth/obj/permsManager.php");
require_once("{$_SERVER['DOCUMENT_ROOT']}/nfo/obj/nfoObj.php"); // dove risiedono nfoObjBase, nfoObjList

class managedPortObjBase
{
    protected authManager $authManager;
    protected permsManager $permsManager;
    protected PDO $conn;
    protected array $user_data;
    protected string $company_uid;

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
}



class managedPortObj extends managedPortObjBase
{
    private ?string $managed_uid;
    private array $managed_info = [];     // info da data_managed_info
    private array $assets = [];           // assets base da portfoliosManaged_assets (TS compat: [{symbol, percentage}])
    private ?array $latest_report = null; // ultimo NFO report valido (con assets), se presente

    public function __construct(authManager $authManager, permsManager $permsManager, ?string $managed_uid = null)
    {
        parent::__construct($authManager, $permsManager);
        $this->managed_uid = $managed_uid;
        if ($this->managed_uid) {
            $this->load_data();
        }
    }


    private function load_data(): void
    {
        $this->managed_info = $this->load_managedInfo();

        // Ultimo report valido (anno corrente, month <= mese corrente, status sended)
        $nfoList = new nfoObjList($this->authManager, $this->permsManager);
        $res = $nfoList->get_lastValidReport($this->managed_uid);

        if (!empty($res['success']) && !empty($res['data'])) {
            $this->latest_report = $res['data']; // contiene anche 'assets'
            $this->assets = $this->derive_assets_from_latestReport();
        } else {
            $this->latest_report = null;
            $this->assets = []; // nessun report → nessun asset
        }
    }

    private function derive_assets_from_latestReport(): array
    {
        if (!$this->latest_report || empty($this->latest_report['assets'])) {
            return [];
        }
        // Normalizza al formato TS {symbol, percentage}
        return array_map(fn($a) => [
            'symbol' => (string)$a['symbol'],
            'percentage' => (float)$a['percentage']
        ], $this->latest_report['assets']);
    }


    private function load_managedInfo(): array
    {
        $sql = "
            SELECT managed_uid, title, description, tags,
                   adv_growthPercentFrom, adv_growthPercentTo,
                   adv_timeRangeFrom, adv_timeRangeTo,
                   status, updated_at, created_at
            FROM data_managed_info
            WHERE company_uid = :company_uid
              AND managed_uid = :uid
              AND status IN ('active','draft')  -- se vuoi solo active, cambia qui
            LIMIT 1
        ";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([
            'company_uid' => $this->company_uid,
            'uid'         => $this->managed_uid
        ]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            return ['success' => false, 'message' => 'managed.notFound', 'error' => "Managed portfolio not found: {$this->managed_uid}"];
        }
        // Normalizzo i tags in array se nel DB sono JSON/stringa
        if (!empty($row['tags']) && is_string($row['tags'])) {
            $decoded = json_decode($row['tags'], true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                $row['tags'] = $decoded;
            } else {
                // fallback: split per virgola
                $row['tags'] = array_filter(array_map('trim', explode(',', $row['tags'])));
            }
        } else {
            $row['tags'] = [];
        }
        return $row;
    }



    public function get_managedPortfolio(): array
    {
        if (isset($this->managed_info['success']) && $this->managed_info['success'] === false) {
            return $this->managed_info;
        }

        $out = $this->managed_info;
        $out['assets'] = $this->assets;                  // <- SOLO dal report NFO
        $out['asset_source'] = 'nfo_latest_report';      // (facoltativo ma utile per debug/FE)

        $out['latest_report'] = $this->latest_report ? [
            'nfo_uid'     => $this->latest_report['nfo_uid'],
            'title'       => $this->latest_report['title'],
            'description' => $this->latest_report['description'],
            'html_body'   => $this->latest_report['html_body'],
            'month_num'   => isset($this->latest_report['month_num']) ? (int)$this->latest_report['month_num'] : null,
            'year'        => isset($this->latest_report['year']) ? (int)$this->latest_report['year'] : null,
            'status'      => $this->latest_report['status'],
            'scheduled_at' => $this->latest_report['scheduled_at'] ?? null,
        ] : null;

        return $out;
    }
}



class managedPortObjList extends managedPortObjBase
{
    public function get_managedPortfoliosList(): array
    {
        try {
            $stmt = $this->conn->prepare("
            SELECT managed_uid, title, description, tags, adv_growthPercentFrom, adv_growthPercentTo, adv_timeRangeFrom, adv_timeRangeTo
            FROM data_managed_info
            WHERE company_uid = :company_uid
        ");
            $stmt->execute(['company_uid' => $this->company_uid]);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return [
                'success' => true,
                'message' => 'portfolio.managedListFetched',
                'data'    => ['managed_list' => $rows],
            ];
        } catch (Throwable $e) {
            return [
                'success' => false,
                'message' => 'portfolio.failedToFetchManagedList',
                'error'   => $e->getMessage(),
            ];
        }
    }
}
