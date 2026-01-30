<?php

declare(strict_types=1);

ini_set('display_errors', '1');
ini_set('display_startup_errors', '1');
error_reporting(E_ALL);

$srcPath = $_SERVER["DOCUMENT_ROOT"] ?: "/var/www/html";

require_once "$srcPath/config/config.php";
require_once "$srcPath/DataProviders/obj/ApiException.php";

use GuzzleHttp\Client;
use GuzzleHttp\Exception\ConnectException;
use GuzzleHttp\Exception\RequestException;
use Psr\Http\Message\ResponseInterface;
use App\Exceptions\ApiException;

/**
 * Client per TwelveData con:
 * - richieste HTTP robuste (retry/backoff/jitter/rate-limit)
 * - batch /price e /currency_conversion
 * - selezione metadati “canonici” via vista SQL
 * - scrittura del prezzo ufficiale in EUR in fin_stocks_price
 * - cache dei cambi (FX) con TTL e advisory lock per evitare run paralleli
 */
final class TwelveDataClient
{
    /** @var Client HTTP client Guzzle con base_uri e timeouts */
    private Client $http;

    /** @var string API key TwelveData */
    private string $apiKey;

    /** @var PDO Connessione DB (InnoDB) */
    private PDO $conn;

    /**
     * @var string[] Lista di exchange “importanti” per filtrare /stocks.
     * Modifica l’ordine/valori se vuoi influenzare la vista canonica.
     */
    private array $importantExchanges = ['NYSE', 'NASDAQ', 'LSE', 'XETRA', 'EURONEXT'];

    // ===============================
    // Costanti di configurazione HTTP e retry
    // ===============================
    private const BASE_URI          = 'https://api.twelvedata.com/';
    private const CONNECT_TIMEOUT_S = 30.0;
    private const TIMEOUT_S         = 120.0;

    private const MAX_RETRY       = 5;        // tetto per retry su 5xx/429
    private const BASE_BACKOFF_US = 100_000;  // 100ms
    private const JITTER_US       = 50_000;   // +/- 50ms

    // ===============================
    // Parametri default per chunking
    // ===============================
    private const DEFAULT_LIMIT = 200;
    private const DEFAULT_CHUNK = 40;

    // ===============================
    // Costanti cache FX
    // ===============================
    private const FX_TTL_SECONDS = 90;

    /**
     * Costruttore.
     * Inietta authManager, prepara Guzzle e la connessione PDO in modalità exception.
     */
    public function __construct(authManager $authManager)
    {
        $this->apiKey = Auth_TwelveData::AuthKey;

        $this->http = new Client([
            'base_uri'        => self::BASE_URI,
            'connect_timeout' => self::CONNECT_TIMEOUT_S,
            'timeout'         => self::TIMEOUT_S,
            'http_errors'     => false,
            'headers'         => [
                'User-Agent' => 'TwelveDataClient/1.0 (+yourapp)',
                'Accept'     => 'application/json',
                'Authorization' => 'apikey ' . $this->apiKey,
            ],
        ]);

        $this->conn = $authManager->get_dbConn();
        $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    }

    // =========================================================
    // SEZIONE PUBBLICA – LISTE / UTILITIES DI CATALOGO
    // =========================================================

    /**
     * Restituisce la lista dei titoli azionari filtrando per gli exchange considerati.
     * @return array[] elenco di record provenienti da /stocks
     */
    public function getStocksList(): array
    {
        $stocksInfo = [];
        $exchanges = $this->importantExchanges ?: [null];

        foreach ($exchanges as $exchange) {
            $params = $exchange !== null ? ['exchange' => $exchange] : [];
            $resp   = $this->request('stocks', $params);
            $stocksInfo = array_merge($stocksInfo, $resp['data'] ?? $resp ?? []);
        }

        return $stocksInfo;
    }

    /** @return array Ritorna le coppie Forex da /forex_pairs */
    public function getForexPairsList(): array
    {
        return $this->request('forex_pairs', []);
    }

    /** @return array Ritorna le criptovalute da /cryptocurrencies */
    public function getCryptoList(): array
    {
        return $this->request('cryptocurrencies', []);
    }

