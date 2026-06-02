import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import { initializeDatabase, addForwardRule, deleteForwardRule, getAllForwardRules, addUserSession, getAllActiveSessions, deleteUserSession, updateUserSessionStatus } from './database/db.js';
import { createUserSession, closeSession, getUserSession, getAllActiveUsers, isUserConnected } from './whatsapp/sessionManager.js';
import { checkAndForward, getMessageText, getSenderJID, extractPhoneFromJID, extractDisplayName } from './whatsapp/forwardHandler.js';
import { processIncomingMessage } from './whatsapp/replyHandler.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());
app.use(express.static(join(__dirname, 'public')));

const qrCodes = new Map();

await initializeDatabase();

async function handleQRCode(userId, qr) {
  try {
    const qrImage = await QRCode.toDataURL(qr);
    qrCodes.set(userId, qrImage);
    console.log(`[${userId}] QR code generated`);
  } catch (error) {
    console.error(`Error generating QR code:`, error);
  }
}

async function handleSessionReady(userId) {
  try {
    const sock = getUserSession(userId);
    if (sock) {
      const user = sock.user || { id: userId };
      const phoneNumber = user.id.split(':')[0];
      await addUserSession(userId, phoneNumber, 'connected');
      console.log(`[${userId}] Session saved`);
    }
  } catch (error) {
    console.error(`Error in session ready:`, error);
  }
}

async function handleIncomingMessage(userId, msg) {
  try {
    const messageText = getMessageText(msg);
    if (!messageText) return;

    const senderJID = getSenderJID(msg);
    const senderName = extractDisplayName(msg);
    console.log(`[${userId}] Message: ${messageText.substring(0, 50)}`);

    const replyHandled = await processIncomingMessage(userId, msg);
    if (!replyHandled) {
      const sock = getUserSession(userId);
      await checkAndForward(userId, senderJID, messageText, sock, senderName);
    }
  } catch (error) {
    console.error(`Error handling message:`, error);
  }
}

async function handleDisconnect(userId) {
  try {
    await updateUserSessionStatus(userId, 'disconnected');
    console.log(`[${userId}] Disconnected`);
  } catch (error) {
    console.error(`Error in disconnect:`, error);
  }
}

app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'admin.html'));
});

app.post('/api/login/start', async (req, res) => {
  try {
    const userId = uuidv4();
    console.log(`Login: ${userId}`);
    await createUserSession(userId, (qr) => handleQRCode(userId, qr), () => handleSessionReady(userId), (msg) => handleIncomingMessage(userId, msg), (id) => handleDisconnect(id));
    res.json({ userId, message: 'Session created' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to start login' });
  }
});

app.get('/api/login/qr/:userId', (req, res) => {
  const { userId } = req.params;
  const qrImage = qrCodes.get(userId);
  res.json({ qr: qrImage || null });
});

app.get('/api/login/status/:userId', (req, res) => {
  const { userId } = req.params;
  const isConnected = isUserConnected(userId);
  res.json({ userId, connected: isConnected, status: isConnected ? 'connected' : 'disconnected' });
});

app.post('/api/logout/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    await closeSession(userId);
    await deleteUserSession(userId);
    qrCodes.delete(userId);
    res.json({ message: 'Logged out' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to logout' });
  }
});

app.get('/api/rules', async (req, res) => {
  try {
    const rules = await getAllForwardRules();
    res.json(rules);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch rules' });
  }
});

app.post('/api/rules', async (req, res) => {
  const { keyword, forwardNumber } = req.body;
  if (!keyword || !forwardNumber) {
    return res.status(400).json({ error: 'Keyword and forward number required' });
  }
  try {
    const rule = await addForwardRule(keyword, forwardNumber);
    res.json({ message: 'Rule added', rule });
  } catch (error) {
    res.status(400).json({ error: 'Keyword already exists' });
  }
});

app.delete('/api/rules/:keyword', async (req, res) => {
  const { keyword } = req.params;
  try {
    const result = await deleteForwardRule(keyword);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Rule not found' });
    }
    res.json({ message: 'Rule deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete rule' });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const users = await getAllActiveSessions();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.get('/api/status', (req, res) => {
  res.json({ server: 'running', activeUsers: getAllActiveUsers().length });
});

app.listen(PORT, () => {
  console.log(`\n╔════════════════════════════════════════╗`);
  console.log(`║  WhatsApp Forwarding Bot Server        ║`);
  console.log(`║  Running on: http://localhost:${PORT}      ║`);
  console.log(`║  Home: http://localhost:${PORT}/           ║`);
  console.log(`║  Admin: http://localhost:${PORT}/admin     ║`);
  console.log(`╚════════════════════════════════════════╝\n`);
});
