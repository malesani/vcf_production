// src/api_module_v1/PresetDataRequest.tsx

import { requestFunction, requestResponse } from "../hooks/RequestFunction";

/* =========================================================
   TYPES
   ========================================================= */

export interface PresetData {
  uid: string;
  user_uid: string;
  quiz_uid: string;
  quiz_version: string;
  preset_json: any;            // JSON già decodificato
  preset_json_raw?: string;    // opzionale (debug)
  created_at: string;
  updated_at: string | null;
}

/* =========================================================
   GET
   ========================================================= */

export interface GetPresetsPayload {
  quiz_version?: string; // se assente -> lista di tutti
}

export interface GetPresetsData {
  preset?: PresetData;
  presets?: PresetData[];
}

export interface GetPresetsResponse {
  response: requestResponse;
  data?: GetPresetsData;
}

/**
 * Recupera:
 * - preset singolo se quiz_version è passato
 * - lista presets se quiz_version NON è passato
 */
export async function getPresets(
  payload: GetPresetsPayload = {}
): Promise<GetPresetsResponse> {
  const response = await requestFunction(
    "/presetsData/api/presetsData.php",
    "GET",
    "get_presets",
    payload
  );

  if (response.success) {
    return {
      response,
      data: (response.data as GetPresetsData) ?? undefined,
    };
  }

  return { response };
}

/* =========================================================
   PATCH (UPDATE PARZIALE)
   ========================================================= */

/**
 * Patch supporta:
 * - merge ricorsivo
 * - delete esplicito via "__delete": ["path.to.key"]
 */
export interface PatchPresetsPayload {
  quiz_version: string;     // REQUIRED
  patch: any;               // object | array | json-string
  expected_uid?: string;    // OPTIONAL (protezione da stale data)
}

export interface PatchPresetsData {
  result?: {
    uid: string;
    user_uid: string;
    quiz_version: string;
  };
  preset?: PresetData;
}

export interface PatchPresetsResponse {
  response: requestResponse;
  data?: PatchPresetsData;
}

/**
 * Patch parziale del preset_json
 */
export async function patchPresets(
  payload: PatchPresetsPayload
): Promise<PatchPresetsResponse> {
  const response = await requestFunction(
    "/presetsData/api/presetsData.php",
    "POST",
    "patch_presets",
    payload
  );

  if (response.success) {
    return {
      response,
      data: (response.data as PatchPresetsData) ?? undefined,
    };
  }

  return { response };
}
