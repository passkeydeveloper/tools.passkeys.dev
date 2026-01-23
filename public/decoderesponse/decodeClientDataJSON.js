import { decodeBase64Url } from 'tiny-encodings';

/**
 * Convert response.clientDataJSON to a dev-friendly format
 *
 * @param {string} base64urlString
 * @returns {{
 *   type: string;
 *   challenge: string;
 *   origin: string;
 *   crossOrigin?: boolean;
 *   tokenBinding?: {
 *     id?: string;
 *     status: 'present' | 'supported' | 'not-supported';
 *   };
 * }}
 */
export function decodeClientDataJSON(base64urlString) {
  const jsonBytes = decodeBase64Url(base64urlString);
  const jsonString = new TextDecoder().decode(jsonBytes);
  return JSON.parse(jsonString);
}
