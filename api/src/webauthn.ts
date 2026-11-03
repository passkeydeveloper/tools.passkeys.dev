import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';
import { COSEALG, isoBase64URL } from '@simplewebauthn/server/helpers';
import type {
  AuthenticationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
} from '@simplewebauthn/server';
import { COSE_ALG_IDS, supportedAlgorithms } from './algorithms';
import type { StoredCredential } from './credentials';
import type { Env } from './env';
import type { AuthenticationOptionsRequest, RegistrationOptionsRequest } from './schemas';

/** Spec default when `pubKeyCredParams` is empty: browsers fall back to ES256 and RS256 */
const EMPTY_ALGORITHMS_FALLBACK = [COSEALG.ES256, COSEALG.RS256];

const TIMEOUT_MS = 60_000;

/** Challenges outlive the ceremony timeout by 2x, same as webauthn.io */
export const CHALLENGE_TTL_MS = TIMEOUT_MS * 2;

export class UnsupportedAlgorithmError extends Error {}

export function parseOrigins(value: string | undefined): string[] {
  return (value ?? '').split(',').map((origin) => origin.trim()).filter(Boolean);
}

export function expectedOrigins(env: Env): string[] {
  return parseOrigins(env.EXPECTED_ORIGINS);
}

export interface StoredRegistrationOptions {
  challenge: string;
  requireUserVerification: boolean;
  algorithmIDs: number[];
  residentKey: string | undefined;
}

export async function buildRegistrationOptions(
  env: Env,
  req: RegistrationOptionsRequest,
  existing: StoredCredential[],
): Promise<{ options: PublicKeyCredentialCreationOptionsJSON; stored: StoredRegistrationOptions }> {
  const supported = await supportedAlgorithms();
  const unsupported = req.algorithms.filter((alg) => !supported.includes(alg));
  if (unsupported.length > 0) {
    throw new UnsupportedAlgorithmError(`Unsupported algorithms: ${unsupported.join(', ')}`);
  }

  // `undefined` would make the library offer its default algorithms; webauthn.io deliberately
  // sends an empty list so the browser's own defaults can be tested
  const algorithmIDs = req.algorithms.map((alg) => COSE_ALG_IDS[alg]);

  const options = await generateRegistrationOptions({
    rpID: env.RP_ID,
    rpName: env.RP_NAME,
    userName: req.username,
    userID: new Uint8Array(new TextEncoder().encode(`passkeysdev-${req.username}`)),
    timeout: TIMEOUT_MS,
    attestationType: req.attestation,
    authenticatorSelection: {
      userVerification: req.userVerification,
      residentKey: req.discoverableCredential,
      ...(req.attachment !== 'all' && {
        authenticatorAttachment: req.attachment === 'platform' ? 'platform' : 'cross-platform',
      }),
    },
    supportedAlgorithmIDs: algorithmIDs,
    excludeCredentials: existing.map((cred) => ({
      id: cred.id,
      transports: cred.transports ?? undefined,
    })),
    extensions: { credProps: true },
  });

  if (req.hints.length > 0) {
    options.hints = req.hints;
  }

  return {
    options,
    stored: {
      challenge: options.challenge,
      requireUserVerification: req.userVerification === 'required',
      algorithmIDs: algorithmIDs.length > 0 ? algorithmIDs : EMPTY_ALGORITHMS_FALLBACK,
      residentKey: options.authenticatorSelection?.residentKey,
    },
  };
}

export async function verifyRegistration(
  env: Env,
  response: RegistrationResponseJSON,
  username: string,
  stored: StoredRegistrationOptions,
): Promise<StoredCredential> {
  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge: stored.challenge,
    expectedOrigin: expectedOrigins(env),
    expectedRPID: env.RP_ID,
    requireUserVerification: stored.requireUserVerification,
    supportedAlgorithmIDs: stored.algorithmIDs,
  });

  if (!verification.verified) {
    throw new Error('Registration could not be verified');
  }

  const { credential, aaguid, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;

  // credProps.rk is the most definitive signal; otherwise infer from what was required
  let isDiscoverable: boolean | null = null;
  const rk = response.clientExtensionResults?.credProps?.rk;
  if (typeof rk === 'boolean') {
    isDiscoverable = rk;
  } else if (stored.residentKey === 'required') {
    isDiscoverable = true;
  }

  return {
    id: credential.id,
    username,
    publicKey: isoBase64URL.fromBuffer(credential.publicKey),
    signCount: credential.counter,
    isDiscoverable,
    deviceType: credentialDeviceType,
    backedUp: credentialBackedUp,
    transports: response.response.transports ?? credential.transports ?? null,
    aaguid,
  };
}

export interface StoredAuthenticationOptions {
  challenge: string;
  requireUserVerification: boolean;
}

export async function buildAuthenticationOptions(
  env: Env,
  req: AuthenticationOptionsRequest,
  existing: StoredCredential[],
): Promise<{ options: PublicKeyCredentialRequestOptionsJSON; stored: StoredAuthenticationOptions }> {
  const options = await generateAuthenticationOptions({
    rpID: env.RP_ID,
    timeout: TIMEOUT_MS,
    userVerification: req.userVerification,
    allowCredentials: existing.slice(-64).map((cred) => ({
      id: cred.id,
      transports: cred.transports ?? undefined,
    })),
  });

  if (req.hints.length > 0) {
    options.hints = req.hints;
  }

  return {
    options,
    stored: {
      challenge: options.challenge,
      requireUserVerification: req.userVerification === 'required',
    },
  };
}

export async function verifyAuthentication(
  env: Env,
  response: AuthenticationResponseJSON,
  credential: StoredCredential,
  stored: StoredAuthenticationOptions,
): Promise<number> {
  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge: stored.challenge,
    expectedOrigin: expectedOrigins(env),
    expectedRPID: env.RP_ID,
    requireUserVerification: stored.requireUserVerification,
    credential: {
      id: credential.id,
      publicKey: isoBase64URL.toBuffer(credential.publicKey),
      counter: credential.signCount,
      transports: credential.transports ?? undefined,
    },
  });

  if (!verification.verified) {
    throw new Error('Authentication could not be verified');
  }

  return verification.authenticationInfo.newCounter;
}