    /** @return array Ritorna gli ETF da /etf */
    public function getEtfList(): array
    {
        return $this->request('etf', []);
    }

    /**
     * Aggrega tutti i simboli noti (stock/forex/crypto/etf).
     * @return array[] ogni elemento ha symbol, name, asset_class
     */
    public function getAllSymbols(): array
    {
        $all = [];
        $lists = [
            'stock'  => $this->getStocksList(),
            'forex'  => $this->getForexPairsList(),
            'crypto' => $this->getCryptoList(),
            'etf'    => $this->getEtfList(),
        ];

        foreach ($lists as $asset => $response) {
            $items = $response['data'] ?? $response ?? [];
            foreach ($items as $item) {
                $all[] = [
                    'symbol'      => $item['symbol'] ?? '',
                    'name'        => $item['name'] ?? '',
                    'asset_class' => $asset,
                ];
            }
        }
        return $all;
    }

    public function getEarliestTimestamp(string $symbol, string $interval = '1month'): array
    {
        return $this->request('earliest_timestamp', [
            'symbol'   => $symbol,
            'interval' => $interval,
        ]);
    }

    // =========================================================
    // SEZIONE PUBBLICA – PERSISTENZA / CATALOGO
    // =========================================================

    /**
     * Scarica /stocks e persist(e|a) i metadati in fin_stocks_info.
     * NOTA: se non esiste UNIQUE/PK, l’ON DUPLICATE KEY non farà matching → inserirà tutte le varianti (desired con Soluzione A).
     * @return array esito + contatore salvati
     */
    public function saveStocksInfo(): array
    {
        try {
            $response = $this->getStocksList();
            $stocks   = $response['data'] ?? $response ?? [];

            if (empty($stocks)) {
                return ['success' => true, 'message' => 'Nessun record da salvare.', 'data' => ['saved' => 0]];
            }

            $sql = "
                INSERT INTO `fin_stocks_info`
                   (`symbol`,`name`,`currency`,`exchange`,`mic_code`,`country`,
                    `type`,`figi_code`,`cfi_code`,`updated_at`)
                VALUES
                   (:symbol,:name,:currency,:exchange,:mic_code,:country,
                    :type,:figi_code,:cfi_code, NOW())
                ON DUPLICATE KEY UPDATE
                    `name`       = VALUES(`name`),
                    `currency`   = VALUES(`currency`),
                    `exchange`   = VALUES(`exchange`),
                    `mic_code`   = VALUES(`mic_code`),
                    `country`    = VALUES(`country`),
                    `type`       = VALUES(`type`),
                    `figi_code`  = VALUES(`figi_code`),
                    `cfi_code`   = VALUES(`cfi_code`),
                    `updated_at` = NOW()
            ";
            $stmt = $this->conn->prepare($sql);

            $this->conn->beginTransaction();
            foreach ($stocks as $item) {
                $stmt->execute([
                    ':symbol'   => $item['symbol']   ?? null,
                    ':name'     => $item['name']     ?? null,
                    ':currency' => $item['currency'] ?? null,
                    ':exchange' => $item['exchange'] ?? null,
                    ':mic_code' => $item['mic_code'] ?? null,
                    ':country'  => $item['country']  ?? null,
                    ':type'     => $item['type']     ?? null,
                    ':figi_code' => $item['figi']     ?? null,
                    ':cfi_code' => $item['cfi']      ?? null,
                ]);
            }
            $this->conn->commit();

            return ['success' => true, 'message' => 'Salvataggio completato con successo.', 'data' => ['saved' => count($stocks)]];
        } catch (\Throwable $e) {
            if ($this->conn->inTransaction()) $this->conn->rollBack();
            return ['success' => false, 'message' => 'Errore durante il salvataggio dei dati.', 'error' => $e->getMessage()];
        }
    }

    // =========================================================
    // SEZIONE PUBBLICA – QUOTE / STORICO
    // =========================================================

