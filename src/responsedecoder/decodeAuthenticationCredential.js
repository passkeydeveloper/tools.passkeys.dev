import { decodeBase64Url } from 'tiny-encodings';
import { decodeClientDataJSON } from './decodeClientDataJSON.js';
import { parseAuthData } from './parseAuthData.js';

/**
 * Take a WebAuthn authentication response and turn it into a human-readable representation
 *
 * @param {object} credential JSON-ified output from `navigator.credentials.get()`, using Base64URL encoding for Uint8Array/ArrayBuffer values
 * @returns {object} Decoded authentication response
 */
export function decodeAuthenticationCredential(credential) {
  const { response } = credential;

  if (
    !response.clientDataJSON ||
    !response.authenticatorData ||
    !response.signature
  ) {
    throw new Error(
      'The "clientDataJSON", "attestationObject", and/or "signature" properties are missing from "response"',
    );
  }

  const clientDataJSON = decodeClientDataJSON(response.clientDataJSON);
  const authenticatorData = parseAuthData(
    decodeBase64Url(response.authenticatorData),
  );

  return {
    ...credential,
    response: {
      ...credential.response,
      authenticatorData,
      clientDataJSON,
    },
  };
}
