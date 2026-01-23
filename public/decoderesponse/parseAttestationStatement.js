import { decodeBase64Url, encodeBase64Url } from 'tiny-encodings';

import { coseAlgToString } from './coseAlgToString.js';
import { x5cToStrings } from './x5cToStrings.js';

/**
 * Break down attestation statement properties
 *
 * @param {{
 *   fmt: "fido-u2f" | "packed" | "android-safetynet" | "android-key" | "tpm" | "none";
 *   attStmt: {
 *     sig?: Uint8Array<ArrayBuffer>;
 *     alg?: number;
 *     x5c?: Uint8Array<ArrayBuffer>[];
 *     response?: Uint8Array<ArrayBuffer>;
 *     ver?: string;
 *     certInfo?: Uint8Array<ArrayBuffer>;
 *     pubArea?: Uint8Array<ArrayBuffer>;
 *   };
 *   authData: ArrayBuffer;
 * }} statement Output from `decodeAttestationObject()`
 * @returns {ParsedAttestationStatement} A human-readable representation of values within the parsed attestation statement
 */
export function parseAttestationStatement(statement) {
  const toReturn = {};

  // Packed, TPM, AndroidKey
  if (statement.alg) {
    toReturn.alg = coseAlgToString(statement.alg);
  }

  // Packed, TPM, AndroidKey, FIDO-U2F
  if (statement.sig) {
    toReturn.sig = encodeBase64Url(Uint8Array.from(statement.sig));
  }

  // Packed, TPM, AndroidKey, FIDO-U2F
  if (statement.x5c) {
    toReturn.x5c = x5cToStrings(statement.x5c);
  }

  // Android SafetyNet
  if (statement.response) {
    const jwt = statement.response.toString('utf8');
    const jwtParts = jwt.split('.');

    /**
     * SafetyNetJWTHeader
     * @type {{
     *   alg: string;
     *   x5c: string[];
     * }}
     */
    const header = JSON.parse(decode(jwtParts[0]));
    /**
     * SafetyNetJWTPayload
     * @type {{
     *   nonce: string;
     *   timestampMs: number;
     *   apkPackageName: string;
     *   apkDigestSha256: string;
     *   ctsProfileMatch: boolean;
     *   apkCertificateDigestSha256: string[];
     *   basicIntegrity: boolean;
     * }}
     */
    const payload = JSON.parse(decode(jwtParts[1]));
    /**
     * SafetyNetJWTSignature
     * @type {string}
     */
    const signature = jwtParts[2];

    const certBuffers = header.x5c.map((cert) => decodeBase64Url(cert));
    const headerX5C = x5cToStrings(certBuffers);

    toReturn.response = {
      header: {
        ...header,
        x5c: headerX5C,
      },
      payload,
      signature,
    };
  }

  // TPM, Android SafetyNet
  if (statement.ver) {
    toReturn.ver = statement.ver;
  }

  // TPM
  if (statement.certInfo) {
    // TODO: Parse this TPM data structure
    toReturn.certInfo = encodeBase64Url(Uint8Array.from(statement.certInfo));
  }

  // TPM
  if (statement.pubArea) {
    // TODO: Parse this TPM data structure
    toReturn.pubArea = encodeBase64Url(Uint8Array.from(statement.pubArea));
  }

  return toReturn;
}

/**
 * @typedef ParsedAttestationStatement
 * @type {object}
 * @property {string?} alg
 * @property {string?} sig
 * @property {string?} ver
 * // Certificate[]
 * @property {any[]} x5c
 * @property {{
 *   header: SafetyNetJWTHeader
 *   payload: SafetyNetJWTPayload
 *   signature: SafetyNetJWTSignature
 * }?} response
 * @property {string?} certInfo
 * @property {string?} pubArea
 */

/**
 * @typedef SafetyNetJWTHeader
 * @type {object}
 * @property {string} alg
 * @property {string[]} x5c
 */

/**
 * @typedef SafetyNetJWTPayload
 * @type {object}
 * @property {string} nonce
 * @property {number} timestampMs
 * @property {string} apkPackageName
 * @property {string} apkDigestSha256
 * @property {boolean} ctsProfileMatch
 * @property {string[]} apkCertificateDigestSha256
 * @property {boolean} basicIntegrity
 */

/**
 * @typedef SafetyNetJWTSignature
 * @type {string}
 */
