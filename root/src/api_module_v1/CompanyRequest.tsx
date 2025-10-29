import { requestFunction, requestResponse } from '../hooks/RequestFunction';

export interface APICompanyInfo {
    company_uid: string;
    name: string;
    address: string | null;
    phone: string | null;
    fax: string | null;
    email: string | null;
    vat: string | null;
}

export interface CompanyInfoResponse {
    response: requestResponse;
    data?: APICompanyInfo;
}

export async function getCompanyInfo(): Promise<CompanyInfoResponse> {

    const response = await requestFunction('/companies/api/company.php', 'GET', 'company_info', {});
    
    let data: APICompanyInfo | undefined;
    if (response.success && response.data && response.data.company_info) {
        data = response.data.company_info as APICompanyInfo;
        return { response, data };
    }
    throw new Error(response.error || response.message || 'Request failed');
}

export async function updateCompanyInfo(
    data: APICompanyInfo
): Promise<CompanyInfoResponse> {
    const response = await requestFunction(
    '/companies/api/company.php',
    'PUT',
    'company_info',
    data
    );
    if (response.success && response.data?.company_info) {
    return { response, data: response.data.company_info as APICompanyInfo };
    }
    return { response };
}