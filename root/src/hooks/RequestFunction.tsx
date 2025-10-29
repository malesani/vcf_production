import { TableMeta, TableData } from '../app_components/TableData/interfaces';


export interface requestResponse {
    success: boolean;
    message: string;
    error?: string;
    data?: any; // Sostituisci "any" con il tipo appropriato se lo conosci
}

export interface DataResponse<T> {
    response: requestResponse;
    data?: T;
}

export type requestType = (
    requestUrl: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    opt?: string,
    parameters?: Record<string, any>,
    requireLogin?: boolean
) => Promise<requestResponse>;

export interface TableDataResponse<T> extends requestResponse {
    data?: {
        rows: T[];
        meta: TableMeta
    }
}


export const requestFunction: requestType = async (requestUrl, method, opt = undefined, parameters = {}, requireLogin = true) => {
    try {
        const options: RequestInit = {
            method,
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        };

        // If GET, opt and parameters as query string
        if (method === 'GET') {
            const queryParams: Record<string, string> = {};

            // Itera sui parametri e aggiungili se definiti, convertendoli in stringa
            for (const key in parameters) {
                if (parameters.hasOwnProperty(key)) {
                    const value = parameters[key];
                    if (value !== undefined && value !== null) {
                        queryParams[key] = String(value);
                    }
                }
            }

            // Aggiungi "opt" se definito
            if (opt !== undefined) {
                queryParams.opt = opt;
            }

            const queryString = new URLSearchParams(queryParams).toString();
            requestUrl += '?' + queryString;

        } else {
            // include "opt" and parameters in body JSON
            options.body = JSON.stringify({ opt, ...parameters });
        }

        const response = await fetch(requestUrl, options);

        if (requireLogin) {
            if (response.status === 401) {
                alert("Sessione scaduta. Effettua nuovamente il login.");
                window.location.href = '/login';
                return { success: false, message: 'Sessione scaduta, redirect a login' };
            }
        }

        if (!response.ok) {
            const errorData = await response.json();
            return {
                success: false,
                message: errorData.message || 'API request failed without message',
                error: errorData.error || 'API request failed without error',
            };
        }

        const data: requestResponse = await response.json();
        return data;
    } catch (error: any) {
        console.error(error);
        return {
            success: false,
            message: 'Error during API request',
            error: error.message || 'Unknown error',
        };
    }
};


export default requestFunction;