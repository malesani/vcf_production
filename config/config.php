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
