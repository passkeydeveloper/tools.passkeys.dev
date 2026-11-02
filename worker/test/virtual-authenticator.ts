import { isoBase64URL, isoCBOR, isoUint8Array } from '@simplewebauthn/server/helpers';

const encoder = new TextEncoder();

function concat(...parts: Uint8Array[]): Uint8Array {
  return isoUint8Array.concat(parts);
}

/** WebCrypto emits raw r||s signatures but WebAuthn wants ASN.1 DER */
function rawToDer(raw: Uint8Array): Uint8Array {
  const encodeInt = (bytes: Uint8Array) => {
    let i = 0;
    while (i < bytes.length - 1 && bytes[i] === 0) i++;
    let int = bytes.slice(i);
    if (int[0] & 0x80) int = concat(new Uint8Array([0]), int);
    return concat(new Uint8Array([0x02, int.length]), int);
  };
  const body = concat(encodeInt(raw.slice(0, 32)), encodeInt(raw.slice(32)));
  return concat(new Uint8Array([0x30, body.length]), body);
}

async function sha256(data: Uint8Array): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', data as BufferSource));
}

/** A software ES256 authenticator that produces the JSON a browser would send back */
export class VirtualAuthenticator {
  readonly credentialId = crypto.getRandomValues(new Uint8Array(32));
  counter = 0;
  #keyPair!: CryptoKeyPair;

  constructor(
    private rpId = 'example.com',
    private origin = 'https://example.com',
  ) {}

  async register(options: { challenge: string }, { uv = false, rk = true, synced = false } = {}) {
    this.#keyPair = (await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
      'sign',
      'verify',
    ])) as CryptoKeyPair;
    const jwk = (await crypto.subtle.exportKey('jwk', this.#keyPair.publicKey)) as JsonWebKey;

    const cosePublicKey = isoCBOR.encode(
      new Map<number, number | Uint8Array>([
        [1, 2],
        [3, -7],
        [-1, 1],
        [-2, isoBase64URL.toBuffer(jwk.x!)],
        [-3, isoBase64URL.toBuffer(jwk.y!)],
      ]),
    );

    const credIdLength = new Uint8Array([0, this.credentialId.length]);
    const authData = concat(
      await sha256(encoder.encode(this.rpId)),
      new Uint8Array([0x41 | (uv ? 0x04 : 0) | (synced ? 0x18 : 0)]),
      new Uint8Array(4),
      new Uint8Array(16),
      credIdLength,
      this.credentialId,
      cosePublicKey,
    );

    const attestationObject = isoCBOR.encode(
      new Map<string, unknown>([
        ['fmt', 'none'],
        ['attStmt', new Map()],
        ['authData', authData],
      ]),
    );

    const id = isoBase64URL.fromBuffer(this.credentialId);
    return {
      id,
      rawId: id,
      type: 'public-key',
      response: {
        clientDataJSON: this.#clientData('webauthn.create', options.challenge),
        attestationObject: isoBase64URL.fromBuffer(attestationObject),
        transports: ['internal'],
      },
      clientExtensionResults: { credProps: { rk } },
    };
  }

  async authenticate(options: { challenge: string }, { uv = false } = {}) {
    this.counter++;
    const clientData = this.#clientData('webauthn.get', options.challenge);

    const authData = concat(
      await sha256(encoder.encode(this.rpId)),
      new Uint8Array([0x01 | (uv ? 0x04 : 0)]),
      new Uint8Array([0, 0, 0, this.counter]),
    );
    const signedData = concat(authData, await sha256(isoBase64URL.toBuffer(clientData)));
    const signature = new Uint8Array(
      await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, this.#keyPair.privateKey, signedData as BufferSource),
    );

    const id = isoBase64URL.fromBuffer(this.credentialId);
    return {
      id,
      rawId: id,
      type: 'public-key',
      response: {
        clientDataJSON: clientData,
        authenticatorData: isoBase64URL.fromBuffer(authData),
        signature: isoBase64URL.fromBuffer(rawToDer(signature)),
      },
      clientExtensionResults: {},
    };
  }

  #clientData(type: string, challenge: string): string {
    return isoBase64URL.fromUTF8String(
      JSON.stringify({ type, challenge, origin: this.origin, crossOrigin: false }),
    );
  }
}
