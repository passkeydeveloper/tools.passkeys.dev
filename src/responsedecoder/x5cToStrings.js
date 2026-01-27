import { encodeBase64 } from 'tiny-encodings';

/**
 * Parse X.509 certificates into something legible
 * @param {Uint8Array<ArrayBuffer>[]} x5c
 * // Certificate[]
 * @returns {any[]}
 */
export function x5cToStrings(x5c) {
  return x5c.map(convertCertBytesToPEM);
}

/**
 * Convert buffer to an OpenSSL-compatible PEM text format.
 *
 * @param {Uint8Array<ArrayBuffer>} certBytes
 * @return {string}
 */
function convertCertBytesToPEM(certBytes) {
  /** @type {string} */
  const b64cert = encodeBase64(certBytes);

  let PEMKey = '';
  for (let i = 0; i < Math.ceil(b64cert.length / 64); i += 1) {
    const start = 64 * i;

    PEMKey += `${b64cert.substring(start, start + 64)}\n`;
  }

  PEMKey = `-----BEGIN CERTIFICATE-----\n${PEMKey}-----END CERTIFICATE-----`;

  return PEMKey;
}
