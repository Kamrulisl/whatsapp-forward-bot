import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '../../database.db');

let db = null;

export function initializeDatabase() {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Database connection error:', err);
        reject(err);
      } else {
        console.log('✅ SQLite Database connected');
        createTables();
        resolve(db);
      }
    });
  });
}

function createTables() {
  db.serialize(() => {
    // Forward Rules Table
    db.run(`
      CREATE TABLE IF NOT EXISTS forward_rules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        keyword TEXT UNIQUE,
        forward_number TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Pending Replies Table
    db.run(`
      CREATE TABLE IF NOT EXISTS pending_replies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        original_sender TEXT,
        forwarded_to TEXT,
        original_message TEXT,
        matched_keyword TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_replied BOOLEAN DEFAULT 0
      )
    `);

    // User Sessions Table
    db.run(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        user_id TEXT PRIMARY KEY,
        whatsapp_number TEXT,
        status TEXT,
        last_active DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  });
}

// Forward Rules Operations
export function addForwardRule(keyword, forwardNumber) {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO forward_rules (keyword, forward_number) VALUES (?, ?)',
      [keyword, forwardNumber],
      function (err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, keyword, forwardNumber });
      }
    );
  });
}

export function deleteForwardRule(keyword) {
  return new Promise((resolve, reject) => {
    db.run(
      'DELETE FROM forward_rules WHERE keyword = ?',
      [keyword],
      function (err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      }
    );
  });
}

export function getAllForwardRules() {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM forward_rules ORDER BY created_at DESC', [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

export function getForwardNumber(keyword) {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT forward_number FROM forward_rules WHERE keyword = ?',
      [keyword],
      (err, row) => {
        if (err) reject(err);
        else resolve(row ? row.forward_number : null);
      }
    );
  });
}

export function getAllKeywords() {
  return new Promise((resolve, reject) => {
    db.all('SELECT keyword FROM forward_rules', [], (err, rows) => {
      if (err) reject(err);
      else resolve((rows || []).map(r => r.keyword));
    });
  });
}

// Pending Replies Operations
export function addPendingReply(userId, originalSender, forwardedTo, originalMessage, matchedKeyword) {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO pending_replies (user_id, original_sender, forwarded_to, original_message, matched_keyword) 
       VALUES (?, ?, ?, ?, ?)`,
      [userId, originalSender, forwardedTo, originalMessage, matchedKeyword],
      function (err) {
        if (err) reject(err);
        else resolve({ id: this.lastID });
      }
    );
  });
}

export function getPendingReplyByForwardedTo(forwardedTo) {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT * FROM pending_replies WHERE forwarded_to = ? AND is_replied = 0 ORDER BY timestamp DESC LIMIT 1',
      [forwardedTo],
      (err, row) => {
        if (err) reject(err);
        else resolve(row || null);
      }
    );
  });
}

export function markReplyAsReplied(pendingReplyId) {
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE pending_replies SET is_replied = 1 WHERE id = ?',
      [pendingReplyId],
      function (err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      }
    );
  });
}

export function getAllPendingReplies(userId = null) {
  return new Promise((resolve, reject) => {
    let query = 'SELECT * FROM pending_replies WHERE is_replied = 0';
    let params = [];
    
    if (userId) {
      query += ' AND user_id = ?';
      params.push(userId);
    }
    
    query += ' ORDER BY timestamp DESC';
    
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

// User Sessions Operations
export function addUserSession(userId, whatsappNumber, status = 'connected') {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT OR REPLACE INTO user_sessions (user_id, whatsapp_number, status, last_active) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
      [userId, whatsappNumber, status],
      function (err) {
        if (err) reject(err);
        else resolve({ userId, whatsappNumber, status });
      }
    );
  });
}

export function updateUserSessionStatus(userId, status) {
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE user_sessions SET status = ?, last_active = CURRENT_TIMESTAMP WHERE user_id = ?',
      [status, userId],
      function (err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      }
    );
  });
}

export function getUserSession(userId) {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT * FROM user_sessions WHERE user_id = ?',
      [userId],
      (err, row) => {
        if (err) reject(err);
        else resolve(row || null);
      }
    );
  });
}

export function getAllActiveSessions() {
  return new Promise((resolve, reject) => {
    db.all(
      "SELECT * FROM user_sessions WHERE status = 'connected' ORDER BY last_active DESC",
      [],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      }
    );
  });
}

export function deleteUserSession(userId) {
  return new Promise((resolve, reject) => {
    db.run(
      'DELETE FROM user_sessions WHERE user_id = ?',
      [userId],
      function (err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      }
    );
  });
}

export function getDatabase() {
  return db;
}
