// src/api_module_v1/QuizRequest.ts
import { requestFunction, requestResponse } from "../hooks/RequestFunction";

export type QuizAction =
  | "go_dashboard"
  | "ask_email"
  | "email_sent"
  | "stay_quiz";

export interface QuizStartPayload {
  version: string; // es "1.1"
}

export interface QuizStartData {
  quiz_uid: string;
}

export interface QuizStartResponse {
  response: requestResponse;
  data?: QuizStartData;
}

export async function startQuizDraft(
  payload: QuizStartPayload
): Promise<QuizStartResponse> {
  const response = await requestFunction(
    "/quiz/api/quiz.php",
    "POST",
    "start",
    payload
  );

  if (response.success && response.data?.quiz_uid) {
    return { response, data: { quiz_uid: response.data.quiz_uid as string } };
  }

  return { response };
}

/* -------------------- SUBMIT -------------------- */

export interface QuizSubmitPayload {
  quiz_uid: string;          // <-- OBBLIGATORIO
  version: string;           // es: "1.1"
  quiz_json: any;            // oggetto con risposte
  email?: string | null;     // solo se guest vuole collegare via mail
  finalize?: boolean;        // true SOLO al click "Conferma"
}

export interface QuizSubmitData {
  quiz_uid?: string;
  action?: QuizAction;
  note?: string;
}

export interface QuizSubmitResponse {
  response: requestResponse;
  data?: QuizSubmitData;
}

export async function submitQuiz(
  payload: QuizSubmitPayload
): Promise<QuizSubmitResponse> {
  const response = await requestFunction(
    "/quiz/api/quiz.php",
    "POST",
    "submit",
    payload
  );

  if (response.success) {
    return { response, data: (response.data as QuizSubmitData) ?? undefined };
  }

  return { response };
}