    /**
     * Restituisce lo storico (daily di default).
     * Supporta anche start_date / end_date (YYYY-MM-DD) per tagliare il range.
     */
    public function getTimeSeries(
        string $symbol,
        string $interval = '1day',
        int $outputsize = 5000,
        ?string $start_date = null,
        ?string $end_date = null
    ): array {
        $params = [
            'symbol'     => $symbol,
            'interval'   => $interval,
            'outputsize' => $outputsize,
        ];

        // TwelveData accetta start_date / end_date (YYYY-MM-DD)
        if ($start_date) $params['start_date'] = $start_date;
        if ($end_date)   $params['end_date']   = $end_date;

        return $this->request('time_series', $params);
    }


    /** Prezzo realtime per singolo simbolo. */
    public function getRealtimePrice(string $symbol): array
    {
        return $this->request('price', ['symbol' => $symbol]);
    }

    // =========================================================
    // SEZIONE PUBBLICA – UPDATE PREZZI CANONICI (Soluzione A)
    // =========================================================

    /**
     * Aggiorna fin_stocks_price (prezzo ufficiale in EUR) per i simboli più presenti nei portafogli.
     * - Lock advisory per evitare run concorrenti
     * - Batch /price
     * - FX con cache (DB) e fallback TwelveData
     */
    public function updateCurrentPricesFromPriority(int $limit = self::DEFAULT_LIMIT, int $chunkSize = self::DEFAULT_CHUNK): array
    {
        $lockName = 'tdc:update_prices';
        if (!$this->acquireAdvisoryLock($lockName, 1)) {
            return ['success' => false, 'message' => 'Worker già in esecuzione (lock attivo).'];
        }

        try {
            $rows = $this->fetchPrioritySymbols($limit);
            if (empty($rows)) {
                return ['success' => true, 'message' => 'Nessun simbolo da aggiornare.', 'data' => []];
            }

            // simboli prioritarî
            $symbols = array_values(array_unique(array_column($rows, 'symbol')));

            // metadati canonici (exchange/mic/currency scelti dalla vista)
            $canonicalMeta = $this->fetchCanonicalMetaForSymbols($symbols);

            // mappa symbol => currency canonica
            $symbolToCurrency = [];
            foreach ($symbols as $s) {
                $symbolToCurrency[$s] = $canonicalMeta[$s]['currency'] ?? null;
            }

            // FX cache + fetch mancanti
            $currencies     = array_unique(array_filter(array_values($symbolToCurrency)));
            $conversionRates = $this->getCurrencyConversionRatesToEUR_Batch($currencies, self::FX_TTL_SECONDS);

            $updated = 0;
            $errors  = [];

            // batch /price
            foreach (array_chunk($symbols, $chunkSize) as $chunk) {
                try {
                    $pricesResp = $this->getRealtimePricesBatch($chunk);
                    $pricesMap  = $this->normalizePriceBatchResponse($pricesResp, $chunk);
                } catch (\Throwable $e) {
                    foreach ($chunk as $s) $errors[] = "Errore batch per chunk contenente $s: " . $e->getMessage();
                    continue;
                }

                foreach ($chunk as $s) {
                    $priceRaw = $pricesMap[$s] ?? null;
                    if (!is_numeric($priceRaw)) {
                        $errors[] = "Nessun prezzo valido per $s";
                        continue;
                    }

                    $currency = isset($symbolToCurrency[$s]) ? strtoupper(trim((string)$symbolToCurrency[$s])) : null;
                    $price    = (float)$priceRaw;

                    if (strtoupper((string)$currency) !== 'EUR') {
                        $rate = $conversionRates[$currency] ?? null;
                        if (!$rate || $rate <= 0) {
                            $errors[] = "FX rate mancante per $currency ($s)";
                            continue;
                        }
                        $price = round($price * $rate, 6);
                    } else {
                        $price = round($price, 6);
                    }

                    $this->upsertCanonicalPrice($s, $price, $canonicalMeta[$s] ?? null);
                    $updated++;
                }
            }

            return ['success' => true, 'message' => "Aggiornati $updated simboli (tabella canonica).", 'data' => ['updated' => $updated, 'errors' => $errors]];
        } catch (\Throwable $e) {
            return ['success' => false, 'message' => 'Errore durante aggiornamento prezzi', 'error' => $e->getMessage()];
        } finally {
            $this->releaseAdvisoryLock($lockName);
        }
    }

