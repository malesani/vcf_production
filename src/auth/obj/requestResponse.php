<?php

$srcPath = $_SERVER['DOCUMENT_ROOT'] ?: '/var/www/html';
require_once "$srcPath/auth/obj/authManager.php";
require_once "$srcPath/lang/lang_obj.php";

class RequestResponse
{
    private bool $devMode = false;

    private array $response = [];
    private langClass $trad;

    public function __construct(private authManager $authManager)
    {
        $this->trad = new langClass($authManager);
        $this->devMode = $authManager->is_devMode();
    }

    public function toArray(bool $success, string $message, ?string $error = null, ?array $data = null): array
    {
        $this->response = [
            "success" => $success,
            "message" => $this->trad->lang($message),
        ];

        if ($success) {
            if (!empty($data)) {
                $this->response["data"] = $data;
            }
        } else {
            if ($this->devMode) {
                $this->response["error"] = $this->trad->lang($error) ?? 'UNKNOWN.ERROR';
            }
        }

        return $this->response;
    }
}
