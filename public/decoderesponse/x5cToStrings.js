// import { AsnParser } from "@peculiar/asn1-schema";
// import { Certificate } from "@peculiar/asn1-x509";
import { encodeBase64Url } from 'tiny-encodings';

/**
 * Parse X.509 certificates into something legible
 * @param {Uint8Array<ArrayBuffer>[]} x5c
 * // Certificate[]
 * @returns {any[]}
 */
export function x5cToStrings(x5c) {
  // TODO: Figure out if we're going to parse certs or not
  // return x5c.map((cert) => AsnParser.parse(Buffer.from(cert), Certificate));
  return x5c.map((cert) => encodeBase64Url(cert));
}
