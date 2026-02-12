-- Migration: Add messages table for contact/newsletter/registration form submissions
-- Serves as unified inbox for all inbound messages from the website

CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    source TEXT NOT NULL CHECK (source IN ('contact', 'newsletter', 'registration')),
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

CREATE INDEX IF NOT EXISTS idx_messages_source ON messages(source);
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON messages(is_read);
