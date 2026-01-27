import { decodeCBOR } from 'tiny-cbor';
import { decodeBase64Url } from 'tiny-encodings';

/**
 * Convert response.attestationObject to a dev-friendly format
 *
 * @param {string} base64urlString
 * @returns {{
 *   fmt: "fido-u2f" | "packed" | "android-safetynet" | "android-key" | "tpm" | "none";
 *   attStmt: AttestationStatement;
 *   authData: ArrayBuffer;
 * }}
 */
export function decodeAttestationObject(base64urlString) {
  const attestationObjectBytes = decodeBase64Url(base64urlString);
  const decodedMap = decodeCBOR(attestationObjectBytes);
  const attStmtMap = decodedMap.get('attStmt');

  return {
    fmt: decodedMap.get('fmt'),
    attStmt: {
      sig: attStmtMap.get('sig'),
      alg: attStmtMap.get('alg'),
      x5c: attStmtMap.get('x5c'),
      response: attStmtMap.get('response'),
      ver: attStmtMap.get('ver'),
      certInfo: attStmtMap.get('certInfo'),
      pubArea: attStmtMap.get('pubArea'),
    },
    authData: decodedMap.get('authData'),
  };
}

/**
 * @typedef AttestationStatement
 * @type {object}
 * @property {Uint8Array<ArrayBuffer>?} sig
 * @property {number?} alg
 * @property {Uint8Array<ArrayBuffer>[]?} x5c
 * @property {Uint8Array<ArrayBuffer>?} response
 * @property {string?} ver
 * @property {Uint8Array<ArrayBuffer>?} certInfo
 * @property {Uint8Array<ArrayBuffer>?} pubArea
 */
