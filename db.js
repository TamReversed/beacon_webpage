const Database = require('better-sqlite3');
const path = require('path');
const util = require('util');
const Store = require('express-session').Store;

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'beacon.db');
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    expires INTEGER NOT NULL,
    data TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires);

  CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    file_name TEXT NOT NULL,
    original_name TEXT NOT NULL,
    mime_type TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS ideas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    admin_notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_ideas_user_id ON ideas(user_id);
  CREATE INDEX IF NOT EXISTS idx_ideas_status ON ideas(status);
`);

// Add role/plan columns if missing (e.g. existing DBs)
try {
  db.exec(`ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'`);
} catch (e) {}
try {
  db.exec(`ALTER TABLE users ADD COLUMN plan TEXT DEFAULT 'free'`);
} catch (e) {}

function createUser(email, passwordHash, name) {
  const stmt = db.prepare(
    'INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)'
  );
  const result = stmt.run(email, passwordHash, name);
  return result.lastInsertRowid;
}

function getUserByEmail(email) {
  const stmt = db.prepare('SELECT id, email, password_hash, name, created_at FROM users WHERE email = ?');
  return stmt.get(email);
}

function getUserById(id) {
  const stmt = db.prepare('SELECT id, email, name, created_at, role, plan FROM users WHERE id = ?');
  return stmt.get(id);
}

function promoteUser(email, role = 'admin', plan = 'pro') {
  const stmt = db.prepare('UPDATE users SET role = ?, plan = ? WHERE LOWER(TRIM(email)) = ?');
  const result = stmt.run(role, plan, String(email).trim().toLowerCase());
  return result.changes > 0;
}

function listUsers() {
  const stmt = db.prepare('SELECT id, email, name, role, plan, created_at FROM users ORDER BY created_at DESC');
  return stmt.all();
}

function updateUserRolePlan(id, role, plan) {
  const stmt = db.prepare('UPDATE users SET role = ?, plan = ? WHERE id = ?');
  const result = stmt.run(role || 'user', plan || 'free', id);
  return result.changes > 0;
}

// Documents
function listDocuments() {
  const stmt = db.prepare(
    'SELECT id, title, description, file_name, original_name, mime_type, created_at, updated_at FROM documents ORDER BY created_at DESC'
  );
  return stmt.all();
}

function getDocumentById(id) {
  const stmt = db.prepare(
    'SELECT id, title, description, file_name, original_name, mime_type, created_at, updated_at FROM documents WHERE id = ?'
  );
  return stmt.get(id);
}

function createDocument(title, description, file_name, original_name, mime_type) {
  const stmt = db.prepare(
    'INSERT INTO documents (title, description, file_name, original_name, mime_type) VALUES (?, ?, ?, ?, ?)'
  );
  const result = stmt.run(
    title || '',
    description || null,
    file_name,
    original_name || file_name,
    mime_type || null
  );
  return result.lastInsertRowid;
}

function updateDocument(id, fields) {
  const doc = getDocumentById(id);
  if (!doc) return false;
  const title = fields.title !== undefined ? fields.title : doc.title;
  const description = fields.description !== undefined ? fields.description : doc.description;
  const stmt = db.prepare(
    'UPDATE documents SET title = ?, description = ?, updated_at = datetime(\'now\') WHERE id = ?'
  );
  const result = stmt.run(title, description, id);
  return result.changes > 0;
}

function deleteDocument(id) {
  const stmt = db.prepare('DELETE FROM documents WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

// Ideas
function listIdeas(options = {}) {
  const { userId, status, adminView } = options;
  let query = `
    SELECT i.id, i.user_id, i.title, i.description, i.status, i.admin_notes, i.created_at, i.updated_at,
           u.email AS user_email, u.name AS user_name
    FROM ideas i
    LEFT JOIN users u ON u.id = i.user_id
  `;
  const conditions = [];
  const params = [];
  if (!adminView && userId != null) {
    conditions.push('i.user_id = ?');
    params.push(userId);
  }
  if (status) {
    conditions.push('i.status = ?');
    params.push(status);
  }
  if (conditions.length) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  query += ' ORDER BY i.created_at DESC';
  const stmt = db.prepare(query);
  return stmt.all(...params);
}

function getIdeaById(id) {
  const stmt = db.prepare(`
    SELECT i.id, i.user_id, i.title, i.description, i.status, i.admin_notes, i.created_at, i.updated_at,
           u.email AS user_email, u.name AS user_name
    FROM ideas i
    LEFT JOIN users u ON u.id = i.user_id
    WHERE i.id = ?
  `);
  return stmt.get(id);
}

function createIdea(userId, title, description) {
  const stmt = db.prepare(
    'INSERT INTO ideas (user_id, title, description, status) VALUES (?, ?, ?, \'pending\')'
  );
  const result = stmt.run(userId, title || '', description || null);
  return result.lastInsertRowid;
}

function updateIdea(id, fields) {
  const idea = getIdeaById(id);
  if (!idea) return false;
  const status = fields.status !== undefined ? fields.status : idea.status;
  const admin_notes = fields.admin_notes !== undefined ? fields.admin_notes : idea.admin_notes;
  const stmt = db.prepare(
    'UPDATE ideas SET status = ?, admin_notes = ?, updated_at = datetime(\'now\') WHERE id = ?'
  );
  const result = stmt.run(status, admin_notes, id);
  return result.changes > 0;
}

function deleteIdea(id) {
  const stmt = db.prepare('DELETE FROM ideas WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

function SqliteStore() {
  Store.call(this);
}
util.inherits(SqliteStore, Store);

SqliteStore.prototype.get = function (sid, callback) {
  try {
    const stmt = db.prepare('SELECT data FROM sessions WHERE id = ? AND expires > ?');
    const row = stmt.get(sid, Math.floor(Date.now() / 1000));
    if (row && row.data) {
      return callback(null, JSON.parse(row.data));
    }
    return callback();
  } catch (err) {
    return callback(err);
  }
};

SqliteStore.prototype.set = function (sid, session, callback) {
  try {
    const expires = session.cookie && session.cookie.expires
      ? Math.floor(session.cookie.expires.getTime() / 1000)
      : Math.floor(Date.now() / 1000) + 24 * 60 * 60 * 7;
    const data = JSON.stringify(session);
    const stmt = db.prepare(
      'INSERT OR REPLACE INTO sessions (id, expires, data) VALUES (?, ?, ?)'
    );
    stmt.run(sid, expires, data);
    return callback();
  } catch (err) {
    return callback(err);
  }
};

SqliteStore.prototype.destroy = function (sid, callback) {
  try {
    db.prepare('DELETE FROM sessions WHERE id = ?').run(sid);
    return callback();
  } catch (err) {
    return callback(err);
  }
};

SqliteStore.prototype.touch = function (sid, session, callback) {
  this.get(sid, (err, s) => {
    if (err) return callback(err);
    if (s) this.set(sid, session, callback);
    else callback();
  });
};

module.exports = {
  db,
  createUser,
  getUserByEmail,
  getUserById,
  promoteUser,
  listUsers,
  updateUserRolePlan,
  listDocuments,
  getDocumentById,
  createDocument,
  updateDocument,
  deleteDocument,
  listIdeas,
  getIdeaById,
  createIdea,
  updateIdea,
  deleteIdea,
  SqliteStore,
};
