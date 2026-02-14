CREATE TABLE messages_new (
    id TEXT PRIMARY KEY,
    source TEXT NOT NULL CHECK (source IN ('contact', 'newsletter', 'registration', 'sms')),
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'read', 'replied', 'archived')),
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    phone TEXT,
    postal_code TEXT,
    reason TEXT,
    subject TEXT,
    body TEXT,
    metadata TEXT,
    is_read INTEGER NOT NULL DEFAULT 0,
    read_at TEXT,
    replied_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO messages_new (
  id, source, status, first_name, last_name, email, phone, postal_code, reason, subject, body, metadata, is_read, read_at, replied_at, created_at, updated_at
)
SELECT
  id, source, status, first_name, last_name, email, phone, postal_code, reason, subject, body, metadata, is_read, read_at, replied_at, created_at, updated_at
FROM messages;

DROP TABLE messages;
ALTER TABLE messages_new RENAME TO messages;

CREATE INDEX IF NOT EXISTS idx_messages_source ON messages(source);
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON messages(is_read);
