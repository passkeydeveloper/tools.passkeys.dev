import type { ChallengeStore } from './challenge-store';

export interface Env {
  DB: D1Database;
  CHALLENGES: DurableObjectNamespace<ChallengeStore>;
  RP_ID: string;
  RP_NAME: string;
  /** Comma-separated list of origins WebAuthn responses may come from */
  EXPECTED_ORIGINS: string;
  /** Secret used to sign session cookies */
  SESSION_SECRET: string;
}

export interface Session {
  sid: string;
  username?: string;
}

export type AppEnv = { Bindings: Env; Variables: { session: Session } };
