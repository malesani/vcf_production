import { requestFunction, DataResponse } from '../hooks/RequestFunction';

// LOGIN FUNCTIONS
    export interface LoginResponse {
        success: boolean;
        message: string;
        error?: string;
        auth_token?: string;
        refresh_token?: string;
    }

    export type LoginFunctionType = (username: string, password: string, remember_me?: boolean) => Promise<LoginResponse>;

    export const loginFunction: LoginFunctionType = async (username, password, remember_me = false) => {
        const payload = {
            user_key: username,
            password: password,
            remember_me: remember_me,
        };

        try {

            const response = await fetch('/auth/api/login.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorData = await response.json();
                return {
                    success: false,
                    message: errorData.message || 'Login failed',
                    error: errorData.error,
                };
            }

            const data: LoginResponse = await response.json();

            return data;

        } catch (error: any) {
            console.error('Login error: ', error);
            return {
                success: false,
                message: 'Error during login',
                error: error.message || 'Unknown error',
            };
        }
    };
// end

// PROFILE FUNCTIONS
export interface UserData {
    company_uid: string;
    user_uid: string;
    role_uid: string;
    subRole_uid: string;
    super_admin: boolean;
  }

  export interface CompaniesData {
    company_uid: string;
    name: string;
    address: string;
    phone: string;
    email: string;
  }
  
  export interface ProfileAPI {
    user_data: UserData;
    companies_data: CompaniesData[];
  }  
  
  export type ProfileFunctionType = () => Promise<ProfileAPI>;
  

  export async function profileFunction(): Promise<DataResponse<ProfileAPI>> {
  
      const response = await requestFunction('/auth/api/profile.php', 'GET', '', {}, false);
  
      let data: ProfileAPI | undefined;
      if (response.success && response.data) {
          data = response.data as ProfileAPI;

          return { response, data };
      }
      return { response };
  };
//end  

// LOGOUT FUNCTION
    export type LogoutFunctionType = () => Promise<{ success: boolean; message: string; error?: string }>;

    export const logoutFunction: LogoutFunctionType = async () => {
    try {

        const response = await fetch('/auth/api/logout.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'include'
        });
        
        if (!response.ok) {
        const errorData = await response.json();
        return {
            success: false,
            message: errorData.message || 'Logout failed',
            error: errorData.error,
        };
        }
        
        return {
        success: true,
        message: 'Logout successful'
        };
    } catch (error: any) {
        console.error('Logout error: ', error);
        return {
        success: false,
        message: 'Error during logout',
        error: error.message || 'Unknown error'
        };
    }
    };
// end


// FORGOT PASSWORD FUNCTION
    export interface ForgotPasswordResponse {
        success: boolean;
        message: string;
        error?: string;
    }

    export type ForgotPasswordFunctionType = (email: string) => Promise<ForgotPasswordResponse>;

    export const forgotPasswordFunction: ForgotPasswordFunctionType = async (email: string) => {
        const payload = { email };

        try {
            const response = await fetch('/auth/api/forgot.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json();
                return {
                    success: false,
                    message: errorData.message || 'Forgot password request failed',
                    error: errorData.error,
                };
            }

            const data: ForgotPasswordResponse = await response.json();
            return data;
        } catch (error: any) {
            console.error('Forgot password error: ', error);
            return {
                success: false,
                message: 'Error during forgot password request',
                error: error.message || 'Unknown error',
            };
        }
    };
// end