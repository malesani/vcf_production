<?php
namespace App\Exceptions;

class ApiException extends \RuntimeException
{
    private int $httpStatus;

    public function __construct(int $apiCode, string $message, int $httpStatus = 0, null|\Throwable $previous=null)
    {
        parent::__construct($message, $apiCode, $previous);
        $this->httpStatus = $httpStatus;
    }

    public function getHttpStatus(): int
    {
        return $this->httpStatus;
    }
}
?>