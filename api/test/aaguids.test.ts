import { expect, it } from 'vitest';
import { getProviderName } from '../src/aaguids';

it('looks up known AAGUIDs, preferring the later (Yubico) override', () => {
  expect(getProviderName('c5ef55ff-ad9a-4b9f-b580-adebafe026d0', 'singleDevice')).toBe('YubiKey 5Ci (5.2, 5.4)');
});

it('returns null for unknown AAGUIDs', () => {
  expect(getProviderName('11111111-1111-1111-1111-111111111111', 'multiDevice')).toBeNull();
  expect(getProviderName('00000000-0000-0000-0000-000000000000', 'singleDevice')).toBeNull();
});
