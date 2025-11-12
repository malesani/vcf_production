import requestFunction, { requestResponse, DataResponse } from '../../hooks/RequestFunction';
import type { PortManagedInfo, PortManagedAsset } from './constants';

export type { PortManagedInfo } from './constants';

/**
 * singolo portafoglio gestito per managed_uid
 * Restituisce { response, data?: PortManagedInfo } in response.data.managed_portfolio_info
 */
export async function fetchManagedPortfolio(
  { managed_uid }: { managed_uid: string }
): Promise<DataResponse<PortManagedInfo>> {
  const response = await requestFunction(
    '/portfolioManaged/api/managed.php',
    'GET',
    'managed_portfolio_info',
    { managed_uid }
  );
  console.log(response);
  
  if (response.success && response.data?.managed_portfolio_info) {
    return { response, data: response.data.managed_portfolio_info as PortManagedInfo };
  }
  return { response };
}

/**
 * MOCK: tutti i portafogli gestiti ATTIVI
 * Restituisce { response, data?: PortManagedInfo[] } in response.data.data_managed_info
 */
export async function fetchManagedPortfoliosActive(): Promise<DataResponse<PortManagedInfo[]>> {
  const response = await requestFunction(
    '/portfolioManaged/api/managed.php',
    'GET',
    'managed_list',
    { onlyActive: true }
  );

  if (response.success && Array.isArray(response.data?.managed_list)) {
    return { response, data: response.data.managed_list as PortManagedInfo[] };
  }
  return { response };
}
