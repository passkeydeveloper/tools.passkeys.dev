import type { ChallengeStore } from './challenge-store';

export interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  CHALLENGES: DurableObjectNamespace<ChallengeStore>;
  RP_ID: string;
  RP_NAME: string;
  /** Comma-separated list of origins WebAuthn responses may come from */
  EXPECTED_ORIGINS: string;
  /** Origins allowed to use the RP ID via Related Origin Requests; served at /.well-known/webauthn */
  RELATED_ORIGINS?: string;
  /** Apple Team ID and bundle ID for /.well-known/apple-app-site-association */
  AASA_APP_ID_PREFIX?: string;
  AASA_BUNDLE_ID?: string;
  /** Secret used to sign session cookies */
  SESSION_SECRET: string;
}

export interface Session {
  sid: string;
  username?: string;
}

export type AppEnv = { Bindings: Env; Variables: { session: Session } };
