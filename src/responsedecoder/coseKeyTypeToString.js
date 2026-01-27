/**
 * Convert a COSE public key's key type and convert it to a human value
 *
 * See https://www.iana.org/assignments/cose/cose.xhtml#key-type
 *
 * @param {number} kty A numeric COSE key type ID
 * @returns {string}
 */
export function coseKeyTypeToString(kty) {
  let keyType = `Unknown`;

  if (kty === 1) {
    keyType = 'OKP';
  } else if (kty === 2) {
    keyType = 'EC2';
  } else if (kty === 3) {
    keyType = 'RSA';
  } else if (kty === 4) {
    keyType = 'Symmetric';
  } else if (kty === 5) {
    keyType = 'HSS-LMS';
  } else if (kty === 7) {
    keyType = 'AKP';
  }

  return `${keyType} (${kty})`;
}
