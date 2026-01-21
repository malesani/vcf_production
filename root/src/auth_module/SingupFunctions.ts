import { requestFunction, DataResponse } from "../hooks/RequestFunction";

export interface APIinviteCodeInfo {
    company_uid: string;
    teamMember_uid: string;
    customer_uid: string;
    sendToEmail: string;
    metadata: {
        email?: string;
        first_name?: string;
        last_name?: string;
        phone?: string;
    };
}

export async function validateRInvitation(
    params: { token: string }
): Promise<DataResponse<APIinviteCodeInfo>> {
    const response = await requestFunction(
        "/auth/api/signup.php",
        "POST",
        "validate_rInvitation",
        params,
        false
    );

    let data: APIinviteCodeInfo | undefined;
    if (response.success && response.data) {
        data = response.data as APIinviteCodeInfo;
        return { response, data };
    }
    return { response };
}

// =========================
// SIGNUP
// =========================

export type SignupPayload = {
    email: string;
    first_name: string;
    last_name: string;
    phone?: string | null;
    password: string;
    lang_code?: string;
};

export type SignupAPIResponse = {
    // dipende da cosa ritorna il backend, ma tipicamente:
    user_uid?: string;
    email?: string;
};

export async function signupRequest(
    payload: SignupPayload
): Promise<DataResponse<SignupAPIResponse>> {
    const params = {
        email: payload.email,
        first_name: payload.first_name,
        last_name: payload.last_name,
        phone: payload.phone ?? null,
        password: payload.password,
        lang_code: payload.lang_code ?? navigator.language ?? "it-IT",
    };

    const response = await requestFunction(
        "/auth/api/signup.php",
        "POST",
        "signup",
        params,
        false
    );

    let data: SignupAPIResponse | undefined;
    if (response.success && response.data) {
        data = response.data as SignupAPIResponse;
        return { response, data };
    }

    return { response };
}

// =========================
// ACTIVATE ACCOUNT
// =========================

export interface ActivateAccountResponse {
    user_uid?: string;
    email?: string;
}

export async function activateAccountRequest(
    params: { token: string }
): Promise<DataResponse<ActivateAccountResponse>> {
    // ✅ QUI token deve essere una stringa
    const response = await requestFunction(
        "/auth/api/signup.php",
        "POST",
        "activate_account",
        { token: params.token },   // <--- IMPORTANTISSIMO
        false
    );

    let data: ActivateAccountResponse | undefined;
    if (response.success && response.data) {
        data = response.data as ActivateAccountResponse;
        return { response, data };
    }

    return { response };
}
