<?php

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

$srcPath = $_SERVER["DOCUMENT_ROOT"];
if ($srcPath == "") $srcPath = "/var/www/html";

require_once "$srcPath/config/config.php";
require_once "$srcPath/DataProviders/obj/ApiException.php";

use GuzzleHttp\Client;
use GuzzleHttp\Exception\ConnectException;
use GuzzleHttp\Exception\RequestException;

use App\Exceptions\ApiException;

class TwelveDataClient
{
    private Client $http;
    private string $apiKey;

    private PDO $conn;

    private array $importantExchanges  = ['NYSE', 'NASDAQ', 'LSE', 'XETRA', 'EURONEXT'];



    public function __construct(authManager $authManager)
    {
        $this->apiKey = Auth_TwelveData::AuthKey;
        $this->http = new Client([
            'base_uri' => 'https://api.twelvedata.com/',
            'connect_timeout' => 30.0,   // più tempo per stabilire connessione
            'timeout'         => 120.0,  // fino a 2 minuti per ricevere il corpo
            'http_errors' => false,
        ]);

        $this->conn = $authManager->get_dbConn();
    }

    /**
     * Lista azioni
     */
    public function getStocksList(): array
    {
        $stocksInfo = [];

        // Se non ci sono filtri geografici, chiama /stocks una sola volta
        $importantExchanges = empty($this->importantExchanges)
            ? [null]
            : $this->importantExchanges;

        foreach ($importantExchanges as $exchange) {
            // Parametri per la chiamata
            $params = $exchange !== null
                ? ['exchange' => $exchange]
                : [];

            // Esegui la richiesta
            $resp = $this->request('stocks', $params);
            $stocksInfo = array_merge($stocksInfo, $resp['data'] ?? []);
        }

        return $stocksInfo;
    }


    /**
     * Lista coppie Forex
     */
    public function getForexPairsList(): array
    {
        return $this->request('forex_pairs', []);
    }

    /**
     * Lista criptovalute
     */
    public function getCryptoList(): array
    {
        return $this->request('cryptocurrencies', []);
    }

    /**
     * Lista ETF
     */
    public function getEtfList(): array
    {
        return $this->request('etf', []);
    }

    /**
     * Recupera tutti i simboli da tutte le categorie
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
            // risposta può essere in ['data'] oppure array diretto
            $items = $response['data'] ?? $response;
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

    /**
     * Recupera da /stocks e salva in DB.
     *
     * @return array {
     *   @var bool   success    Se l’operazione è andata a buon fine
     *   @var string message    Messaggio user‑friendly per il front-end
     *   @var array  [data]     (opzionale) Payload, es. ['saved' => int]
     *   @var string [error]    (opzionale) Descrizione dettagliata per il log/debug
     * }
     */
    public function saveStocksInfo(): array
    {
        try {
            // 1) Recupera la lista da /stocks
            $response = $this->getStocksList();
            $stocks   = $response['data'] ?? $response;

            if (empty($stocks)) {
                return [
                    'success' => true,
                    'message' => 'Nessun record da salvare.',
                    'data'    => ['saved' => 0],
                ];
            }

            // 2) Prepara lo statement
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

            // 3) Esegui per ogni stock
            $this->conn->beginTransaction();
            foreach ($stocks as $item) {
                $stmt->execute([
                    ':symbol'     => $item['symbol']   ?? null,
                    ':name'       => $item['name']     ?? null,
                    ':currency'   => $item['currency'] ?? null,
                    ':exchange'   => $item['exchange'] ?? null,
                    ':mic_code'   => $item['mic_code'] ?? null,
                    ':country'    => $item['country']  ?? null,
                    ':type'       => $item['type']     ?? null,
                    ':figi_code'  => $item['figi']     ?? null,
                    ':cfi_code'   => $item['cfi']      ?? null,
                ]);
            }
            $this->conn->commit();

            return [
                'success' => true,
                'message' => 'Salvataggio completato con successo.',
                'data'    => ['saved' => count($stocks)],
            ];
        } catch (\PDOException $e) {
            // rollback già implicito se eccezione
            return [
                'success' => false,
                'message' => 'Errore durante il salvataggio dei dati.',
                'error'   => $e->getMessage(),
            ];
        } catch (ApiException $e) {
            return [
                'success' => false,
                'message' => 'Errore di comunicazione con l’API TwelveData.',
                'error'   => sprintf(
                    '[%d] %s (HTTP %d)',
                    $e->getCode(),
                    $e->getMessage(),
                    $e->getHttpStatus()
                ),
            ];
        } catch (\Throwable $e) {
            return [
                'success' => false,
                'message' => 'Errore imprevisto.',
                'error'   => $e->getMessage(),
            ];
        }
    }

    /**
     * Fetch daily time series (storico) fino a 20+ anni
     */
    public function getTimeSeries(
        string $symbol,
        string $interval = '1day',
        int    $outputsize = 5000 // max bars, ~15 anni a daily
    ): array {
        return $this->request('time_series', [
            'symbol'     => $symbol,
            'interval'   => $interval,
            'outputsize' => $outputsize,
        ]);
    }

    /**
     * Fetch a single-quote (prezzi live)
     */
    public function getRealtimePrice(string $symbol): array
    {
        return $this->request('price', [
            'symbol' => $symbol,
        ]);
    }

