<?php
// smtp/obj/templatesObj.php  (VCF - MINIMAL: forgot_password + signup_invitation)

/**
 * templatesObj (VCF)
 *
 * Obiettivo:
 * - mantenere signature compatibile: templatesObj::render($companyUid, $templateName, $templateDesc, $data)
 * - supportare almeno:
 *    - forgot_password
 *    - signup_invitation
 *
 * Nota: in questa versione MINIMAL non gestiamo override DB dei template.
 * Quando ti serve la parte “override per company” la reinseriamo.
 */
class templatesObj
{
    private const APP_NAME = 'VCF';

    /** Tipi supportati */
    private static array $supportedTypes = [
        'forgot_password',
        'signup_invitation',
        'signup_activation',
        'quiz_signup_link',
        'quiz_existing_account'
    ];

    /** Labels (se un domani ti servono nel frontend) */
    private static array $typeLabels = [
        'forgot_password'    => 'Reimposta password account',
        'signup_invitation'  => 'Invito alla registrazione',
    ];

    /** Subject di default */
    private static array $typeSubjects = [
        'forgot_password'   => 'Reimposta la tua password su ' . self::APP_NAME,
        'signup_invitation' => 'Completa la registrazione su ' . self::APP_NAME,
        'signup_activation' => 'Attiva il tuo account su ' . self::APP_NAME,
        'quiz_signup_link'       => 'Completa la registrazione per salvare i tuoi risultati su ' . self::APP_NAME,
        'quiz_existing_account'  => 'Quiz non associato: accedi per continuare su ' . self::APP_NAME,
    ];

    /**
     * Renderizza un template HTML completo.
     *
     * @param string $companyUid   (compat, in questa versione non usato)
     * @param string $templateName "forgot_password" | "signup_invitation"
     * @param string $templateDesc (compat, non usato)
     * @param array  $data         dati per placeholder
     */
    public static function render(string $companyUid, string $templateName, string $templateDesc, array $data): string
    {
        if (!in_array($templateName, self::$supportedTypes, true)) {
            throw new Exception("Template non supportato: {$templateName}");
        }

        // Subject centralizzato
        $subject = self::resolveSubject($companyUid, $templateName, $data);

        // Inner (contenuto centrale)
        $innerRaw = self::renderInner($templateName, $data);

        // Placeholder replacement (inner)
        $inner = self::replacePlaceholders($innerRaw, $data);

        // Shell completa
        return self::buildShell($subject, $inner, [
            'company'  => $data['company'] ?? self::APP_NAME,
            'year'     => $data['year'] ?? date('Y'),
            'home_url' => $data['home_url'] ?? '',   // opzionale: link footer
        ]);
    }

    /**
     * Subject centralizzato (placeholder ok).
     * Mantiene firma compat.
     */
    public static function resolveSubject(string $companyUid, string $templateName, array $data): string
    {
        $subject = self::$typeSubjects[$templateName] ?? ('Notifica ' . self::APP_NAME);
        return self::replacePlaceholders($subject, $data);
    }

    // =========================================================
    // INNER TEMPLATES
    // =========================================================

    private static function renderInner(string $templateName, array $data): string
    {
        return match ($templateName) {
            'forgot_password'   => self::forgotPasswordInner($data),
            'signup_invitation' => self::signupInvitationInner($data),
            'signup_activation' => self::signupActivationInner($data),
            'quiz_signup_link'        => self::quizSignupLinkInner($data),
            'quiz_existing_account'   => self::quizExistingAccountInner($data),
            default => throw new Exception("Template inner non definito: {$templateName}")
        };
    }

