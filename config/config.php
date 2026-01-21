<?php

require_once __DIR__ . '/../../env_loader.php';

define('DB_SERVER', $_ENV['DB_SERVER'] ?? '');
define('DB_USERNAME', $_ENV['DB_USERNAME'] ?? '');
define('DB_PASSWORD', $_ENV['DB_PASSWORD'] ?? '');
define('DB_NAME', $_ENV['DB_NAME'] ?? '');

define('SECRET_KEY_AUTH', $_ENV['SECRET_KEY_AUTH'] ?? '');
define('SECRET_KEY_REFRESH', $_ENV['SECRET_KEY_REFRESH'] ?? '');

define('EXPIRATION_TIME', $_ENV['EXPIRATION_TIME'] ?? '');
define('EXPIRATION_TIME_RESTRICTED', $_ENV['EXPIRATION_TIME_RESTRICTED'] ?? '');
define('EXPIRATION_TIME_REFRESH', $_ENV['EXPIRATION_TIME_REFRESH'] ?? '');

define('DEVELOPER_MODE', $_ENV['DEVELOPER_MODE'] ?? '');

define('TWELVE_DATA_APIKEY', $_ENV['TWELVE_DATA_APIKEY'] ?? '');

define('CLIENT_APIKEY_prices_worker', $_ENV['CLIENT_APIKEY_prices_worker'] ?? '');

define('FRONTEND_ORIGIN', $_ENV['FRONTEND_ORIGIN'] ?? '');

define('SMTP_HOST', $_ENV['SMTP_HOST'] ?? '');
define('SMTP_PORT', (int)($_ENV['SMTP_PORT'] ?? 587));
define('SMTP_USER', $_ENV['SMTP_USER'] ?? '');
define('SMTP_PSWD', $_ENV['SMTP_PSWD'] ?? '');
define('SMTP_CRYPTO', $_ENV['SMTP_CRYPTO'] ?? 'tls'); // tls|ssl|none

define('SMTP_FROM', $_ENV['SMTP_FROM'] ?? SMTP_USER);
define('SMTP_FROM_NAME', $_ENV['SMTP_FROM_NAME'] ?? '');
define('SMTP_DEBUG', (int)($_ENV['SMTP_DEBUG'] ?? 0));

abstract class DbData
{
    const db_server   = DB_SERVER;
    const db_username = DB_USERNAME;
    const db_password = DB_PASSWORD;
    const db_name     = DB_NAME;
}

abstract class Auth
{
    const secretKeyAuth     = SECRET_KEY_AUTH;
    const secretKeyRefresh  = SECRET_KEY_REFRESH;

    const expirationTime = EXPIRATION_TIME;
    const expirationTime_restricted = EXPIRATION_TIME_RESTRICTED;
    const expirationTime_refresh = EXPIRATION_TIME_REFRESH;

    const developerMode = DEVELOPER_MODE;
}

abstract class Auth_TwelveData
{
    const AuthKey     = TWELVE_DATA_APIKEY;
}


abstract class authServices
{
    const secretKeyAuth_pricesWorker = CLIENT_APIKEY_prices_worker;
}

abstract class Auth_Frontend
{
    const Origin = FRONTEND_ORIGIN;
}

abstract class SmtpConfig
{
    const HOST  = SMTP_HOST;
    const PORT  = SMTP_PORT;
    const USER  = SMTP_USER;
    const PSWD  = SMTP_PSWD;
    const CRYPTO = SMTP_CRYPTO;

    const FROM = SMTP_FROM;
    const FROM_NAME = SMTP_FROM_NAME;

    const DEBUG = SMTP_DEBUG;
}