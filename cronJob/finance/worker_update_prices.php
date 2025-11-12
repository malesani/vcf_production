<?php
ini_set('display_errors', '1');
ini_set('display_startup_errors', '1');
error_reporting(E_ALL);

// DOCUMENT_ROOT fallback (adatta al tuo vhost)
if (!isset($_SERVER['DOCUMENT_ROOT']) || empty($_SERVER['DOCUMENT_ROOT'])) {
    $_SERVER['DOCUMENT_ROOT'] = '/var/www/vhosts/XXX.stsapp.it/httpdocs';
}
$document_root = $_SERVER['DOCUMENT_ROOT'];

// Log path
$log_dir  = $document_root . '/cronJob/finance';
$log_file = $log_dir . '/worker_update_prices.log';

// Assicura la cartella log
if (!is_dir($log_dir)) {
    @mkdir($log_dir, 0775, true);
}

// Dirigi anche l'error_log PHP qui dentro (utile per fatal che sfuggono)
ini_set('error_log', $log_file);

// Handlers per catturare tutto
set_error_handler(function ($errno, $errstr, $errfile, $errline) use ($log_file) {
    $ts = date('Y-m-d H:i:s');
    $msg = "[$ts] PHP ERROR [$errno] $errstr in $errfile:$errline";
    error_log($msg);
    file_put_contents($log_file, "\n$msg", FILE_APPEND);
    // Non interrompere: lascia gestire a PHP gli errori non fatali
    return false;
});
set_exception_handler(function ($e) use ($log_file) {
    $ts = date('Y-m-d H:i:s');
    $msg = "[$ts] UNCAUGHT EXCEPTION: " . get_class($e) . ": " . $e->getMessage() . " in " . $e->getFile() . ":" . $e->getLine();
    error_log($msg);
    file_put_contents($log_file, "\n$msg\n" . $e->getTraceAsString(), FILE_APPEND);
});
register_shutdown_function(function () use ($log_file) {
    $e = error_get_last();
    if ($e && in_array($e['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
        $ts = date('Y-m-d H:i:s');
        $msg = "[$ts] FATAL SHUTDOWN: {$e['message']} in {$e['file']}:{$e['line']}";
        error_log($msg);
        file_put_contents($log_file, "\n$msg", FILE_APPEND);
    }
});

// Rotazione semplice del log
cleanLogIfTooBig($log_file);

// Piccola utility per require “sicuri”
$safeRequire = function (string $path) use ($log_file) {
    if (!file_exists($path)) {
        $ts = date('Y-m-d H:i:s');
        $msg = "[$ts] REQUIRE MISSING: $path";
        file_put_contents($log_file, "\n$msg", FILE_APPEND);
        // Mostra un 500 sensato anche via web
        if (php_sapi_name() !== 'cli') {
            http_response_code(500);
            echo "Internal error: missing dependency ($path)";
        }
        exit(2);
    }
    require_once $path;
};

// ---------- START LOG PRIMA DI QUALSIASI REQUIRE ----------
file_put_contents($log_file, "\n[" . (new DateTime('now'))->format('Y-m-d H:i:s') . "] - START worker_update_prices", FILE_APPEND);

// ---- Require (sicuri) ----
$safeRequire($document_root . "/config/config.php");
$safeRequire($document_root . "/auth/obj/authManager.php");
$safeRequire($document_root . "/DataProviders/obj/ApiException.php");

// Se usi Composer (Guzzle) carica autoload, ma non farlo fallire se manca
$vendorAutoload = $document_root . "/vendor/autoload.php";
if (file_exists($vendorAutoload)) {
    require_once $vendorAutoload;
} else {
    // Se mancano le vendor la classe Guzzle non esisterà -> fallo notare chiaramente
    file_put_contents($log_file, "\n[".date('Y-m-d H:i:s')."] - WARN: vendor/autoload.php non trovato. Verifica Guzzle.", FILE_APPEND);
}

$tdcPath = $document_root . "/DataProviders/obj/TwelveDataClient.php"; // ADATTA se il path è diverso
$safeRequire($tdcPath);

// ---- Usa gli stessi param di prima, ma leggibili anche da ENV ----
$LIMIT  = (int) (getenv('TDC_LIMIT') ?: 200);
$CHUNK  = (int) (getenv('TDC_CHUNK') ?: 40);
$FX_TTL = (int) (getenv('TDC_FX_TTL') ?: 90); // (nella classe è già 90 di default)

// ---- Esecuzione ----
try {
    $auth = new authManager();
    $pdo  = $auth->get_dbConn();

    // facoltativo: prova a emettere/validare service token, ma non bloccare il worker se fallisce
    try {
        if (class_exists('authServices') && property_exists('authServices', 'secretKeyAuth_pricesWorker')) {
            $resp = $auth->issueServiceToken('prices_worker', authServices::secretKeyAuth_pricesWorker);
            if (($resp['success'] ?? false) && isset($resp['data']['token'])) {
                $tokOk = $auth->validateJWT_serviceToken($resp['data']['token']);
                file_put_contents($log_file, "\n[".date('Y-m-d H:i:s')."] - Service token: ".($tokOk ? "OK" : "INVALID"), FILE_APPEND);
            } else {
                file_put_contents($log_file, "\n[".date('Y-m-d H:i:s')."] - Service token: non emesso (procedo).", FILE_APPEND);
            }
        } else {
            file_put_contents($log_file, "\n[".date('Y-m-d H:i:s')."] - Service client non configurato (procedo).", FILE_APPEND);
        }
    } catch (Throwable $e) {
        file_put_contents($log_file, "\n[".date('Y-m-d H:i:s')."] - WARN service token: ".$e->getMessage(), FILE_APPEND);
    }

    // Assicura tabella cache FX
    ensureFxCacheTable($pdo, $log_file);

    // Esegui aggiornamento
    file_put_contents($log_file, "\n[".date('Y-m-d H:i:s')."] - RUN updateCurrentPricesFromPriority (limit=$LIMIT, chunk=$CHUNK)", FILE_APPEND);
    $client = new TwelveDataClient($auth);
    $result = $client->updateCurrentPricesFromPriority($LIMIT, $CHUNK);

    $success = $result['success'] ?? false;
    $msg     = $result['message'] ?? '';
    $updated = $result['data']['updated'] ?? null;
    $errors  = $result['data']['errors'] ?? [];

    file_put_contents($log_file, "\n[".date('Y-m-d H:i:s')."] - RESULT success=".($success?'1':'0')." updated=".$updated." msg=".$msg, FILE_APPEND);
    if (!empty($errors)) {
        $maxErr = 25;
        $slice = array_slice($errors, 0, $maxErr);
        file_put_contents($log_file, "\n - ERRORS(".count($errors).") first $maxErr:\n   - ".implode("\n   - ", $slice), FILE_APPEND);
    }

    // Output “umano” se chiamato via web (facoltativo)
    if (php_sapi_name() !== 'cli') {
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($result, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }
} catch (Throwable $e) {
    // qualsiasi eccezione qui DEVE finire nel log + in output web
    $msg = "FATAL MAIN: ".$e->getMessage();
    error_log($msg);
    file_put_contents($log_file, "\n[".date('Y-m-d H:i:s')."] - ".$msg, FILE_APPEND);
    if (php_sapi_name() !== 'cli') {
        http_response_code(500);
        header('Content-Type: text/plain; charset=utf-8');
        echo $msg;
    }
    exit(2);
}

file_put_contents($log_file, "\n[" . (new DateTime('now'))->format('Y-m-d H:i:s') . "] - END worker_update_prices", FILE_APPEND);

// ===========================
// Funzioni di supporto
// ===========================
function ensureFxCacheTable(PDO $conn, string $log_file): void
{
    try {
        $conn->exec("
            CREATE TABLE IF NOT EXISTS fin_fx_cache (
              base       VARCHAR(8)      NOT NULL,
              quote      VARCHAR(8)      NOT NULL,
              rate       DECIMAL(20,10)  NOT NULL,
              updated_at DATETIME        NOT NULL,
              PRIMARY KEY (base, quote),
              KEY ix_fx_updated (updated_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ");
        file_put_contents($log_file, "\n[".date('Y-m-d H:i:s')."] - FX cache table OK", FILE_APPEND);
    } catch (Throwable $e) {
        file_put_contents($log_file, "\n[".date('Y-m-d H:i:s')."] - ERROR create FX cache: ".$e->getMessage(), FILE_APPEND);
    }
}

function cleanLogIfTooBig(string $log_file): void
{
    $max_lines  = 15000;
    $keep_lines = 10000;

    if (!file_exists($log_file)) {
        @file_put_contents($log_file, '');
        return;
    }
    $content = @file($log_file);
    if ($content === false) return;

    if (count($content) > $max_lines) {
        $content = array_slice($content, -$keep_lines);
        file_put_contents($log_file, implode('', $content));
        file_put_contents($log_file, "\n[".date('Y-m-d H:i:s')."] - Clean logFile history", FILE_APPEND);
    }
}
