CREATE TABLE credentials (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  public_key TEXT NOT NULL,
  sign_count INTEGER NOT NULL,
  is_discoverable INTEGER,
  device_type TEXT NOT NULL,
  backed_up INTEGER NOT NULL,
  transports TEXT,
  aaguid TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX credentials_username ON credentials (username);
CREATE INDEX credentials_updated_at ON credentials (updated_at);
