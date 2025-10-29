import { requestFunction, requestResponse } from '../hooks/RequestFunction';


export type TestFunctionType = () => Promise<requestResponse>


export const testFunction: TestFunctionType = async () => {
    try {
        const response = await requestFunction(
            '/auth/api/test.php',
            'GET',
            'twelveData'
        );

        return response;
    } catch (error: any) {
        console.error('Test API request error: ', error);
        return {
            success: false,
            message: 'Error during test API request',
            error: error.message || 'Unknown error',
        };
    }
};
