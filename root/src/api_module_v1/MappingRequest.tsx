import { requestFunction, requestResponse } from '../hooks/RequestFunction';
 
/**
 * Mapping of numeric values to labels (e.g. status, type) fetched from util_map.
 */
export interface MappingResponse {
  response: requestResponse;
  data?: {
    map: Record<number, string>;
  };
}
 
/**
 * Recupera la mappatura value => label per un dato type e key.
 * @param mapType  Nome della categoria (es. 'contracts', 'procedures')
 * @param mapKey   Chiave di mapping (es. 'status', 'type')
 */
export async function getMapping(
  mapType: string,
  mapKey: string
): Promise<MappingResponse> {
  const response = await requestFunction(
    '/utils/api/mapping.php',
    'GET',
    '',
    { type: mapType, key: mapKey }
  );
 
  if (response.success && response.data?.map) {
    return {
      response,
      data: { map: response.data.map as Record<number, string> }
    };
  }
 
  return { response };
}