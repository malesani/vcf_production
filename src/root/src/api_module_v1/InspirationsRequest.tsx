import { requestFunction, DataResponse } from '../hooks/RequestFunction';

const ENDPOINT = '/pjPlanning/api/inspirations.php';

export interface APIAnswerData {
    project_uid: string;
    question_uid: string;
    answer_uid: string;
}

export async function getAnswersData(
    params: { project_uid: string; }
): Promise<DataResponse<APIAnswerData[]>> {
    const response = await requestFunction(
        ENDPOINT,
        'GET',
        'answers_data',
        { project_uid: params.project_uid }
    );

    if (response.success && response.data?.answer_data) {
        return { response };
    }

    return { response };
}

/**
 * Recupera la risposta (o le risposte) per un dato project_uid e question_uid.
 */
export async function getAnswerData(
    params: { project_uid: string; question_uid: string }
): Promise<DataResponse<APIAnswerData>> {
    const response = await requestFunction(
        ENDPOINT,
        'GET',
        'answer_data',
        { project_uid: params.project_uid, question_uid: params.question_uid }
    );

    let data: APIAnswerData | undefined;
    if (response.success && response.data?.answer_data) {
        const raw = response.data.answer_data as APIAnswerData;
        data = {
            project_uid: raw.project_uid,
            question_uid: raw.question_uid,
            answer_uid: raw.answer_uid
        } as APIAnswerData;
        
        return { response, data };
    }

    return { response };
}


/**
 * Inserisce o aggiorna (upsert) l'array di objective per un dato project_uid.
 */
export async function updateAnswerData(
    payload: APIAnswerData
): Promise<DataResponse<APIAnswerData>> {
    const response = await requestFunction(
        ENDPOINT,
        'PUT',
        'answer_data',
        payload
    );

    let returned: APIAnswerData | undefined;
    if (response.success && response.data?.answer_data) {
        returned = response.data.answer_data as APIAnswerData;
    }

    return { response, data: returned! };
}
