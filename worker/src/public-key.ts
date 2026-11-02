import { cose, decodeCredentialPublicKey, isoBase64URL } from '@simplewebauthn/server/helpers';

export interface PublicKeyInfo {
  kty: { id: number; name: string };
  alg: { id: number; name: string };
}

/** Name the key type and algorithm of a stored base64url COSE public key */
export function describePublicKey(publicKey: string): PublicKeyInfo {
  const decoded = decodeCredentialPublicKey(isoBase64URL.toBuffer(publicKey));
  const kty = decoded.get(cose.COSEKEYS.kty) as number;
  const alg = decoded.get(cose.COSEKEYS.alg) as number;

  return {
    kty: { id: kty, name: cose.COSEKTY[kty] ?? 'Unknown' },
    alg: { id: alg, name: cose.COSEALG[alg] ?? 'Unknown' },
  };
}
