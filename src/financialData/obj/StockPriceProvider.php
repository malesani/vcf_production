<?php
declare(strict_types=1);

ini_set('display_errors', '1');
ini_set('display_startup_errors', '1');
error_reporting(E_ALL);

require_once("{$_SERVER['DOCUMENT_ROOT']}/DataProviders/obj/TwelveDataClient.php");

/**
 * Fornisce il prezzo EUR “canonico” di uno symbol.
 * - Legge da DB (tabella fin_stocks_price)
 * - Se outdated > TTL, chiede a TwelveDataClient di refresh & upsert
 * - In caso di errore nel refresh, ritorna comunque l’ultimo valore noto
 *
 * Uso tipico:
 *   $provider = new StockPriceProvider($authManager);
 *   $out = $provider->getPriceEUR('AAPL');
 *   if ($out['success']) echo $out['price_eur'];
 */
final class StockPriceProvider
{
    private const TTL_SECONDS = 90;

    private PDO $conn;
    private TwelveDataClient $tdc;

    protected const STOCKSINFO_FIELDS = [
        'symbol',
        'exchange',
        'name',
        'currency',
        'country',
        'type',
    ];


    public function __construct(authManager $authManager)
    {
        $this->conn = $authManager->get_dbConn();
        // NON re-implemento nulla: uso direttamente la tua classe client
        $this->tdc  = new TwelveDataClient($authManager);
    }

    /**
     * Ritorna il prezzo EUR di uno symbol.
     * - Se assente o vecchio di oltre TTL, prova a ricalcolare e salvare.
     * - Se il refresh fallisce, ritorna fallback ultimo noto (se esiste).
     *
     * @return array{
     *   success: bool,
     *   symbol: string,
     *   price_eur: float|null,
     *   last_price_update: string|null,
     *   source: 'cache'|'refreshed'|'stale_fallback'|'not_found',
     *   error?: string
     * }
     */
    public function getPriceEUR(string $symbol): array
    {
        $symbol = strtoupper(trim($symbol));
        if ($symbol === '') {
            return [
                'success' => false,
                'symbol'  => $symbol,
                'price_eur' => null,
                'last_price_update' => null,
                'source' => 'not_found',
                'error'  => 'Symbol vuoto'
            ];
        }

        // 1) leggi ultimo noto
        $row = $this->fetchLatestPriceRow($symbol);

        $nowTs = time();
        $stale = true;
        if ($row) {
            $ts  = strtotime($row['last_price_update'] ?? '') ?: 0;
            $stale = ($nowTs - $ts) > self::TTL_SECONDS;
        }

        // Se non stale → ritorna subito
        if ($row && !$stale) {
            return [
                'success' => true,
                'symbol'  => $symbol,
                'price_eur' => isset($row['currentPriceEUR']) ? round((float)$row['currentPriceEUR'], 2) : null,
                'last_price_update' => $row['last_price_update'] ?? null,
                'source' => 'cache'
            ];
        }

        // 2) stale o mancante → prova refresh tramite TwelveDataClient (singolo)
        try {
            $px = $this->tdc->updateCurrentPriceForSymbol($symbol);
            if (is_numeric($px)) {
                // rileggo da DB per ottenere last_price_update coerente
                $row2 = $this->fetchLatestPriceRow($symbol);
                return [
                    'success' => true,
                    'symbol'  => $symbol,
                    'price_eur' => (float)$px,
                    'last_price_update' => $row2['last_price_update'] ?? date('Y-m-d H:i:s'),
                    'source' => 'refreshed'
                ];
            }
        } catch (\Throwable $e) {
            // ignora: fallback sotto
        }

        // 3) fallback: ultimo noto (se esiste)
        if ($row) {
            return [
                'success' => true,
                'symbol'  => $symbol,
                'price_eur' => isset($row['currentPriceEUR']) ? (float)$row['currentPriceEUR'] : null,
                'last_price_update' => $row['last_price_update'] ?? null,
                'source' => 'stale_fallback',
                'error'  => 'Refresh fallito: restituito ultimo noto'
            ];
        }

        // 4) niente in DB e refresh fallito
        return [
            'success' => false,
            'symbol'  => $symbol,
            'price_eur' => null,
            'last_price_update' => null,
            'source' => 'not_found',
            'error'  => 'Prezzo non disponibile'
        ];
    }

