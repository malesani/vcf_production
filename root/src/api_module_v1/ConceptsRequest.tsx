import { requestFunction, DataResponse } from '../hooks/RequestFunction';

export interface APIConceptData {
  project_uid: string;
  list_concept_uid: string[];
}

const ENDPOINT = '/pjPlanning/api/concepts.php';

/**
 * Recupera i dati degli concept per un dato project_uid.
 */
export async function getConceptData(
  params: { project_uid: string }
): Promise<DataResponse<APIConceptData>> {
  const response = await requestFunction(
    ENDPOINT,
    'GET',
    'concept_data',         // uso diretto della stringa
    { project_uid: params.project_uid }
  );

  let data: APIConceptData | undefined;
  if (response.success && response.data?.concept_data) {
    const raw = response.data.concept_data as any;
    data = {
      project_uid: raw.project_uid,
      list_concept_uid: Array.isArray(raw.list_concept_uid)
        ? raw.list_concept_uid
        : JSON.parse(raw.list_concept_uid),
    };
    return { response, data };
  }

  return { response };
}

/**
 * Inserisce o aggiorna (upsert) l'array di concept per un dato project_uid.
 */
export async function updateConceptData(
  data: { project_uid: string; list_concept_uid: string[] }
): Promise<DataResponse<APIConceptData>> {
  const response = await requestFunction(
    ENDPOINT,
    'PUT',
    'concept_data',         // uso diretto della stringa
    data
  );

  if (response.success && response.data?.concept_data) {
    const raw = response.data.concept_data as any;
    const parsed: APIConceptData = {
      project_uid: raw.project_uid,
      list_concept_uid: Array.isArray(raw.list_concept_uid)
        ? raw.list_concept_uid
        : JSON.parse(raw.list_concept_uid),
    };
    return { response, data: parsed };
  }

  return { response };
}
