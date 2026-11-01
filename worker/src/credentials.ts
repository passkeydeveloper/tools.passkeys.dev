export interface StoredCredential {
  id: string;
  username: string;
  publicKey: string;
  signCount: number;
  isDiscoverable: boolean | null;
  deviceType: 'singleDevice' | 'multiDevice';
  backedUp: boolean;
  transports: string[] | null;
  aaguid: string;
}

interface Row {
  id: string;
  username: string;
  public_key: string;
  sign_count: number;
  is_discoverable: number | null;
  device_type: 'singleDevice' | 'multiDevice';
  backed_up: number;
  transports: string | null;
  aaguid: string;
}

function fromRow(row: Row): StoredCredential {
  return {
    id: row.id,
    username: row.username,
    publicKey: row.public_key,
    signCount: row.sign_count,
    isDiscoverable: row.is_discoverable === null ? null : row.is_discoverable === 1,
    deviceType: row.device_type,
    backedUp: row.backed_up === 1,
    transports: row.transports ? JSON.parse(row.transports) : null,
    aaguid: row.aaguid,
  };
}

export async function storeCredential(db: D1Database, cred: StoredCredential): Promise<void> {
  const now = Date.now();
  await db
    .prepare(
      `INSERT INTO credentials (id, username, public_key, sign_count, is_discoverable, device_type,
         backed_up, transports, aaguid, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      cred.id,
      cred.username,
      cred.publicKey,
      cred.signCount,
      cred.isDiscoverable === null ? null : Number(cred.isDiscoverable),
      cred.deviceType,
      Number(cred.backedUp),
      cred.transports ? JSON.stringify(cred.transports) : null,
      cred.aaguid,
      now,
      now,
    )
    .run();
}

export async function getCredentialById(db: D1Database, id: string): Promise<StoredCredential | null> {
  const row = await db.prepare('SELECT * FROM credentials WHERE id = ?').bind(id).first<Row>();
  return row ? fromRow(row) : null;
}

export async function getCredentialsByUsername(db: D1Database, username: string): Promise<StoredCredential[]> {
  const { results } = await db
    .prepare('SELECT * FROM credentials WHERE username = ? ORDER BY created_at')
    .bind(username)
    .all<Row>();
  return results.map(fromRow);
}

export async function updateSignCount(db: D1Database, id: string, signCount: number): Promise<void> {
  await db
    .prepare('UPDATE credentials SET sign_count = ?, updated_at = ? WHERE id = ?')
    .bind(signCount, Date.now(), id)
    .run();
}

export async function deleteCredential(db: D1Database, id: string, username: string): Promise<boolean> {
  const result = await db
    .prepare('DELETE FROM credentials WHERE id = ? AND username = ?')
    .bind(id, username)
    .run();
  return result.meta.changes > 0;
}

/** Credentials are only kept around for a day, same as the Redis TTL on webauthn.io */
export async function deleteExpiredCredentials(db: D1Database, olderThanMs: number): Promise<void> {
  await db.prepare('DELETE FROM credentials WHERE updated_at < ?').bind(Date.now() - olderThanMs).run();
}
