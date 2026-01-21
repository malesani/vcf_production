<?php
// auth/api/reset.php

// CORS e header di sicurezza
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("X-Content-Type-Options: nosniff");
header("X-Frame-Options: DENY");

ob_start();

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

header("Content-Type: application/json");

// Default: errore server finché non sovrascriviamo
http_response_code(500);

require_once "../inclusions.php";

if ($_SERVER['REQUEST_METHOD'] === "OPTIONS") {
    // Preflight CORS
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === "GET") {
    // Validazione "read-only" del token di reset
    $token = isset($_GET['token']) ? trim((string)$_GET['token']) : '';

    if ($token === '') {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'reset.400.invalidToken',
            'error'   => 'Missing token in query string',
            'code'    => 'invalid',
        ]);
        exit;
    }

    try {
        $authManager = new authManager();
        $check       = $authManager->validateResetToken($token);

        http_response_code(
            isset($check['http_code']) && is_int($check['http_code'])
                ? $check['http_code']
                : ($check['success'] ? 200 : 400)
        );

        echo json_encode([
            'success' => $check['success'],
            'message' => $check['message'] ?? '',
            'error'   => $check['error']   ?? null,
            'code'    => $check['code']    ?? null,
            'email'   => $check['email']   ?? null,
        ]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'reset.500.internalError',
            'error'   => $e->getMessage(),
            'code'    => 'error',
        ]);
    }
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === "POST") {
    $requestDataJson = file_get_contents("php://input");
    $requestData     = json_decode($requestDataJson, true);

    // token e nuova password sono obbligatori
    if (
        !isset($requestData['token']) ||
        !isset($requestData['password'])
    ) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'auth.400.missingRequiredParameters',
            'error'   => 'Missing required parameters: token, password'
        ]);
        exit;
    }

    $token       = trim((string)$requestData['token']);
    $newPassword = (string)$requestData['password'];

    // opzionale: conferma password (se la mandi dal frontend)
    if (isset($requestData['password_confirm'])) {
        $passwordConfirm = (string)$requestData['password_confirm'];
        if ($passwordConfirm !== $newPassword) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => 'auth.400.passwordsDoNotMatch',
                'error'   => 'Password and password_confirm do not match'
            ]);
            exit;
        }
    }

    try {
        $authManager   = new authManager();
        $resetResponse = $authManager->resetPassword($token, $newPassword);

        if (!is_array($resetResponse) || !isset($resetResponse['success'])) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'auth.500.internalServerFatalError',
                'error'   => 'Invalid response from resetPassword'
            ]);
            exit;
        }

        if ($resetResponse['success']) {
            http_response_code(200);
            echo json_encode([
                'success' => true,
                'message' => $resetResponse['message'] ?? 'reset.200.passwordUpdated',
                'email'   => $resetResponse['email'] ?? null,
            ]);
        } else {
            // Se reset fallisce, usiamo 400 di default (o 410/401 se lo decideremo in resetPassword)
            http_response_code(
                isset($resetResponse['http_code']) && is_int($resetResponse['http_code'])
                    ? $resetResponse['http_code']
                    : 400
            );
            echo json_encode([
                'success' => false,
                'message' => $resetResponse['message'] ?? 'reset.400.resetFailed',
                'error'   => $resetResponse['error']   ?? null,
            ]);
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'auth.500.internalServerFatalError',
            'error'   => $e->getMessage()
        ]);
    }
} else {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'message' => 'auth.405.methodNotAllowed',
        'error'   => 'Only POST requests are allowed',
    ]);
}

ob_end_flush();
