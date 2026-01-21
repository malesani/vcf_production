<?php
/**
 * smtpObj.php (semplificato)
 * SMTP raw con config unica da .env (SmtpConfig)
 */

$srcPath = $_SERVER['DOCUMENT_ROOT'] ?: '/var/www/html';
require_once "$srcPath/config/config.php";

class smtpObj
{
    private string $host;
    private int $port;
    private string $user;
    private string $pass;
    private string $encryption; // tls|ssl|none
    private int $timeout;
    private $socket;

    public function __construct(int $timeout = 30)
    {
        $this->timeout = $timeout;

        $this->host       = (string)SmtpConfig::HOST;
        $this->port       = (int)SmtpConfig::PORT;
        $this->user       = (string)SmtpConfig::USER;
        $this->pass       = (string)SmtpConfig::PSWD;
        $this->encryption = strtolower((string)SmtpConfig::CRYPTO);

        if ($this->host === '' || $this->port <= 0) {
            throw new Exception("SMTP config missing (host/port).");
        }
    }

    /**
     * Invia email HTML (puoi estendere per plain multipart se ti serve).
     */
    public function sendMail(string $to, string $subject, string $htmlBody, ?string $from = null, ?string $fromName = null): void
    {
        $from     = $from     ?? (string)SmtpConfig::FROM;
        $fromName = $fromName ?? (string)SmtpConfig::FROM_NAME;

        if ($from === '') {
            throw new Exception("SMTP_FROM is missing.");
        }

        $crypto = $this->encryption;
        $addr = ($crypto === 'ssl')
            ? "ssl://{$this->host}:{$this->port}"
            : "{$this->host}:{$this->port}";

        $this->socket = @stream_socket_client(
            $addr,
            $errno,
            $errstr,
            $this->timeout,
            STREAM_CLIENT_CONNECT
        );
        if (!$this->socket) {
            throw new Exception("SMTP connection failed: $errstr ($errno)");
        }
        stream_set_timeout($this->socket, $this->timeout);

        $debug = (int)SmtpConfig::DEBUG === 1;
        $log = function (string $dir, string $data) use ($debug) {
            if ($debug) error_log("SMTP {$dir}> " . trim($data));
        };

        // Banner + EHLO
        $this->getResponse(true, $log);
        $this->sendCmd("EHLO {$this->host}", true, $log);

        // STARTTLS
        if ($crypto === 'tls') {
            $this->sendCmd("STARTTLS", true, $log);
            if (!stream_socket_enable_crypto($this->socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
                throw new Exception("STARTTLS failed.");
            }
            $this->sendCmd("EHLO {$this->host}", true, $log);
        }

        // AUTH LOGIN (se config user/pass presenti)
        if ($this->user !== '' && $this->pass !== '') {
            $this->sendCmd("AUTH LOGIN", true, $log);
            $this->sendCmd(base64_encode($this->user), true, $log);
            $this->sendCmd(base64_encode($this->pass), true, $log);
        }

        // MAIL flow
        $this->sendCmd("MAIL FROM:<{$from}>", true, $log);
        $this->sendCmd("RCPT TO:<{$to}>", true, $log);
        $this->sendCmd("DATA", true, $log);

        // Headers
        $fromHeader = $fromName !== ''
            ? $this->encodeHeader($fromName) . " <{$from}>"
            : $from;

        $msg  = "From: {$fromHeader}\r\n";
        $msg .= "To: {$to}\r\n";
        $msg .= "Subject: " . $this->encodeHeader($subject) . "\r\n";
        $msg .= "MIME-Version: 1.0\r\n";
        $msg .= "Content-Type: text/html; charset=UTF-8\r\n";
        $msg .= "Content-Transfer-Encoding: 8bit\r\n\r\n";
        $msg .= $htmlBody . "\r\n.\r\n";

        $this->sendCmd($msg, false, $log);

        // QUIT
        try { $this->sendCmd("QUIT", false, $log); } catch (\Throwable $e) {}
        fclose($this->socket);
    }

    private function sendCmd(string $cmd, bool $expectCode = true, ?\Closure $log = null): string
    {
        fwrite($this->socket, $cmd . "\r\n");
        if ($log) $log('C', $cmd);

        $resp = '';
        while (($line = fgets($this->socket, 515)) !== false) {
            $resp .= $line;
            if (isset($line[3]) && $line[3] === ' ') break;
        }
        if ($log) $log('S', $resp);

        if ($expectCode) {
            $code = (int)substr($resp, 0, 3);
            if ($code >= 400) {
                throw new Exception("SMTP error ({$code}): {$resp}");
            }
        }
        return $resp;
    }

    private function getResponse(bool $expectCode = true, ?\Closure $log = null): string
    {
        $resp = '';
        while (($line = fgets($this->socket, 515)) !== false) {
            $resp .= $line;
            if (isset($line[3]) && $line[3] === ' ') break;
        }
        if ($log) $log('S', $resp);

        if ($resp === '') {
            throw new Exception("No response from SMTP server.");
        }
        $code = (int)substr($resp, 0, 3);
        if ($expectCode && $code >= 400) {
            throw new Exception("SMTP error ({$code}): {$resp}");
        }
        return $resp;
    }

    // Per subject/fromName UTF-8
    private function encodeHeader(string $text): string
    {
        $text = trim($text);
        if ($text === '') return '';
        return '=?UTF-8?B?' . base64_encode($text) . '?=';
    }
}
