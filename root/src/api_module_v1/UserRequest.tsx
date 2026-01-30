import { requestFunction, requestResponse } from '../hooks/RequestFunction';

export interface APIUserInfo {
  user_uid: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  quiz: number;
  extended_fields?: string | null;
}

// ✅ payload per UPDATE: NON include quiz
export type UpdateUserInfoPayload = Omit<APIUserInfo, "quiz" | "extended_fields">;

type Base64String = string;
export type APIUserInfoEnriched = APIUserInfo & {
  avatarB64?: Base64String;
  avatarUrl?: string;
}

export interface UserInfoResponse {
  response: requestResponse;
  data?: APIUserInfo;
}

export async function getUserInfo(): Promise<UserInfoResponse> {
  const response = await requestFunction('/users/api/user.php', 'GET', 'user_info', {});

  let data: APIUserInfo | undefined;
  if (response.success && response.data && response.data.user_info) {
    data = response.data.user_info as APIUserInfo;
    return { response, data };
  }
  throw new Error(response.error || response.message || 'Request failed');
}

export async function updateUserInfo(
  data: UpdateUserInfoPayload // ✅ qui
): Promise<UserInfoResponse> {
  const response = await requestFunction(
    '/users/api/user.php',
    'PUT',
    'user_info',
    data
  );
  if (response.success && response.data?.user_info) {
    return { response, data: response.data.user_info as APIUserInfo };
  }
  return { response };
}
