<?php
// env_loader.php (o bootstrap.php)

// Configurazione degli errori (in produzione è consigliato disabilitare display_errors)
error_reporting(E_ALL);
ini_set('display_errors', 0);

// Calcola la root del progetto (questa directory)
$projectRoot = realpath(__DIR__);
if (!$projectRoot) {
    die("Project root not found!");
}

// Percorso dell'autoloader: in questo caso, si assume che si trovi in /html/vendor/autoload.php
$autoloadPath = $projectRoot . '/html/vendor/autoload.php';
if (!file_exists($autoloadPath)) {
    die("Autoload file not found at: $autoloadPath");
}
require_once $autoloadPath;

// Imposta il percorso della cartella che contiene il file .env.staging.
// La cartella "creds" si trova nella root, fuori dalla document root (html).
$envPath = $projectRoot . '/creds';
$envFilename = '.env.staging';
$envFileFullPath = $envPath . '/' . $envFilename;

if (!file_exists($envFileFullPath)) {
    die("ENV file not found: " . $envFileFullPath);
} else {
    try {
        $dotenv = Dotenv\Dotenv::createImmutable($envPath, $envFilename);
        $dotenv->load();
    } catch (Exception $e) {
        die("Error loading .env file: " . $e->getMessage());
    }
}
?>
