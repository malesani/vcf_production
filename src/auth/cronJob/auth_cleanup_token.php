<?php 
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

if (!isset($_SERVER['DOCUMENT_ROOT']) || empty($_SERVER['DOCUMENT_ROOT'])) {
    $_SERVER['DOCUMENT_ROOT'] = '/var/www/vhosts/XXX.stsapp.it/httpdocs';
}

$document_root = $_SERVER['DOCUMENT_ROOT'];
$log_file = "$document_root/log/auth/auth_cleanup_token.log";

require_once("$document_root/config/config.php");
require_once("$document_root/auth/authManager.php");


file_put_contents($log_file, "\n[".(new DateTime('now'))->format('Y-m-d H:i:s')."] - EXECUTE auth_cleanup_token", FILE_APPEND);
try {
    
    $authManager = new authManager();
    $conn = $authManager->get_dbConn();

    cleanLogIfTooBig($log_file);
    executeCron($conn, $log_file);

} catch (Exception $e) {
    file_put_contents($log_file, "\n[".(new DateTime('now'))->format('Y-m-d H:i:s')."] - ERROR MAIN CRON: ".$e->getMessage(), FILE_APPEND);
}

function executeCron($conn, $log_file) {
    $currentTime = time();

    // CLEAN REFRESH EXPIRED TOKEN
        $log_clean_refreshToken = "\n[".(new DateTime('now'))->format('Y-m-d H:i:s')."] - Clean REFRESH EXPIRED TOKEN - ";

        try {
            $stmt = $conn->prepare("DELETE FROM auth_refresh_tokens WHERE suspected<>1 AND expires_at < :now");
            $stmt->execute(['now' => $currentTime]);
            $log_clean_refreshToken .= 'SUCCESS';
        } catch (PDOException $e) {
            $log_clean_refreshToken .= 'ERROR: '.$e->getMessage();
        }

        file_put_contents($log_file, $log_clean_refreshToken, FILE_APPEND);
    // end

    // CLEAN BLACKLIST EXPIRED TOKEN dei token in blacklist scaduti
        $log_clean_blacklistToken = "\n[".(new DateTime('now'))->format('Y-m-d H:i:s')."] - Clean BLACKLIST EXPIRED TOKEN - ";

        try {
            $stmt = $conn->prepare("DELETE FROM auth_token_blacklist WHERE expires_at < :now");
            $stmt->execute(['now' => $currentTime]);
            $log_clean_blacklistToken .= 'SUCCESS';
        } catch (PDOException $e) {
            $log_clean_blacklistToken .= 'ERROR: '.$e->getMessage();
        }

        file_put_contents($log_file, $log_clean_blacklistToken, FILE_APPEND);
    // end
}


function cleanLogIfTooBig($log_file) {
    $max_lines = 15000; // max num of rows
    $keep_lines = 10000; // row to keep

    $log_content = file($log_file);

    if (count($log_content) > $max_lines) {
        $log_content = array_slice($log_content, -$keep_lines);
        file_put_contents($log_file, implode('', $log_content));
        file_put_contents($log_file, "\n[".(new DateTime('now'))->format('Y-m-d H:i:s')."] - Clean logFile history", FILE_APPEND);
    }
}
?>
