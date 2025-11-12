<?php

require_once("{$_SERVER['DOCUMENT_ROOT']}/auth/obj/authManager.php");
require_once("{$_SERVER['DOCUMENT_ROOT']}/auth/obj/permsManager.php");

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

class companyObj {
    private $authManager;
    private $permsManager;
    private $conn;

    private $company_info;

    public function __construct(authManager $authManager, permsManager $permsManager) {
        $this->authManager = $authManager;
        $this->permsManager = $permsManager;
        $this->conn = $this->authManager->get_dbConn();

        // Ottieni il company_uid dai dati utente (ottenuti dal token)
        $user_data   = $this->authManager->get_userData();
        $company_uid = $user_data['company_uid'];

        $this->company_info = $this->load_companyInfo($company_uid);
    }

    private function load_companyInfo($company_uid) {
        $stmt = $this->conn->prepare("
            SELECT
                company_uid,
                name,
                address,
                phone,
                fax,
                email,
                vat
            FROM acl_companies
            WHERE company_uid = :company_uid
        ");
        $stmt->execute([ "company_uid" => $company_uid ]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row) {
            return $row;
        } else {
            throw new Exception("Company not found for company_uid = '{$company_uid}'");
        }
    }

    public function set_companyInfo(array $newCompanyData): array {
        $company_uid = $this->company_info['company_uid'];
        $required_parameters = ['name', 'address', 'phone', 'fax', 'email', 'vat'];
        $missing_keys = [];

        foreach ($required_parameters as $key) {
            if (!array_key_exists($key, $newCompanyData)) {
                $missing_keys[] = $key;
            }
        }

        if (!empty($missing_keys)) {
            return [
                'success' => false,
                'message' => 'company.missingInfo',
                'error'   => 'newCompanyData missing: ' . json_encode($missing_keys)
            ];
        }

        try {
            $execute_info = [
                'name'        => $newCompanyData['name'],
                'address'     => $newCompanyData['address'],
                'phone'       => $newCompanyData['phone'],
                'fax'         => $newCompanyData['fax'],
                'email'       => $newCompanyData['email'],
                'vat'         => $newCompanyData['vat'],
                'company_uid' => $company_uid
            ];

            $stmt = $this->conn->prepare("
                UPDATE acl_companies
                SET
                    name    = :name,
                    address = :address,
                    phone   = :phone,
                    fax     = :fax,
                    email   = :email,
                    vat     = :vat
                WHERE company_uid = :company_uid
            ");
            $stmt->execute($execute_info);

            // Aggiorna la cache interna
            $this->company_info['name']    = $execute_info['name'];
            $this->company_info['address'] = $execute_info['address'];
            $this->company_info['phone']   = $execute_info['phone'];
            $this->company_info['fax']     = $execute_info['fax'];
            $this->company_info['email']   = $execute_info['email'];
            $this->company_info['vat']     = $execute_info['vat'];

            return [
                'success' => true,
                'message' => 'company.infoUpdated'
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'company.fatalError',
                'error'   => $e->getMessage()
            ];
        }
    }

    public function get_companyInfo() {
        return $this->company_info;
    }
}

?>