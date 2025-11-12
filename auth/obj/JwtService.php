<?php
$srcPath = $_SERVER["DOCUMENT_ROOT"];
if ($srcPath == "") $srcPath = "/var/www/html";

require_once "$srcPath/config/config.php";
require_once "$srcPath/vendor/autoload.php";

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

class JwtService
{
    // ENV VARIABLES
        private $authConfig;
    // end

    private string $issuer;
    private string $audience;

    public function __construct(string $issuer = 'App_BackendSystem', string $audience = 'App_FrontendClient')
    {
        $this->authConfig = Auth::class;
        $this->issuer   = $issuer;
        $this->audience = $audience;
    }

    public function generate(array $data, int $ttl): string {
        $now   = time();
        $jti   = bin2hex(random_bytes(16));
        $claims = [
            'iss'  => $this->issuer,
            'aud'  => $this->audience,
            'iat'  => $now,
            'nbf'  => $now,
            'exp'  => $now + $ttl,
            'jti'  => $jti,
            'data' => $data,
            'meta' => [
                'ip'   => $_SERVER['REMOTE_ADDR']  ?? 'unknown',
                'ua'   => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown',
            ],
        ];

        $token = JWT::encode($claims, $this->authConfig::secretKeyAuth, 'HS256');

        return $token;
    }

    public function validate(string $token): array
    {
        try {
            $decoded = JWT::decode($token, new Key($this->authConfig::secretKeyAuth, 'HS256'));
            $now     = time();

            if ($decoded->iss !== $this->issuer) {
                throw new \UnexpectedValueException("Invalid issuer");
            }
            if ($decoded->aud !== $this->audience) {
                throw new \UnexpectedValueException("Invalid audience");
            }
            if ($decoded->iat > $now) {
                throw new \UnexpectedValueException("Token issued in the future");
            }

            return ['success' => true, '' => 'Valid Token', 'data' => $decoded];
        }
        catch (\Exception $e) {
            return [
                'success' => false,
                'error'   => $e->getMessage()
            ];
        }
    }
}
