/**
 * Convert a Base64-formatted string to Base64URL
 * @param {string} input
 * @returns string
 */
export function base64ToBase64URL(input) {
  return input
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}
