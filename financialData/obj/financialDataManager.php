<?php

require_once("{$_SERVER['DOCUMENT_ROOT']}/auth/obj/authManager.php");
require_once("{$_SERVER['DOCUMENT_ROOT']}/auth/obj/permsManager.php");

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);


class financialDataManager
{
    private authManager $authManager;
    private PDO         $conn;

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
        $this->authManager  = $authManager;
        $this->conn         = $this->authManager->get_dbConn();
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
}
