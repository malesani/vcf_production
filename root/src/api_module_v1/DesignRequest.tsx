import { requestFunction, DataResponse } from '../hooks/RequestFunction';

export interface APIDesignData {
  project_uid: string;
  list_design_uid: string[];
}

const ENDPOINT = '/pjPlanning/api/design.php';

/**
 * Recupera i dati degli design per un dato project_uid.
 */
export async function getDesignData(
  params: { project_uid: string }
): Promise<DataResponse<APIDesignData>> {
  const response = await requestFunction(
    ENDPOINT,
    'GET',
    'design_data',         // uso diretto della stringa
    { project_uid: params.project_uid }
  );

  let data: APIDesignData | undefined;
  if (response.success && response.data?.design_data) {
    const raw = response.data.design_data as APIDesignData;
    data = {
      project_uid: raw.project_uid,
      list_design_uid: Array.isArray(raw.list_design_uid)
        ? raw.list_design_uid
        : JSON.parse(raw.list_design_uid),
    };
    return { response, data };
  }

  return { response };
}

/**
 * Inserisce o aggiorna (upsert) l'array di design per un dato project_uid.
 */
export async function updateDesignData(
  data: { project_uid: string; list_design_uid: string[] }
): Promise<DataResponse<APIDesignData>> {
  const response = await requestFunction(
    ENDPOINT,
    'PUT',
    'design_data',         // uso diretto della stringa
    data
  );

  if (response.success && response.data?.design_data) {
    const raw = response.data.design_data as any;
    const parsed: APIDesignData = {
      project_uid: raw.project_uid,
      list_design_uid: Array.isArray(raw.list_design_uid)
        ? raw.list_design_uid
        : JSON.parse(raw.list_design_uid),
    };
    return { response, data: parsed };
  }

  return { response };
}
