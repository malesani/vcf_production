<?php 
if(!isset($_SESSION))
{
    session_start();
}


class AuthException extends Exception {
    private $errorDetails;

    public function __construct($message, $code = 0, $errorDetails = null) {
        // Inizializza la classe base Exception
        parent::__construct($message, $code);
        $this->errorDetails = $errorDetails;
    }

    // Metodo per ottenere i dettagli dell'errore
    public function getErrorDetails() {
        return $this->errorDetails;
    }

    // Metodo per rappresentare l'errore come stringa
    public function __toString() {
        return "[Error {$this->code}]: {$this->message} - Details: {$this->errorDetails}";
    }
}
?>