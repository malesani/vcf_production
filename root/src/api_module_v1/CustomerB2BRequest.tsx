import { requestFunction, DataResponse } from '../hooks/RequestFunction';

export interface APICustomerB2BInfo {
    customer_uid: string;
    business_name: string;
    address: string;
    city: string;
    zip_code: string;
    province: string;
    general_email: string;
    website: string;
    vat_number: string;
    fiscal_code: string;
    sdi_code: string;
    pec: string;
    user_uid: string;
    deposit_payment_method: string;
    balance_payment_method: string;
    payment_terms: string;
    iban: string;
    intent_declaration: string;
    financing_tender: string;
    additional_requirements: string;
    userStatus?: string;
    estimate_count?: number;
}


export async function getCustomerB2BInfo( { customer_uid }: { customer_uid: string } ): Promise<DataResponse<APICustomerB2BInfo>> {
    const params = { customer_uid };

    const response = await requestFunction('/customers/api/customerB2B.php', 'GET', 'customer_info', params);
    
    let data: APICustomerB2BInfo | undefined;
    if (response.success && response.data && response.data.customer_info) {
        data = response.data.customer_info as APICustomerB2BInfo;
        return { response, data };
    }
    return { response };
}

export async function updateCustomerB2BInfo(
    data: APICustomerB2BInfo
): Promise<DataResponse<APICustomerB2BInfo>> {
    const response = await requestFunction(
    '/customers/api/customerB2B.php',
    'PUT',
    'customer_info',
    data
    );
    if (response.success && response.data?.customer_info) {
    return { response, data: response.data.customer_info as APICustomerB2BInfo };
    }
    return { response };
}

export async function createCustomerB2BInfo(
    data: APICustomerB2BInfo
): Promise<DataResponse<APICustomerB2BInfo>> {
    const response = await requestFunction(
    '/customers/api/customerB2B.php',
    'POST',
    'customer_info',
    data
    );
    if (response.success && response.data?.customer_info) {
    return { response, data: response.data.customer_info as APICustomerB2BInfo };
    }
    return { response };
}




export interface CustomerB2BListParams {
    search?: string;
    city?: string;
    province?: string;
    page?: number;
    per_page?: number;
}
export interface CustomerB2BListData {
    customers_list: APICustomerB2BInfo[];
    total: number;
    page: number;
    per_page: number;
}



export async function getCustomerB2BList(
    params: CustomerB2BListParams = {}
  ): Promise<DataResponse<CustomerB2BListData>> {
    const queryParams = {
      ...(params.search   !== undefined && { search: params.search }),
      ...(params.city     !== undefined && { city: params.city }),
      ...(params.province !== undefined && { province: params.province }),
      ...(params.page     !== undefined && { page: params.page }),
      ...(params.per_page !== undefined && { per_page: params.per_page }),
    };
  
    const response = await requestFunction(
      '/customers/api/customerB2B.php',
      'GET',
      'customers_list',
      queryParams
    );
  
    if (response.success && response.data) {
      // L'API restituisce in `data` un oggetto con customers_list, total, page e per_page
      return {
        response,
        data: response.data as CustomerB2BListData
      };
    }
  
    // In caso di errore, rilancio per gestirlo a monte
    throw new Error(response.error || response.message || 'Request failed');
  }