    /**
     * Aggiorna e salva il prezzo canonico in EUR per un singolo simbolo.
     * Ritorna il prezzo EUR calcolato, oppure null se non disponibile.
     */
    public function updateCurrentPriceForSymbol(string $symbol): ?float
    {
        $symbol = strtoupper(trim($symbol));
        if ($symbol === '') return null;

        // 1) meta canonici (valuta, exchange, mic, figi)
        $metaMap = $this->fetchCanonicalMetaForSymbols([$symbol]);
        $meta    = $metaMap[$symbol] ?? null;
        $currency = isset($meta['currency']) ? strtoupper((string)$meta['currency']) : null;

        // 2) prezzo grezzo via /price (singolo)
        $priceResp = $this->getRealtimePrice($symbol);
        $rawPrice  = $priceResp['price'] ?? $priceResp['data']['price'] ?? null;
        if (!is_numeric($rawPrice)) {
            return null; // nessun prezzo valido
        }
        $px = (float)$rawPrice;

        // 3) FX → EUR (riusa cache+batch interno anche per singolo)
        if ($currency !== 'EUR') {
            $rates = $this->getCurrencyConversionRatesToEUR_Batch([$currency]); // usa cache e /batch
            $rate  = $rates[$currency] ?? null;
            if (!$rate || $rate <= 0) return null;
            $px = round($px * $rate, 6);
        } else {
            $px = round($px, 6);
        }

        // 4) salva nella tabella canonica
        $this->upsertCanonicalPrice($symbol, $px, $meta);

        return $px;
    }



    // =========================================================
    // SEZIONE PRIVATA – SELECT/UPSERT METADATI & PREZZI
    // =========================================================

