import { decodeClientDataJSON } from './decodeClientDataJSON.js';
import { decodeAttestationObject } from './decodeAttestationObject.js';
import { parseAuthData } from './parseAuthData.js';
import { parseAttestationStatement } from './parseAttestationStatement.js';

/**
 * Take a WebAuthn registration response and turn it into a human-readable representation
 *
 * @param {object} credential JSON-ified output from `navigator.credentials.create()`, using Base64URL encoding for Uint8Array/ArrayBuffer values
 * @returns {object} Decoded registration response
 */
export function decodeRegistrationCredential(credential) {
  const { response } = credential;

  if (!response.clientDataJSON || !response.attestationObject) {
    throw new Error(
      'The "clientDataJSON" and/or "attestationObject" properties are missing from "response"',
    );
  }

  const clientDataJSON = decodeClientDataJSON(response.clientDataJSON);
  const attestationObject = decodeAttestationObject(response.attestationObject);

  const authData = parseAuthData(attestationObject.authData);
  const attStmt = parseAttestationStatement(attestationObject.attStmt);

  return {
    ...credential,
    response: {
      ...response,
      clientDataJSON,
      attestationObject: {
        ...attestationObject,
        attStmt,
        authData,
      },
    },
  };
}
