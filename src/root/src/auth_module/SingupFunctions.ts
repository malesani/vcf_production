import { requestFunction, DataResponse } from '../hooks/RequestFunction';

export interface APIinviteCodeInfo {
    company_uid:    string;
    teamMember_uid: string;
    customer_uid:   string;
    sendToEmail:    string;
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

    const response = await requestFunction('/auth/api/signup.php', 'POST', 'validate_rInvitation', params, false);

    let data: APIinviteCodeInfo | undefined;
    if (response.success && response.data && response.data) {
        data = response.data as APIinviteCodeInfo;
        return { response, data };
    }
    return { response };
};
