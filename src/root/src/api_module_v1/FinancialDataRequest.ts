import { requestFunction, DataResponse } from '../hooks/RequestFunction';

export interface APIStockInfo {
    symbol: string;
    name: string;
    type?: string;
    exchange?: string;
    currency?: string;
    country?: string;
}


export async function getStocksInfo(): Promise<DataResponse<APIStockInfo[]>> {
    const params = {  };

    const response = await requestFunction('/financialData/api/financialData.php', 'GET', 'getStocksInfo', params);

    let data: APIStockInfo[] | undefined;
    if (response.success && response.data && response.data.stocksInfo) {
        data = response.data.stocksInfo as APIStockInfo[];
        return { response, data };
    }
    return { response };
}
