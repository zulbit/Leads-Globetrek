-- D1 Database Schema for Leads Globetrek (SQLite camelCase)
CREATE TABLE IF NOT EXISTS leads (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    contactPerson TEXT,
    phone TEXT NOT NULL,
    whatsapp TEXT,
    email TEXT,
    website TEXT,
    websiteStatus TEXT,
    address TEXT,
    city TEXT NOT NULL,
    country TEXT DEFAULT 'Pakistan',
    category TEXT,
    rating REAL,
    reviewsCount INTEGER,
    source TEXT NOT NULL,
    projectTag TEXT NOT NULL,
    outreachStatus TEXT DEFAULT 'New',
    apifyRunId TEXT,
    createdAt TEXT DEFAULT (datetime('now')),
    lastContactedAt TEXT,
    followUpDate TEXT,
    followUpNotes TEXT,
    groupTag TEXT,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    projectTag TEXT NOT NULL,
    category TEXT,
    targetCity TEXT,
    status TEXT DEFAULT 'Pending',
    autoOutreach INTEGER DEFAULT 1,
    createdDate TEXT DEFAULT (datetime('now')),
    completedDate TEXT
);

CREATE TABLE IF NOT EXISTS whatsapp_logs (
    id TEXT PRIMARY KEY,
    leadId TEXT REFERENCES leads(id) ON DELETE CASCADE,
    phone TEXT NOT NULL,
    message TEXT NOT NULL,
    serverResponse TEXT,
    sentAt TEXT DEFAULT (datetime('now'))
);
