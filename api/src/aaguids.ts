import aaguidNames from './aaguids.json';

const ZERO_AAGUID = '00000000-0000-0000-0000-000000000000';

/**
 * Map an AAGUID to a human-friendly provider name, or `null` when it can't be determined.
 * The data in `aaguids.json` was ingested from webauthn.io and is a stopgap until a better source
 * replaces it.
 */
export function getProviderName(aaguid: string, deviceType: 'singleDevice' | 'multiDevice'): string | null {
  const name = (aaguidNames as Record<string, string>)[aaguid];
  if (name) return name;

  // Apple's synced passkeys report an all-zero AAGUID
  if (aaguid === ZERO_AAGUID && deviceType === 'multiDevice') return 'iCloud Keychain';

  return null;
}
