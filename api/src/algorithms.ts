import { COSEALG } from '@simplewebauthn/server/helpers';

export const ALGORITHMS = ['es256', 'rs256', 'ed25519', 'mldsa44', 'mldsa65', 'mldsa87'] as const;
export type Algorithm = (typeof ALGORITHMS)[number];

export const COSE_ALG_IDS: Record<Algorithm, number> = {
  es256: COSEALG.ES256,
  rs256: COSEALG.RS256,
  ed25519: COSEALG.EdDSA,
  mldsa44: COSEALG.ML_DSA_44,
  mldsa65: COSEALG.ML_DSA_65,
  mldsa87: COSEALG.ML_DSA_87,
};

// How each algorithm is probed against this runtime's WebCrypto implementation
const WEBCRYPTO_NAMES: Record<Algorithm, Record<string, unknown>> = {
  es256: { name: 'ECDSA', namedCurve: 'P-256' },
  rs256: {
    name: 'RSASSA-PKCS1-v1_5',
    modulusLength: 2048,
    publicExponent: new Uint8Array([1, 0, 1]),
    hash: 'SHA-256',
  },
  ed25519: { name: 'Ed25519' },
  mldsa44: { name: 'ML-DSA-44' },
  mldsa65: { name: 'ML-DSA-65' },
  mldsa87: { name: 'ML-DSA-87' },
};

let cached: Promise<Algorithm[]> | undefined;

/**
 * Algorithms this runtime can actually verify. Probed once per isolate, so ML-DSA appears
 * automatically when Workers adds WebCrypto support for it.
 */
export function supportedAlgorithms(): Promise<Algorithm[]> {
  cached ??= (async () => {
    const supported: Algorithm[] = [];
    for (const alg of ALGORITHMS) {
      try {
        await crypto.subtle.generateKey(WEBCRYPTO_NAMES[alg] as never, false, ['sign', 'verify']);
        supported.push(alg);
      } catch {
        // Not supported by this runtime
      }
    }
    return supported;
  })();
  return cached;
}
