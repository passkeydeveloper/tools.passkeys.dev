import { DurableObject } from 'cloudflare:workers';

/**
 * Single-use challenge storage. One object instance per key (username for registration,
 * session ID for authentication), so `take` is atomic and a challenge can never be replayed.
 */
export class ChallengeStore extends DurableObject {
  async put(options: unknown, ttlMs: number): Promise<void> {
    await this.ctx.storage.put('options', options);
    await this.ctx.storage.setAlarm(Date.now() + ttlMs);
  }

  async take(): Promise<unknown> {
    const options = await this.ctx.storage.get('options');
    await this.ctx.storage.deleteAll();
    await this.ctx.storage.deleteAlarm();
    return options;
  }

  async alarm(): Promise<void> {
    await this.ctx.storage.deleteAll();
  }
}