    /**
     * Update current Price from Piority list
     */
    public function updateCurrentPricesFromPriority(int $limit = 100): array
    {
        try {
            $stmt = $this->conn->prepare("
            SELECT fsp.symbol, fsi.currency
            FROM fin_stocks_priority fsp
            JOIN fin_stocks_info fsi ON fsi.symbol = fsp.symbol
            ORDER BY fsp.watchers_count DESC, fsp.updated_at DESC
            LIMIT :limit
        ");
            $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
            $stmt->execute();
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

            if (empty($rows)) {
                return ['success' => true, 'message' => 'Nessun simbolo da aggiornare.', 'data' => []];
            }

            $symbols  = array_column($rows, 'symbol');
            $currencies = array_unique(array_filter(array_column($rows, 'currency')));

            // Step 2: ottieni fattori conversione EUR
            $conversionRates = $this->getCurrencyConversionRatesToEUR($currencies);

            $successCount = 0;
            $errors = [];

            foreach ($rows as $row) {
                $symbol   = $row['symbol'];
                $currency = $row['currency'];

                try {
                    $quote = $this->getRealtimePrice($symbol);
                    if (!isset($quote['price']) || !is_numeric($quote['price'])) {
                        $errors[] = "Nessun prezzo valido per $symbol";
                        continue;
                    }

                    $priceRaw = (float)$quote['price'];
                    $rate     = $conversionRates[$currency] ?? null;

                    if (!$rate || $rate <= 0) {
                        $errors[] = "Nessun tasso di conversione per $currency ($symbol)";
                        continue;
                    }

                    $priceEUR = round($priceRaw * $rate, 2);

                    // UPDATE
                    $stmt = $this->conn->prepare("
                        UPDATE fin_stocks_info 
                        SET 
                            currentPrice = :price, 
                            last_price_update = NOW(),
                            updated_at = NOW() 
                        WHERE symbol = :symbol
                    ");
                    $stmt->execute([
                        'price'  => $priceEUR,
                        'symbol' => $symbol
                    ]);

                    $successCount++;
                } catch (\Throwable $e) {
                    $errors[] = "Errore per $symbol: " . $e->getMessage();
                }
            }

            return [
                'success' => true,
                'message' => "Aggiornati $successCount simboli.",
                'data'    => ['updated' => $successCount, 'errors' => $errors]
            ];
        } catch (\Throwable $e) {
            return [
                'success' => false,
                'message' => 'Errore durante aggiornamento prezzi',
                'error'   => $e->getMessage()
            ];
        }
    }

    /**
     * Restituisce un array associativo currency => conversion rate verso EUR
     * Esempio: [ 'USD' => 0.91, 'GBP' => 1.17, ... ]
     */
    public function getCurrencyConversionRatesToEUR(array $currencies): array
    {
        $rates = [];

        foreach ($currencies as $currency) {
            if (strtoupper($currency) === 'EUR') {
                $rates['EUR'] = 1.0;
                continue;
            }

            try {
                $conversion = $this->request('currency_conversion', [
                    'symbol' => "{$currency}/EUR",
                    'amount' => 1,
                ]);

                if (isset($conversion['rate']) && is_numeric($conversion['rate'])) {
                    $rates[$currency] = (float)$conversion['rate'];
                } else {
                    // fallback: log con rate null
                    $rates[$currency] = null;
                }
            } catch (\Throwable $e) {
                // Silenzioso: ignora singoli errori ma logga
                $rates[$currency] = null;
            }
        }

        return $rates;
    }



    /**
     * Internal helper per GET con api_key e gestione errori
     */
    private function request(string $endpoint, array $query, int $retryCount = 0): array
    {
        try {
            // 1. Fai la richiesta
            $response  = $this->http->get($endpoint, [
                'query' => array_merge($query, [
                    'apikey' => $this->apiKey,
                ]),
            ]);

            // 2. Leggi codice HTTP e body
            $httpCode  = $response->getStatusCode();
            $body      = (string)$response->getBody();
            $data      = json_decode($body, true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                throw new ApiException(0, 'Invalid JSON: ' . json_last_error_msg(), $httpCode);
            }
            // 3. Controllo unificato di eventuali errori
            //   - HTTP >= 400
            //   - campo status === 'error'
            //   - presenza di code nel JSON
            if ($httpCode === 429 && $response->hasHeader('Retry-After')) {
                sleep((int)$response->getHeaderLine('Retry-After'));
                return $this->request($endpoint, $query);
            }
            // per 5xx:
            if ($httpCode >= 500 && $httpCode < 600) {
                // backoff esponenziale
                usleep(100000 * (1 << $retryCount));
                return $this->request($endpoint, $query, ++$retryCount);
            }

            if (
                $httpCode >= 400
                || ($data['status'] ?? '') === 'error'
                || isset($data['code'])
            ) {
                $code    = $data['code']    ?? $httpCode;
                $message = $data['message'] ?? $response->getReasonPhrase();
                throw new ApiException($code, $message, $httpCode);
            }

            // 4. Tutto ok: restituisci i dati
            return $data;
        } catch (ConnectException $e) {
            throw new ApiException(0, 'Network error: ' . $e->getMessage(), 0, $e);
        } catch (RequestException $e) {
            // Rete o HTTP error con body
            if ($e->hasResponse()) {
                $resp    = $e->getResponse();
                $body    = (string)$resp->getBody();
                $err     = json_decode($body, true);
                $code    = $err['code']    ?? $resp->getStatusCode();
                $message = $err['message'] ?? $resp->getReasonPhrase();
                throw new ApiException($code, $message, $resp->getStatusCode(), $e);
            }
            // Errore di connessione (timeout, DNS, ecc.)
            throw new ApiException(0, $e->getMessage(), 0, $e);
        }
    }
}
