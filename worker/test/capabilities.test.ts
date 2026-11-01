import { SELF } from 'cloudflare:test';
import { expect, it } from 'vitest';

it('lists only algorithms the runtime supports', async () => {
  const res = await SELF.fetch('http://example.com/api/v1/capabilities');
  const { algorithms } = (await res.json()) as { algorithms: string[] };

  expect(algorithms).toEqual(expect.arrayContaining(['es256', 'rs256', 'ed25519']));
  // Workers has no ML-DSA in WebCrypto yet; this fails (and should be revisited) once it does
  expect(algorithms).not.toContain('mldsa44');
});
