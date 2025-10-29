import { requestFunction, DataResponse } from '../hooks/RequestFunction';

/** APIProjectInfo API shape */
export interface APIProjectInfo {
  project_uid: string;
  customer_uid: string;
  client_name: string;
  title: string;
  location: string;
  start_date: string;
  end_date: string;
  stand: string;
  status: "request" | "active";
}


/** GET singolo */
export async function fetchProject(
  { project_uid }: { project_uid: string }
): Promise<DataResponse<APIProjectInfo>> {
  const response = await requestFunction(
    '/projects/api/project.php',
    'GET',
    'project_info',
    { project_uid }
  );

  if (response.success && response.data?.project_info) {
    return { response, data: response.data.project_info };
  }
  return { response };
}

export async function fetchProjectRequest(
  { project_uid }: { project_uid: string }
): Promise<DataResponse<APIProjectInfo>> {
  const response = await requestFunction(
    '/projects/api/project.php',
    'GET',
    'request_info',
    { project_uid }
  );

  if (response.success && response.data?.project_info) {
    return { response, data: response.data.project_info };
  }
  return { response };
}

/** POST crea */
export async function createProject(
  project: Omit<APIProjectInfo, 'project_uid'>
): Promise<DataResponse<APIProjectInfo>> {
  // riconverto in snake_case per l’API
  const payload = project;
  const response = await requestFunction(
    '/projects/api/project.php',
    'POST',
    'project_info',
    payload
  );

  if (response.success && response.data?.project_info) {
    return { response, data: response.data.project_info };
  }
  return { response };
}

export async function createProjectRequest(
  project: Omit<APIProjectInfo, 'project_uid'>
): Promise<DataResponse<APIProjectInfo>> {
  // riconverto in snake_case per l’API
  const payload = project;
  const response = await requestFunction(
    '/projects/api/project.php',
    'POST',
    'request_info',
    payload
  );

  if (response.success && response.data?.project_info) {
    return { response, data: response.data.project_info };
  }
  return { response };
}

/** PUT aggiorna */
export async function updateProject(
  project: APIProjectInfo
): Promise<DataResponse<APIProjectInfo>> {
  const payload = { project };
  const response = await requestFunction(
    '/projects/api/project.php',
    'PUT',
    'project_info',
    payload
  );

  if (response.success && response.data?.project_info) {
    return { response, data: response.data.project_info };
  }
  return { response };
}

export async function updateProjectRequest(
  project: APIProjectInfo
): Promise<DataResponse<APIProjectInfo>> {
  const payload = { project };
  const response = await requestFunction(
    '/projects/api/project.php',
    'PUT',
    'request_info',
    payload
  );

  if (response.success && response.data?.project_info) {
    return { response, data: response.data.project_info };
  }
  return { response };
}

/** Lista progetti */
export interface ProjectListParams {
  search?: string;
  customer_uid?: string;
  page?: number;
  per_page?: number;
}
export interface ProjectListData {
  projects_list: APIProjectInfo[];
  total: number;
  page: number;
  per_page: number;
}

export async function fetchProjects(
  params: ProjectListParams = {}
): Promise<DataResponse<ProjectListData>> {
  const queryParams = {
    ...(params.search       && { search: params.search }),
    ...(params.customer_uid && { customer_uid: params.customer_uid }),
    ...(params.page         && { page: params.page }),
    ...(params.per_page     && { per_page: params.per_page }),
  };
  const response = await requestFunction(
    '/projects/api/project.php',
    'GET',
    'projects_list',
    queryParams
  );

  if (response.success && response.data) {
    return { response, data: response.data as ProjectListData };
  }
  throw new Error(response.error || response.message || 'Request failed');
}

export async function fetchProjectRequests(
  params: ProjectListParams = {}
): Promise<DataResponse<ProjectListData>> {
  const queryParams = {
    ...(params.search       && { search: params.search }),
    ...(params.customer_uid && { customer_uid: params.customer_uid }),
    ...(params.page         && { page: params.page }),
    ...(params.per_page     && { per_page: params.per_page }),
  };
  const response = await requestFunction(
    '/projects/api/project.php',
    'GET',
    'requests_list',
    queryParams
  );

  if (response.success && response.data) {
    return { response, data: response.data as ProjectListData };
  }
  throw new Error(response.error || response.message || 'Request failed');
}