    /**
     * Ritorna metadati canonici per un set di simboli, letti dalla vista fin_canonical_per_symbol.
     * @param string[] $symbols
     * @return array<string,array> mappa symbol => meta canonico (exchange, mic_code, figi_code, currency)
     */
    private function fetchCanonicalMetaForSymbols(array $symbols): array
    {
        if (empty($symbols)) return [];
        $in = implode(',', array_fill(0, count($symbols), '?'));

        $sql = "
            SELECT symbol, exchange, mic_code, figi_code, currency
            FROM fin_canonical_per_symbol
            WHERE symbol IN ($in)
        ";
        $stmt = $this->conn->prepare($sql);
        foreach ($symbols as $i => $s) $stmt->bindValue($i + 1, $s, PDO::PARAM_STR);
        $stmt->execute();

        $map = [];
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
            $map[$r['symbol']] = $r;
        }
        return $map;
    }

    /**
     * Upsert del prezzo ufficiale in EUR nella tabella canonica.
     */
    private function upsertCanonicalPrice(string $symbol, float $eur, ?array $meta): void
    {
        $sql = "
            INSERT INTO fin_stocks_price
                (symbol, currentPriceEUR, last_price_update, source_exchange, source_mic_code, source_figi_code, updated_at)
            VALUES
                (:symbol, :eur, NOW(), :ex, :mic, :figi, NOW())
            ON DUPLICATE KEY UPDATE
                currentPriceEUR   = VALUES(currentPriceEUR),
                last_price_update = VALUES(last_price_update),
                source_exchange   = VALUES(source_exchange),
                source_mic_code   = VALUES(source_mic_code),
                source_figi_code  = VALUES(source_figi_code),
                updated_at        = VALUES(updated_at)
        ";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([
            ':symbol' => $symbol,
            ':eur'    => $eur,
            ':ex'     => $meta['exchange']  ?? null,
            ':mic'    => $meta['mic_code']  ?? null,
            ':figi'   => $meta['figi_code'] ?? null,
        ]);
    }

    /**
     * Restituisce i simboli ordinati per “presenza” nei portafogli (DISTINCT portfolio_uid).
     * Fonte: data_portfolios_assets + join fin_stocks_info (per currency fallback).
     */
    private function fetchPrioritySymbols(int $limit): array
    {
        $sql = "
            SELECT dpa.symbol, fsi.currency, COUNT(DISTINCT dpa.portfolio_uid) AS portfolios_count
            FROM data_portfolios_assets dpa
            JOIN fin_stocks_info fsi ON fsi.symbol = dpa.symbol
            GROUP BY dpa.symbol, fsi.currency
            ORDER BY portfolios_count DESC, dpa.symbol ASC
            LIMIT :limit
        ";
        $stmt = $this->conn->prepare($sql);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // =========================================================
    // SEZIONE PRIVATA – FX CACHE (DB) + BATCH
    // =========================================================

    /**
     * Legge dalla cache i cambi base/EUR aggiornati entro il TTL.
     * @param string[] $currencies Elenco valute (es. USD/GBP/CHF)
     * @return array mappa currency => rate (con 'EUR' => 1.0)
     */
    private function getFxFromCacheToEUR(array $currencies, int $ttlSeconds = self::FX_TTL_SECONDS): array
    {
        if (empty($currencies)) return ['EUR' => 1.0];
        $currencies = array_values(array_unique(array_filter($currencies, fn($c) => strtoupper((string)$c) !== 'EUR')));
        if (!$currencies) return ['EUR' => 1.0];

        $place = implode(',', array_fill(0, count($currencies), '?'));
        $sql = "
            SELECT base, rate
            FROM fin_fx_cache
            WHERE quote = 'EUR'
              AND base IN ($place)
              AND updated_at >= (NOW() - INTERVAL ? SECOND)
        ";
        $stmt = $this->conn->prepare($sql);
        $i = 1;
        foreach ($currencies as $c) $stmt->bindValue($i++, $c, PDO::PARAM_STR);
        $stmt->bindValue($i, $ttlSeconds, PDO::PARAM_INT);
        $stmt->execute();

        $out = ['EUR' => 1.0];
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $out[$row['base']] = (float)$row['rate'];
        }
        return $out;
    }

    /**
     * Salva/aggiorna nella cache i cambi base/EUR.
     * @param array $rates mappa base => rate
     */
    private function upsertFxCacheToEUR(array $rates): void
    {
        if (empty($rates)) return;
        $sql = "
            INSERT INTO fin_fx_cache (base, quote, rate, updated_at)
            VALUES (:base, 'EUR', :rate, NOW())
            ON DUPLICATE KEY UPDATE rate = VALUES(rate), updated_at = VALUES(updated_at)
        ";
        $stmt = $this->conn->prepare($sql);
        foreach ($rates as $base => $rate) {
            if ($base === 'EUR' || $rate === null) continue;
            $stmt->execute([':base' => $base, ':rate' => $rate]);
        }
    }

    /**
     * Restituisce i cambi verso EUR usando cache + /batch per i mancanti.
     * Accetta valute tipo ['USD','GBP','CHF'] e ritorna mappa ['EUR'=>1.0,'USD'=>..., ...]
     */
    private function getCurrencyConversionRatesToEUR_Batch(array $currencies, int $ttlSeconds = self::FX_TTL_SECONDS): array
    {
        // Normalizza input e togli EUR
        $all = [];
        foreach ($currencies as $c) {
            if ($c === null || $c === '') continue;
            $cu = strtoupper(trim((string)$c));
            if ($cu === 'EUR') continue;
            $all[] = $cu;
        }
        $all = array_values(array_unique($all));

        // 1) Cache
        $cached = $this->getFxFromCacheToEUR($all, $ttlSeconds); // include sempre 'EUR' => 1.0
        $need   = [];
        foreach ($all as $c) {
            if (!array_key_exists($c, $cached)) $need[] = $c;
        }
        if (empty($need)) return $cached;

        // 2) Batch TwelveData per i mancanti
        // Costruisci payload: ogni richiesta punta a /currency_conversion?symbol=C/EUR&amount=1&apikey=...
        $payload = [];
        $i = 1;
        foreach ($need as $c) {
            $id = "fx_$i";
            $payload[$id] = [
                'url' => "/currency_conversion?symbol={$c}/EUR&amount=1&apikey=" . $this->apiKey
            ];
            $i++;
        }

        $resp = $this->requestBatch($payload);
        $data = $resp['data'] ?? [];

        $fetched = [];
        foreach ($payload as $id => $_url) {
            $node   = $data[$id] ?? null;
            $status = $node['status']   ?? null;
            $respN  = $node['response'] ?? null;

            if ($status !== 'success' || !is_array($respN)) {
                // errore specifico di quella richiesta → salta (rate null)
                // (puoi loggare qui se vuoi)
                continue;
            }

            // /currency_conversion ritorna {rate, amount, symbol, timestamp}
            $pair = $respN['symbol'] ?? null; // es. "USD/EUR"
            $rate = $respN['rate']   ?? null;

            if (is_string($pair) && str_ends_with($pair, '/EUR') && is_numeric($rate)) {
                $base = substr($pair, 0, -4); // taglia "/EUR"
                $fetched[$base] = (float)$rate;
            }
        }

        // 3) Aggiorna cache e unisci (preferisci cached)
        $this->upsertFxCacheToEUR($fetched);
        return (['EUR' => 1.0] + $cached + $fetched);
    }

    // =========================================================
    // SEZIONE PRIVATA – /price BATCH + NORMALIZZATORI
    // =========================================================

    /**
     * Chiamata batch a /price per più simboli.
     * @param string[] $symbols
     * @return array payload grezzo TwelveData (verrà normalizzato)
     */
    private function getRealtimePricesBatch(array $symbols): array
    {
        $symbols = array_values(array_filter(array_unique($symbols)));
        if (!$symbols) return [];
        return $this->request('price', ['symbol' => implode(',', $symbols)]);
    }

    /**
     * Normalizza la risposta di /price batch in una mappa symbol => price.
     * Supporta:
     * - { "AAPL": {"price": ...}, "MSFT": {"price": ...} }
     * - { "data": { "AAPL": {...}, ... } }
     * - { "price": ... } (single symbol)
     * @param array $raw payload TwelveData
     * @param string[] $requestedSymbols
     * @return array<string,float|string>
     */
    private function normalizePriceBatchResponse(array $raw, array $requestedSymbols): array
    {
        $map  = [];
        $data = $raw['data'] ?? $raw;

        // single symbol
        if (isset($data['price']) && count($requestedSymbols) === 1) {
            $map[$requestedSymbols[0]] = $data['price'];
            return $map;
        }

        // batch: mappa per simbolo
        foreach ($requestedSymbols as $s) {
            $node = $data[$s] ?? null;
            if ($node && isset($node['price'])) {
                $map[$s] = $node['price'];
            }
        }

        return $map;
    }

    // =========================================================
    // SEZIONE PRIVATA – Advisory Lock
    // =========================================================

    /**
     * Tenta di acquisire un advisory lock MySQL con nome $name per $timeoutSec secondi.
     * Ritorna true se ottenuto, false se già detenuto da un altro client.
     */
    private function acquireAdvisoryLock(string $name, int $timeoutSec = 0): bool
    {
        $sql = "SELECT GET_LOCK(:n, :t) AS got";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([':n' => $name, ':t' => $timeoutSec]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return isset($row['got']) && (int)$row['got'] === 1;
    }

    /**
     * Rilascia l’advisory lock con nome $name.
     * Si libera automaticamente anche su chiusura della connessione.
     */
    private function releaseAdvisoryLock(string $name): void
    {
        $sql = "SELECT RELEASE_LOCK(:n)";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([':n' => $name]);
    }


    // =========================================================
    // SEZIONE PRIVATA – CHIAMATE HTTP
    // =========================================================

    /**
     * Wrapper GET con querystring + apikey, gestione 429/5xx con backoff e jitter,
     * e unificazione degli errori TwelveData in ApiException.
     * @throws ApiException
     */
    private function request(string $endpoint, array $query, int $retryCount = 0): array
    {
        try {
            /** @var ResponseInterface $response */
            $response = $this->http->get($endpoint, [
                'query' => array_merge($query, ['apikey' => $this->apiKey]),
            ]);

            $httpCode = $response->getStatusCode();
            $body     = (string)$response->getBody();
            $data     = json_decode($body, true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                throw new ApiException(0, 'Invalid JSON: ' . json_last_error_msg(), $httpCode);
            }

            // 429: rispetto Retry-After
            if ($httpCode === 429) {
                if ($retryCount >= self::MAX_RETRY) {
                    throw new ApiException(429, 'Too Many Requests (max retry reached)', 429);
                }
                $retryAfter = (int)($response->getHeaderLine('Retry-After') ?: 1);
                sleep(max(1, $retryAfter));
                return $this->request($endpoint, $query, $retryCount + 1);
            }

            // 5xx: backoff esponenziale con jitter
            if ($httpCode >= 500 && $httpCode < 600) {
                if ($retryCount >= self::MAX_RETRY) {
                    throw new ApiException($httpCode, 'Server error (max retry reached)', $httpCode);
                }
                $backoff = self::BASE_BACKOFF_US * (1 << $retryCount);
                $jitter  = random_int(-self::JITTER_US, self::JITTER_US);
                usleep(max(0, $backoff + $jitter));
                return $this->request($endpoint, $query, $retryCount + 1);
            }

            // errori payload TwelveData
            if ($httpCode >= 400 || ($data['status'] ?? '') === 'error' || isset($data['code'])) {
                $code    = (int)($data['code'] ?? $httpCode);
                $message = (string)($data['message'] ?? $response->getReasonPhrase());
                throw new ApiException($code, $message, $httpCode);
            }

            return $data ?? [];
        } catch (ConnectException $e) {
            throw new ApiException(0, 'Network error: ' . $e->getMessage(), 0, $e);
        } catch (RequestException $e) {
            if ($e->hasResponse()) {
                $resp = $e->getResponse();
                $body = (string)$resp->getBody();
                $err  = json_decode($body, true);
                $code    = (int)($err['code']    ?? $resp->getStatusCode());
                $message = (string)($err['message'] ?? $resp->getReasonPhrase());
                throw new ApiException($code, $message, (int)$resp->getStatusCode(), $e);
            }
            throw new ApiException(0, $e->getMessage(), 0, $e);
        }
    }

    /**
     * POST JSON a /batch con gestione errori simile a request().
     * @throws ApiException
     */
    private function requestBatch(array $payload, int $retryCount = 0): array
    {
        try {
            $response = $this->http->post('batch', ['json' => $payload]);

            $httpCode = $response->getStatusCode();
            $body     = (string)$response->getBody();
            $data     = json_decode($body, true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                throw new ApiException(0, 'Invalid JSON: ' . json_last_error_msg(), $httpCode);
            }

            // 429 → rispetto Retry-After
            if ($httpCode === 429) {
                if ($retryCount >= self::MAX_RETRY) {
                    throw new ApiException(429, 'Too Many Requests (max retry reached)', 429);
                }
                $retryAfter = (int)($response->getHeaderLine('Retry-After') ?: 1);
                sleep(max(1, $retryAfter));
                return $this->requestBatch($payload, $retryCount + 1);
            }

            // 5xx → backoff con jitter
            if ($httpCode >= 500 && $httpCode < 600) {
                if ($retryCount >= self::MAX_RETRY) {
                    throw new ApiException($httpCode, 'Server error (max retry reached)', $httpCode);
                }
                $backoff = self::BASE_BACKOFF_US * (1 << $retryCount);
                $jitter  = random_int(-self::JITTER_US, self::JITTER_US);
                usleep(max(0, $backoff + $jitter));
                return $this->requestBatch($payload, $retryCount + 1);
            }

            // Batch: TwelveData riporta status/code a livello top e per ogni req
            if ($httpCode >= 400 || (($data['status'] ?? '') === 'error')) {
                $code    = (int)($data['code'] ?? $httpCode);
                $message = (string)($data['message'] ?? $response->getReasonPhrase());
                throw new ApiException($code, $message, $httpCode);
            }

            return $data ?? [];
        } catch (ConnectException $e) {
            throw new ApiException(0, 'Network error: ' . $e->getMessage(), 0, $e);
        } catch (RequestException $e) {
            if ($e->hasResponse()) {
                $resp = $e->getResponse();
                $body = (string)$resp->getBody();
                $err  = json_decode($body, true);
                $code    = (int)($err['code']    ?? $resp->getStatusCode());
                $message = (string)($err['message'] ?? $resp->getReasonPhrase());
                throw new ApiException($code, $message, (int)$resp->getStatusCode(), $e);
            }
            throw new ApiException(0, $e->getMessage(), 0, $e);
        }
    }
}
