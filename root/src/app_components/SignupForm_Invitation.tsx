import React, { useMemo, useState } from "react";
import { MDBRow, MDBCol, MDBInput } from "mdb-react-ui-kit";

import { DataResponse } from "../hooks/RequestFunction";
import { GeneralForm, FieldConfig } from "./GeneralForm";
import { signupRequest } from "../auth_module/SingupFunctions";

interface SignupFormInvitationProps {
    token: string;
    email?: string; // se arriva da magic link / invito -> precompilata
}

interface SignupInvitationPayload {
    email: string;
    first_name: string;
    last_name: string;
    phone: string;
    password: string;
    repassword: string;
}

type Banner = { type: "success" | "error"; text: string } | null;

const SignupForm_Invitation: React.FC<SignupFormInvitationProps> = ({ token, email }) => {
    const [banner, setBanner] = useState<Banner>(null);

    // email gestita fuori dalla GeneralForm
    const [emailValue, setEmailValue] = useState<string>(email ?? "");

    // se l'email arriva già da link, la blocco
    const emailLocked = useMemo(() => !!email && email.trim() !== "", [email]);

    const SignupInvitationFields: FieldConfig<SignupInvitationPayload>[] = [
        { name: "first_name", label: "Nome", required: true, type: "text", grid: { md: 6 } },
        { name: "last_name", label: "Cognome", required: true, type: "text", grid: { md: 6 } },
        { name: "phone", label: "Telefono", required: true, type: "tel", grid: { md: 12 } },

        {
            name: "password",
            label: "Password",
            required: true,
            type: "password",
            grid: { md: 12 },
            validationFeedback: {
                invalid: "La password è obbligatoria e deve avere almeno 8 caratteri.",
                valid: "Ok."
            }
        },
        {
            name: "repassword",
            label: "Conferma Password",
            required: true,
            type: "password",
            grid: { md: 12 },
            equalTo: "password",
            validationFeedback: {
                invalid: "Le password non corrispondono (minimo 8 caratteri).",
                valid: "Le password corrispondono."
            }
        }
    ];

    const completeSignup = async (
        payload: SignupInvitationPayload
    ): Promise<DataResponse<SignupInvitationPayload>> => {
        setBanner(null);

        const safeEmail = (email ?? "").trim();
        const finalEmail = (emailLocked ? safeEmail : emailValue.trim());

        if (!finalEmail) {
            const msg = "Email obbligatoria.";
            setBanner({ type: "error", text: msg });
            return { response: { success: false, message: msg } };
        }

        const resp = await signupRequest({
            email: finalEmail,
            first_name: payload.first_name,
            last_name: payload.last_name,
            phone: payload.phone,
            password: payload.password,
            lang_code: navigator.language ?? "it-IT"
        });

        if (!resp.response.success) {
            const msg = resp.response.message || "Registrazione fallita.";
            setBanner({ type: "error", text: msg });
            return { response: { success: false, message: msg, error: resp.response.error } };
        }

        const msg = resp.response.message || "Registrazione completata. Controlla la mail per attivare l’account.";
        setBanner({ type: "success", text: msg });

        return {
            data: { ...payload, email: finalEmail },
            response: { success: true, message: msg }
        };
    };

    return (
        <MDBRow className="d-flex justify-content-center align-items-center">
            {banner && (
                <div className={`alert alert-${banner.type === "success" ? "success" : "danger"} mb-3`}>
                    {banner.text}
                </div>
            )}

            <MDBCol md="12" className="mb-3">
                <MDBRow className="row g-3 mb-3">
                    <MDBInput
                        type="email"
                        label="Email"
                        value={emailLocked ? (email ?? "") : emailValue}
                        onChange={(e) => setEmailValue(e.target.value)}
                        readOnly={emailLocked}
                    />
                </MDBRow>

                <GeneralForm<SignupInvitationPayload>
                    mode="create"
                    fields={SignupInvitationFields}
                    hideHeader={true}
                    createData={completeSignup}
                    onSuccess={(created) => {
                        console.log("Signup OK:", created);
                    }}
                    createBtnProps={{
                        label: "Registrati",
                    }}
                />
            </MDBCol>
        </MDBRow>
    );
};

export default SignupForm_Invitation;
