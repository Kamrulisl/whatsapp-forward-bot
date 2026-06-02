import makeWASocket, { DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys';
import { join } from 'path';
import { mkdir } from 'fs/promises';
import { existsSync, rmSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SESSIONS_DIR = join(__dirname, '../../sessions');

// Store active sessions
const activeSessions = new Map();

// Ensure sessions directory exists
async function ensureSessionsDir() {
  if (!existsSync(SESSIONS_DIR)) {
    await mkdir(SESSIONS_DIR, { recursive: true });
  }
}

export async function createUserSession(userId, onQR, onReady, onMessage, onDisconnect) {
  try {
    await ensureSessionsDir();
    
    const sessionPath = join(SESSIONS_DIR, userId);
    if (!existsSync(sessionPath)) {
      await mkdir(sessionPath, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      browser: ['Ubuntu', 'Chrome', '120.0.6099.129'],
      syncFullHistory: false,
      shouldSyncHistoryMessage: () => false,
      retryRequestDelayMs: 100,
    });

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        console.log(`[${userId}] QR Code generated`);
        onQR(qr);
      }

      if (connection === 'close') {
        const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
        
        if (shouldReconnect) {
          console.log(`[${userId}] Connection closed, reconnecting...`);
          await createUserSession(userId, onQR, onReady, onMessage, onDisconnect);
        } else {
          console.log(`[${userId}] Connection closed permanently`);
          if (onDisconnect) {
            onDisconnect(userId);
          }
          activeSessions.delete(userId);
        }
      }

      if (connection === 'open') {
        console.log(`[${userId}] ✅ Connection established`);
        onReady(userId);
      }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async (m) => {
      if (m.type === 'notify') {
        for (const msg of m.messages) {
          if (!msg.key.fromMe) {
            await onMessage(userId, msg);
          }
        }
      }
    });

    activeSessions.set(userId, sock);
    console.log(`[${userId}] Session created`);
    
    return sock;
  } catch (error) {
    console.error(`Error creating session for ${userId}:`, error);
    throw error;
  }
}

export async function closeSession(userId) {
  try {
    const sock = activeSessions.get(userId);
    
    if (sock) {
      await sock.logout();
      sock.end(undefined);
      activeSessions.delete(userId);
      console.log(`[${userId}] Session closed`);
    }

    // Delete session folder
    const sessionPath = join(SESSIONS_DIR, userId);
    if (existsSync(sessionPath)) {
      rmSync(sessionPath, { recursive: true, force: true });
      console.log(`[${userId}] Session folder deleted`);
    }

    return true;
  } catch (error) {
    console.error(`Error closing session for ${userId}:`, error);
    const sessionPath = join(SESSIONS_DIR, userId);
    if (existsSync(sessionPath)) {
      rmSync(sessionPath, { recursive: true, force: true });
    }
    activeSessions.delete(userId);
    return true;
  }
}

export function getUserSession(userId) {
  return activeSessions.get(userId) || null;
}

export function getAllActiveUsers() {
  return Array.from(activeSessions.keys());
}

export function isUserConnected(userId) {
  return activeSessions.has(userId);
}

export function getActiveSessions() {
  return activeSessions;
}
