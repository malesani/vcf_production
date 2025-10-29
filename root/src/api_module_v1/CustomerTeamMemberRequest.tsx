import { requestFunction, DataResponse } from '../hooks/RequestFunction';

/** SINGLE REQUESTS */
export interface APICustTeamMemberInfo {
  teamMember_uid: string;
  customer_uid:   string;
  first_name:     string;
  last_name:      string;
  email:          string;
  phone:          string;
  user_uid:       string;
  teamRole_uid:   string;
}

/**
 * Fetch a single team member by customer_uid and teamMember_uid
 */
export async function getCustomerTeamMemberInfo(
    data: Pick<APICustTeamMemberInfo, 'customer_uid' | 'teamMember_uid' >
): Promise<DataResponse<APICustTeamMemberInfo>> {
  const response = await requestFunction(
    '/customers/api/customerTeam.php',
    'GET',
    'team_member_info',
    data
  );

  if (
    response.success &&
    response.data?.team_member_info
  ) {
    return {
      response,
      data: response.data.team_member_info as APICustTeamMemberInfo
    };
  }

  return { response };
}

/**
 * Fetch a single team member by customer_uid and teamMember_uid
 */
export async function deleteCustomerTeamMember(
    data: Pick<APICustTeamMemberInfo, 'customer_uid' | 'teamMember_uid' >
): Promise<DataResponse<null>> {
  const response = await requestFunction(
    '/customers/api/customerTeam.php',
    'DELETE',
    'team_member',
    data
  );

  return { response };
}

/**
 * Update an existing team member
 */
export async function updateCustomerTeamMemberInfo(
  data: APICustTeamMemberInfo
): Promise<DataResponse<APICustTeamMemberInfo>> {
  const response = await requestFunction(
    '/customers/api/customerTeam.php',
    'PUT',
    'team_member_info',
    data
  );

  if (
    response.success &&
    response.data?.teamMembers_list
  ) {
    return {
      response,
      data: response.data.teamMembers_list as APICustTeamMemberInfo
    };
  }

  return { response };
}

/**
 * Create a new team member
 */
export async function createCustomerTeamMemberInfo(
  data: Omit<APICustTeamMemberInfo, 'teamMember_uid'>
): Promise<DataResponse<APICustTeamMemberInfo>> {
  const response = await requestFunction(
    '/customers/api/customerTeam.php',
    'POST',
    'team_member_info',
    data
  );

  if (
    response.success &&
    response.data?.team_member_info
  ) {
    return {
      response,
      data: response.data.team_member_info as APICustTeamMemberInfo
    };
  }

  return { response };
}

/**
 * Invite to singup a team member
 */
export async function inviteCustomerTeamMemberInfo(
  data: Pick<APICustTeamMemberInfo, 'teamMember_uid' | 'customer_uid' >
): Promise<DataResponse<{ token: string; }>> {
  const response = await requestFunction(
    '/customers/api/customerTeam.php',
    'POST',
    'invite_custTeamMember',
    data
  );

  if (
    response.success &&
    response.data?.token
  ) {
    return {
      response,
      data: response.data as { token: string; }
    };
  }

  return { response };
}

/** LIST REQUESTS */
export interface CustomerTeamMembersListParams {
  customer_uid: string;
  search?:      string;
  page?:        number;
  per_page?:    number;
}

/**
 * Fetch a paginated list of team members for a given customer
 */
export async function getCustomerTeamMembersList(
  params: CustomerTeamMembersListParams
): Promise<DataResponse<APICustTeamMemberInfo[]>> {  // <— qui
  const response = await requestFunction(
    '/customers/api/customerTeam.php',
    'GET',
    'team_members_list',
    params
  );

  if (response.success && response.data?.teamMembers_list) {
    return {
      response,
      data: response.data.teamMembers_list as APICustTeamMemberInfo[]
    };
  }

  return { response };
}