    /**
     * Inner: forgot_password
     *
     * Variabili utili:
     * - email (testo)
     * - reset_link (obbligatorio)
     * - support_email (opzionale)
     */
    private static function forgotPasswordInner(array $data): string
    {
        $email        = isset($data['email']) ? (string)$data['email'] : '';
        $supportEmail = isset($data['support_email']) ? (string)$data['support_email'] : 'supporto@vcf.it';

        $safeEmail   = htmlspecialchars($email, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $safeSupport = htmlspecialchars($supportEmail, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');

        // reset_link come placeholder -> sostituito dopo
        return <<<HTML
        <p style="font-size:16px;margin:0 0 10px;">Ciao,</p>

        <p style="font-size:16px;line-height:1.5;margin:0 0 16px;">
          Abbiamo ricevuto una richiesta di reimpostazione della password per l'account associato all'indirizzo
          <strong>{$safeEmail}</strong>.
        </p>

        <p style="font-size:16px;line-height:1.5;margin:0 0 16px;">
          Per scegliere una nuova password, clicca sul pulsante qui sotto:
        </p>

        <p style="text-align:center;margin:0 0 24px;">
          <a href="{{reset_link}}"
             style="display:inline-block;background-color:#0073e6;color:#ffffff;padding:10px 24px;border-radius:6px;text-decoration:none;font-size:16px;">
            Reimposta la password
          </a>
        </p>

        <p style="font-size:14px;color:#666666;margin:0 0 12px;">
          Se non hai richiesto questa operazione puoi ignorare questa email.
          Per motivi di sicurezza, il link scadrà dopo poco tempo.
        </p>

        <p style="font-size:14px;color:#666666;margin:0;">
          Per assistenza: <a href="mailto:{$safeSupport}" style="color:#0073e6;text-decoration:none;">{$safeSupport}</a>.
        </p>
        HTML;
    }

    /**
     * Inner: signup_activation
     *
     * Variabili utili:
     * - first_name (opzionale)
     * - email (testo)
     * - activate_link (obbligatorio)
     * - expires_hours (opzionale, numero ore)
     * - support_email (opzionale)
     */
    private static function signupActivationInner(array $data): string
    {
        $firstName    = isset($data['first_name']) ? (string)$data['first_name'] : '';
        $email        = isset($data['email']) ? (string)$data['email'] : '';
        $supportEmail = isset($data['support_email']) ? (string)$data['support_email'] : 'supporto@vcf.it';
        $expiresHours = isset($data['expires_hours']) ? (string)$data['expires_hours'] : '24';

        $safeName    = htmlspecialchars($firstName, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $safeEmail   = htmlspecialchars($email, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $safeSupport = htmlspecialchars($supportEmail, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');

        $greeting = $safeName !== '' ? "Ciao {$safeName}," : "Ciao,";

        return <<<HTML
            <p style="font-size:16px;margin:0 0 10px;">{$greeting}</p>

            <p style="font-size:16px;line-height:1.5;margin:0 0 16px;">
            Grazie per esserti registrato. Per completare la registrazione e attivare il tuo account associato a
            <strong>{$safeEmail}</strong>, clicca sul pulsante qui sotto:
            </p>

            <p style="text-align:center;margin:0 0 24px;">
            <a href="{{activate_link}}"
                style="display:inline-block;background-color:#0073e6;color:#ffffff;padding:10px 24px;border-radius:6px;text-decoration:none;font-size:16px;">
                Attiva account
            </a>
            </p>

            <p style="font-size:14px;color:#666666;margin:0 0 12px;">
            Se il pulsante non funziona, copia e incolla questo link nel browser:
            <br>
            <a href="{{activate_link}}" style="color:#0073e6;text-decoration:none;word-break:break-all;">{{activate_link}}</a>
            </p>

            <p style="font-size:14px;color:#666666;margin:0 0 12px;">
            Per motivi di sicurezza, il link scadrà tra <strong>{$expiresHours} ore</strong>.
            Se non sei stato tu a registrarti, puoi ignorare questa email.
            </p>

            <p style="font-size:14px;color:#666666;margin:0;">
            Per assistenza: <a href="mailto:{$safeSupport}" style="color:#0073e6;text-decoration:none;">{$safeSupport}</a>.
            </p>
            HTML;
    }

    /**
     * Inner: signup_invitation
     *
     * Variabili utili:
     * - email (testo)
     * - signup_link (obbligatorio)  es: https://.../signup?t=...
     * - support_email (opzionale)
     */
    private static function signupInvitationInner(array $data): string
    {
        $email        = isset($data['email']) ? (string)$data['email'] : '';
        $supportEmail = isset($data['support_email']) ? (string)$data['support_email'] : 'supporto@vcf.it';

        $safeEmail   = htmlspecialchars($email, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $safeSupport = htmlspecialchars($supportEmail, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');

        // signup_link come placeholder -> sostituito dopo
        return <<<HTML
        <p style="font-size:16px;margin:0 0 10px;">Ciao,</p>

        <p style="font-size:16px;line-height:1.5;margin:0 0 16px;">
          È stato avviato un processo di registrazione per l'account associato all'indirizzo
          <strong>{$safeEmail}</strong>.
        </p>

        <p style="font-size:16px;line-height:1.5;margin:0 0 16px;">
          Per completare la registrazione, clicca sul pulsante qui sotto:
        </p>

        <p style="text-align:center;margin:0 0 24px;">
          <a href="{{signup_link}}"
             style="display:inline-block;background-color:#0073e6;color:#ffffff;padding:10px 24px;border-radius:6px;text-decoration:none;font-size:16px;">
            Completa registrazione
          </a>
        </p>

        <p style="font-size:14px;color:#666666;margin:0 0 12px;">
          Se non sei stato tu, puoi ignorare questa email.
        </p>

        <p style="font-size:14px;color:#666666;margin:0;">
          Per assistenza: <a href="mailto:{$safeSupport}" style="color:#0073e6;text-decoration:none;">{$safeSupport}</a>.
        </p>
        HTML;
    }

    /**
     * Inner: quiz_signup_link
     *
     * Variabili utili:
     * - first_name (opzionale)
     * - email (testo)
     * - signup_link (obbligatorio) es: https://.../signup?email=...  oppure /signup?t=...
     * - support_email (opzionale)
     */
    private static function quizSignupLinkInner(array $data): string
    {
        $firstName    = isset($data['first_name']) ? (string)$data['first_name'] : '';
        $email        = isset($data['email']) ? (string)$data['email'] : '';
        $supportEmail = isset($data['support_email']) ? (string)$data['support_email'] : 'supporto@vcf.it';

        $safeName    = htmlspecialchars($firstName, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $safeEmail   = htmlspecialchars($email, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $safeSupport = htmlspecialchars($supportEmail, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');

        $greeting = $safeName !== '' ? "Ciao {$safeName}," : "Ciao,";

        return <<<HTML
        <p style="font-size:16px;margin:0 0 10px;">{$greeting}</p>

        <p style="font-size:16px;line-height:1.5;margin:0 0 16px;">
        Grazie per aver completato il quiz.
        Per <strong>salvare i tuoi progressi</strong> e accedere alla tua dashboard, completa la registrazione
        con l'indirizzo <strong>{$safeEmail}</strong>.
        </p>

        <p style="text-align:center;margin:0 0 24px;">
        <a href="{{signup_link}}"
            style="display:inline-block;background-color:#0073e6;color:#ffffff;padding:10px 24px;border-radius:6px;text-decoration:none;font-size:16px;">
            Completa registrazione
        </a>
        </p>

        <p style="font-size:14px;color:#666666;margin:0 0 12px;">
        Se il pulsante non funziona, copia e incolla questo link nel browser:
        <br>
        <a href="{{signup_link}}" style="color:#0073e6;text-decoration:none;word-break:break-all;">{{signup_link}}</a>
        </p>

        <p style="font-size:14px;color:#666666;margin:0 0 12px;">
        Se non hai richiesto tu questa operazione, puoi ignorare questa email.
        </p>

        <p style="font-size:14px;color:#666666;margin:0;">
        Per assistenza: <a href="mailto:{$safeSupport}" style="color:#0073e6;text-decoration:none;">{$safeSupport}</a>.
        </p>
        HTML;
    }

    /**
     * Inner: quiz_existing_account
     *
     * Variabili utili:
     * - first_name (opzionale)
     * - email (testo)
     * - login_link (obbligatorio) es: https://.../login?email=...
     * - support_email (opzionale)
     */
    private static function quizExistingAccountInner(array $data): string
    {
        $firstName    = isset($data['first_name']) ? (string)$data['first_name'] : '';
        $email        = isset($data['email']) ? (string)$data['email'] : '';
        $supportEmail = isset($data['support_email']) ? (string)$data['support_email'] : 'supporto@vcf.it';

        $safeName    = htmlspecialchars($firstName, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $safeEmail   = htmlspecialchars($email, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $safeSupport = htmlspecialchars($supportEmail, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');

        $greeting = $safeName !== '' ? "Ciao {$safeName}," : "Ciao,";

        return <<<HTML
        <p style="font-size:16px;margin:0 0 10px;">{$greeting}</p>

        <p style="font-size:16px;line-height:1.5;margin:0 0 16px;">
        Hai inserito l'indirizzo <strong>{$safeEmail}</strong>, ma risulta già associato a un account esistente.
        Per questo motivo il quiz completato in modalità anonima <strong>non è stato associato</strong> al tuo profilo.
        </p>

        <p style="font-size:16px;line-height:1.5;margin:0 0 16px;">
        Accedi con il tuo account per continuare:
        </p>

        <p style="text-align:center;margin:0 0 24px;">
        <a href="{{login_link}}"
            style="display:inline-block;background-color:#0073e6;color:#ffffff;padding:10px 24px;border-radius:6px;text-decoration:none;font-size:16px;">
            Vai al login
        </a>
        </p>

        <p style="font-size:14px;color:#666666;margin:0 0 12px;">
        Se il pulsante non funziona, copia e incolla questo link nel browser:
        <br>
        <a href="{{login_link}}" style="color:#0073e6;text-decoration:none;word-break:break-all;">{{login_link}}</a>
        </p>

        <p style="font-size:14px;color:#666666;margin:0 0 12px;">
        Se non sei stato tu a inserire questa email, puoi ignorare questa comunicazione.
        </p>

        <p style="font-size:14px;color:#666666;margin:0;">
        Per assistenza: <a href="mailto:{$safeSupport}" style="color:#0073e6;text-decoration:none;">{$safeSupport}</a>.
        </p>
        HTML;   
    }



    // =========================================================
    // SHELL + PLACEHOLDERS
    // =========================================================

    private static function buildShell(string $subject, string $innerHtml, array $opts = []): string
    {
        $company = (string)($opts['company'] ?? self::APP_NAME);
        $year    = (string)($opts['year'] ?? date('Y'));
        $homeUrl = isset($opts['home_url']) && is_string($opts['home_url']) ? $opts['home_url'] : '';

        $safeTitle   = htmlspecialchars($subject, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $safeCompany = htmlspecialchars($company, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');

        $homeLink = $homeUrl !== ''
            ? '<div style="margin-top:6px;"><a href="' . htmlspecialchars($homeUrl, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') . '" style="color:#0073e6;text-decoration:none;">Accedi a ' . $safeCompany . '</a></div>'
            : '';

        return <<<HTML
        <!DOCTYPE html>
        <html lang="it">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
          <title>{$safeTitle}</title>
        </head>
        <body style="margin:0;padding:0;background-color:#f4f4f4;">

          <!-- HEADER FULL WIDTH -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FEFEFE;border-bottom:1px solid #BABABA80;">
            <tr>
              <td align="center" style="padding:16px;">
                <div style="font:700 20px Arial,Helvetica,sans-serif;color:#333">{$safeCompany}</div>
              </td>
            </tr>
          </table>

          <!-- BODY CONTAINER -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:20px 0;">
            <tr>
              <td align="center">
                <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;">
                  <tr>
                    <td style="padding:20px;color:#333333;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.5;">
                      {$innerHtml}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <!-- FOOTER FULL WIDTH -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FEFEFE;border-top:1px solid #BABABA80;">
            <tr>
              <td align="center" style="padding:12px 16px;color:#666666;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.4;">
                <div>Questa mail ti è stata inviata in automatico da <strong>{$safeCompany}</strong>.</div>
                {$homeLink}
                <div style="color:#8a8a8a;margin-top:6px;">&copy; {$year} {$safeCompany}. Tutti i diritti riservati.</div>
              </td>
            </tr>
          </table>

        </body>
        </html>
        HTML;
    }

    /**
     * Sostituisce {{chiave}} con valore in $data; se mancante -> stringa vuota.
     * Supporta dot-notation (es. user.name).
     *
     * Nota: qui NON facciamo escaping automatico (coerente con la tua implementazione grande).
     * Nei template inner facciamo già htmlspecialchars sui campi "umani".
     */
    private static function replacePlaceholders(string $text, array $data): string
    {
        return preg_replace_callback('/\{\{\s*([a-zA-Z0-9_\.]+)\s*\}\}/', function ($m) use ($data) {
            $key = $m[1];
            $value = $data;

            foreach (explode('.', $key) as $part) {
                if (is_array($value) && array_key_exists($part, $value)) {
                    $value = $value[$part];
                } else {
                    $value = '';
                    break;
                }
            }

            if (is_array($value) || is_object($value)) return '';
            return (string)$value;
        }, $text) ?? $text;
    }
}
