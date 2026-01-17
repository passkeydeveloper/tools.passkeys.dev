import { decodeCBOR } from 'tiny-cbor';
import { encodeBase64Url, encodeHex } from 'tiny-encodings';

import { aaguidToString } from './aaguidToString.js';
import { coseKeyTypeToString } from './coseKeyTypeToString.js';
import { coseAlgToString } from './coseAlgToString.js';

const COSEKEYS = {
  kty: 1,
  alg: 3,
  crv: -1,
  x: -2,
  y: -3,
  // RSA
  mod: -1,
  exp: -2,
  // ML-DSA
  pub: -1
}

/**
 *
 * @param {Uint8Array} authData
 * @returns {AuthenticatorData} Parsed AuthenticatorData
 */
export function parseAuthData(authData) {
  let buffer = Uint8Array.from(authData);

  const rpIdHash = buffer.slice(0, 32);
  buffer = buffer.slice(32);

  const flagsBuf = buffer.slice(0, 1);
  buffer = buffer.slice(1);

  /** @type {number} */
  const flagsInt = flagsBuf[0];

  const flags = {
    userPresent:    !!(flagsInt & (1 << 0)), // User Presence
    userVerified:   !!(flagsInt & (1 << 2)), // User Verified
    backupEligible: !!(flagsInt & (1 << 3)), // Backup Eligibility
    backupStatus:   !!(flagsInt & (1 << 4)), // Backup State
    attestedData:   !!(flagsInt & (1 << 6)), // Attested Credential Data Present
    extensionData:  !!(flagsInt & (1 << 7)), // Extension Data Present
  };

  const counterBuf = buffer.slice(0, 4);
  buffer = buffer.slice(4);

  const counter = new DataView(counterBuf.buffer, counterBuf.byteOffset).getUint32(0, false);

  /** @type {Uint8Array?} */
  let aaguid;
  /** @type {string?} */
  let credentialID;
  /** @type {string?} */
  let credentialPublicKey;
  /** @type {ParsedCredentialPublicKey?} */
  let parsedCredentialPublicKey;

  if (flags.attestedData) {
    aaguid = buffer.slice(0, 16);
    buffer = buffer.slice(16);

    const credIDLenBuf = buffer.slice(0, 2);
    buffer = buffer.slice(2);

    const credIDLen = new DataView(credIDLenBuf.buffer, credIDLenBuf.byteOffset).getUint16(0, false);
    let credentialIDBuffer = buffer.slice(0, credIDLen);
    buffer = buffer.slice(credIDLen);

    // Base64 to Base64URL
    credentialID = encodeBase64Url(credentialIDBuffer);
    credentialPublicKey = encodeBase64Url(buffer);

    const pubKey = decodeCBOR(buffer);

    // TODO: Handle this differently if this is an RSA key
    parsedCredentialPublicKey = {
      keyType: pubKey.get(COSEKEYS.kty),
    };

    if (pubKey) {
      const kty = pubKey.get(COSEKEYS.kty);

      parsedCredentialPublicKey.keyType = coseKeyTypeToString(kty);
      parsedCredentialPublicKey.algorithm = coseAlgToString(pubKey.get(COSEKEYS.alg));

      if (kty === 3) {
        // RSA
        parsedCredentialPublicKey.modulus = encodeBase64Url(Uint8Array.from(pubKey.get(COSEKEYS.mod)));
        parsedCredentialPublicKey.exponent = parseInt(encodeHex(Uint8Array.from(pubKey.get(COSEKEYS.exp))), 16);
      } else if (kty === 7) {
        // ML-DSA
        parsedCredentialPublicKey.pub = encodeBase64Url(Uint8Array.from(pubKey.get(COSEKEYS.pub)));
      } else {
        // Everything else, including EC2 and OKP
        parsedCredentialPublicKey.curve = pubKey.get(COSEKEYS.crv);
        parsedCredentialPublicKey.x = encodeBase64Url(Uint8Array.from(pubKey.get(COSEKEYS.x)));

        // y isn't present in OKP certs
        if (pubKey.get(COSEKEYS.y)) {
          parsedCredentialPublicKey.y = encodeBase64Url(Uint8Array.from(pubKey.get(COSEKEYS.y)));
        }
      }
    }
  }

  /** @type {AuthenticatorData} */
  const toReturn = {
    rpIdHash: encodeBase64Url(rpIdHash),
    flags,
    counter,
  };

  if (aaguid) {
    toReturn.aaguid = aaguidToString(aaguid)
  }

  if (credentialID) {
    toReturn.credentialID = credentialID;
  }

  if (credentialPublicKey) {
    toReturn.credentialPublicKey = credentialPublicKey;
    toReturn.parsedCredentialPublicKey = parsedCredentialPublicKey;
  }

  return toReturn;
}

/**
 * @typedef AuthenticatorData
 * @type {object}
 * @property {string} rpIdHash
 * @property {{
 *   userPresent: boolean
 *   userVerified: boolean
 *   attestedData: boolean
 *   extensionData: boolean
 * }} flags
 * @property {number} counter
 * @property {string?} aaguid
 * @property {string?} credentialID
 * @property {string?} credentialPublicKey
 * @property {ParsedCredentialPublicKey?} parsedCredentialPublicKey
 */

/**
 * @typedef ParsedCredentialPublicKey
 * @type {object}
 * @property {string?} keyType
 * @property {string?} algorithm
 * @property {(number | string)?} curve
 * @property {string?} x
 * @property {string?} y
 * @property {string?} modulus
 * @property {number?} exponent
 * // ML-DSA
 * @property {string?}pub
 */
