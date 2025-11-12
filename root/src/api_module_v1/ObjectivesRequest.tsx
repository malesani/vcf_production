import { requestFunction, DataResponse } from '../hooks/RequestFunction';

export interface APIObjectiveData {
  project_uid: string;
  list_objective_uid: string[];
}

const ENDPOINT = '/pjPlanning/api/objectives.php';

/**
 * Recupera i dati degli objective per un dato project_uid.
 */
export async function getObjectiveData(
  params: { project_uid: string }
): Promise<DataResponse<APIObjectiveData>> {
  const response = await requestFunction(
    ENDPOINT,
    'GET',
    'objective_data',         // uso diretto della stringa
    { project_uid: params.project_uid }
  );

  let data: APIObjectiveData | undefined;
  if (response.success && response.data?.objective_data) {
    const raw = response.data.objective_data as any;
    data = {
      project_uid: raw.project_uid,
      list_objective_uid: Array.isArray(raw.list_objective_uid)
        ? raw.list_objective_uid
        : JSON.parse(raw.list_objective_uid),
    };
    return { response, data };
  }

  return { response };
}

/**
 * Inserisce o aggiorna (upsert) l'array di objective per un dato project_uid.
 */
export async function updateObjectiveData(
  data: { project_uid: string; list_objective_uid: string[] }
): Promise<DataResponse<APIObjectiveData>> {
  const response = await requestFunction(
    ENDPOINT,
    'PUT',
    'objective_data',         // uso diretto della stringa
    data
  );

  if (response.success && response.data?.objective_data) {
    const raw = response.data.objective_data as any;
    const parsed: APIObjectiveData = {
      project_uid: raw.project_uid,
      list_objective_uid: Array.isArray(raw.list_objective_uid)
        ? raw.list_objective_uid
        : JSON.parse(raw.list_objective_uid),
    };
    return { response, data: parsed };
  }

  return { response };
}
