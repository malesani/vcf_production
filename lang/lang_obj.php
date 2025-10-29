<?php
if(!isset($_SESSION))
{
    session_start();
}

$srcPath = $_SERVER["DOCUMENT_ROOT"];
if ($srcPath == "") $srcPath = "/var/www/html";

require_once($srcPath."/auth/inclusions.php");


class langClass {
    private $lang_code = "it-IT";

    private $user_data;


    private $conn;

    private $translations = array();
    private $langFile = "";

    
    

    public function __construct(authManager $authManager) {
        $this->conn= $authManager->get_dbConn();
        $this->user_data= $authManager->get_userData();

        $this->load_langCode();
    }

    private function load_langCode() {
        $this->lang_code = 'it-IT';

        if (!empty($this->user_data['user_uid'])) {
            $stmt = $this->conn->prepare("SELECT lang_code FROM acl_users WHERE user_uid = :user_uid;");

            $stmt->execute([ "user_uid" => $this->user_data['user_uid'] ]);

            $response = $stmt->fetch(PDO::FETCH_ASSOC);         // response with user info if exist

            if ($response || !empty($response['lang_code'])) {
                $this->lang_code = $response['lang_code'];
            }
        }

        
        $this->langFile = __DIR__ . "/translations/".$this->lang_code.".php";
        
        if (!file_exists($this->langFile)) {
            throw new Exception("Translation file not found for language: " . $this->lang_code);
        }

        $this->translations = include $this->langFile;

        return true;
    }

    public function set_langCode($newLang_code) {

        $allowedLanguages = ['it-IT', 'eng-ENG'];
        
        if (!in_array($newLang_code, $allowedLanguages)) {
            throw new Exception("Invalid language code: $newLang_code. Allowed languages are: " . implode(", ", $allowedLanguages));
        }
        
        $this->lang_code = $newLang_code;
        $this->langFile = __DIR__ . "/translations/" . $this->lang_code . ".php";
        
        if (!file_exists($this->langFile)) {
            throw new Exception("Translation file not found for language: " . $newLang_code);
        }
        
        $this->translations = include $this->langFile;
        return true;
    }

    public function lang($lang_code) {
        if (isset($this->translations[$lang_code])) {
            return $this->translations[$lang_code];
        } else {
            return $lang_code;
        }

    }

    public function selectedLang() {
        return $this->lang_code;
    }

}

?>