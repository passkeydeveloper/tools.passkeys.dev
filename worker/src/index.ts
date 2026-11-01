import { Hono } from 'hono';
import { supportedAlgorithms } from './algorithms';
import { ChallengeStore } from './challenge-store';

export { ChallengeStore };

export interface Env {
  ASSETS: Fetcher;
  CHALLENGES: DurableObjectNamespace<ChallengeStore>;
  RP_ID: string;
  RP_NAME: string;
  EXPECTED_ORIGINS: string;
}

const app = new Hono<{ Bindings: Env }>().basePath('/api/v1');

app.get('/health', (c) => c.json({ ok: true }));

app.get('/capabilities', async (c) =>
  c.json({ algorithms: await supportedAlgorithms() }),
);

export default app;