    /** Legge la riga di prezzo canonico per symbol dalla tabella fin_stocks_price. */
    private function fetchLatestPriceRow(string $symbol): ?array
    {
        $sql = "
            SELECT symbol, currentPriceEUR, last_price_update, updated_at
            FROM fin_stocks_price
            WHERE symbol = :s
            LIMIT 1
        ";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([':s' => $symbol]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }


    public function get_stocksInfo(
        ?string $type     = null,
        ?string $exchange = null,
        ?string $currency = null,
        ?string $country  = null
    ): array {

        $colsSql = '*';
        if (!empty(self::STOCKSINFO_FIELDS)) {
            $colsSql = implode(', ', array_map(fn($f) => "`$f`", self::STOCKSINFO_FIELDS));
        }

        $wheres = [];
        $params = [];
        if ($type !== null) {
            $wheres[]       = '`type` = :type';
            $params['type'] = $type;
        }
        if ($exchange !== null) {
            $wheres[]       = '`exchange` = :exchange';
            $params['exchange'] = $exchange;
        }
        if ($currency !== null) {
            $wheres[]       = '`currency` = :currency';
            $params['currency'] = $currency;
        }
        if ($country !== null) {
            $wheres[]       = '`country` = :country';
            $params['country'] = $country;
        }

        $whereSql = '';
        if (!empty($wheres)) {
            $whereSql = ' WHERE ' . implode(' AND ', $wheres);
        }

        $query = "
            SELECT $colsSql FROM fin_stocks_info $whereSql;
        ";

        $stmt = $this->conn->prepare($query);
        foreach ($params as $k => $v) {
            $stmt->bindValue(":$k", $v);
        }

        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?? [];
    }

    // Dentro StockPriceProvider

    /** Ritorna SOLO il valore numerico (float|null) del prezzo EUR, con refresh trasparente se stale. */
    public function getPriceEURValue(string $symbol): ?float
    {
        $res = $this->getPriceEUR($symbol);
        if (!$res['success']) return null;
        return is_numeric($res['price_eur'] ?? null) ? (float)$res['price_eur'] : null;
    }

    /**
     * Batch: dati i simboli del portafoglio, torna la lista prezzi.
     * Mantiene la *stessa firma* della vecchia portfolioObj::get_assetPrices()
     * ma usa la fonte canonica (fin_stocks_price) con refresh on-demand per ogni symbol.
     *
     * @param string[] $symbols
     * @return array{
     *   success: bool,
     *   message: string,
     *   data: array<array{symbol:string, currentPrice: float|null}>,
     *   errors?: string[]
     * }
     */
    public function get_assetPrices(array $symbols): array
    {
        // normalizza e deduplica
        $symbols = array_values(array_filter(array_unique(array_map(
            static fn($s) => strtoupper(trim((string)$s)),
            $symbols
        ))));

        if (empty($symbols)) {
            return [
                'success' => true,
                'message' => 'portfolio.assetPricesFetched',
                'data'    => [],
            ];
        }

        $out    = [];
        $errors = [];

        // NB: qui potresti ottimizzare con batch locking per simbolo,
        // ma per semplicità iteriamo e usiamo la logica robusta di getPriceEUR().
        foreach ($symbols as $sym) {
            try {
                $price = $this->getPriceEURValue($sym); // refresh trasparente se > TTL
                $out[] = [
                    'symbol'       => $sym,
                    'currentPrice' => $price,  // mantiene la chiave originale
                ];
            } catch (\Throwable $e) {
                $out[]    = ['symbol' => $sym, 'currentPrice' => null];
                $errors[] = "$sym: " . $e->getMessage();
            }
        }

        $resp = [
            'success' => true,
            'message' => 'portfolio.assetPricesFetched',
            'data'    => $out,
        ];
        if (!empty($errors)) {
            $resp['errors'] = $errors;
        }
        return $resp;
    }
}
