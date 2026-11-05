export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

/**
 * The parts of the webauthnapi-passkeys-dev Worker's RPC surface used here. Request inputs are
 * passed through from the browser and validated by that Worker, so they're left loosely typed.
 */
export interface WebAuthnApi {
  getRuntimeCapabilities(): Promise<{ algorithms: string[] }>;
  createRegistrationOptions(input: Record<string, unknown>): Promise<Result<unknown>>;
  verifyRegistrationResponse(input: Record<string, unknown>): Promise<Result<{ credentialId: string }>>;
  createAuthenticationOptions(input: Record<string, unknown>): Promise<Result<unknown>>;
  verifyAuthenticationResponse(
    input: Record<string, unknown>,
  ): Promise<Result<{ username: string; credentialId: string }>>;
  getCredentials(input: { rpId: string; username: string }): Promise<Result<unknown[]>>;
  deleteCredential(input: { rpId: string; username: string; id: string }): Promise<Result<{ deleted: true }>>;
}

export interface Env {
  WEBAUTHN: Fetcher & WebAuthnApi;
  RP_ID: string;
  RP_NAME: string;
  /** Comma-separated origins WebAuthn responses may come from; also allowed to call the API cross-origin */
  EXPECTED_ORIGINS: string;
  /** Secret used to sign session cookies */
  SESSION_SECRET: string;
}
