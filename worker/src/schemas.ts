import { z } from 'zod';
import { ALGORITHMS } from './algorithms';

const userVerification = z.enum(['discouraged', 'preferred', 'required']);
const hints = z.array(z.enum(['security-key', 'client-device', 'hybrid'])).default([]);
const username = z.string().min(1).max(64);

export const registrationOptionsRequest = z.object({
  username,
  userVerification: userVerification,
  attestation: z.enum(['none', 'direct']),
  attachment: z.enum(['all', 'cross_platform', 'platform']),
  algorithms: z.array(z.enum(ALGORITHMS)).default([]),
  discoverableCredential: userVerification,
  hints,
});

export const registrationVerificationRequest = z.object({
  username,
  response: z.looseObject({ id: z.string() }),
});

export const authenticationOptionsRequest = z.object({
  username: username.optional(),
  userVerification: userVerification,
  hints,
});

export const authenticationVerificationRequest = z.object({
  username: username.optional(),
  response: z.looseObject({ id: z.string() }),
});

export type RegistrationOptionsRequest = z.infer<typeof registrationOptionsRequest>;
export type AuthenticationOptionsRequest = z.infer<typeof authenticationOptionsRequest>;
