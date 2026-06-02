import {
  getAllKeywords,
  getForwardNumber,
  addPendingReply,
} from '../database/db.js';

export async function getMatchedKeyword(message) {
  const keywords = await getAllKeywords();
  
  if (!message || typeof message !== 'string') {
    return null;
  }

  const messageText = message.toLowerCase();

  for (const keyword of keywords) {
    if (messageText.includes(keyword.toLowerCase())) {
      return keyword;
    }
  }

  return null;
}

export async function checkAndForward(userId, from, message, sock, originalSender) {
  try {
    const matchedKeyword = await getMatchedKeyword(message);

    if (!matchedKeyword) {
      return false;
    }

    const forwardNumber = await getForwardNumber(matchedKeyword);

    if (!forwardNumber) {
      return false;
    }

    const forwardMessage = formatForwardMessage(userId, originalSender, matchedKeyword, message);
    const jid = formatPhoneToJID(forwardNumber);
    
    await sock.sendMessage(jid, { text: forwardMessage });

    console.log(`[${userId}] Message forwarded to ${forwardNumber} (keyword: ${matchedKeyword})`);

    await addPendingReply(userId, from, forwardNumber, message, matchedKeyword);

    return true;
  } catch (error) {
    console.error(`Error in checkAndForward:`, error);
    return false;
  }
}

export function formatForwardMessage(userId, originalSender, matchedKeyword, originalMessage) {
  return `📨 ফরওয়ার্ডেড মেসেজ
━━━━━━━━━━━━━━━
📱 ইউজার আইডি: ${userId}
👤 ফ্রম: ${originalSender}
🔑 কীওয়ার্ড: ${matchedKeyword}
💬 মেসেজ: ${originalMessage}
━━━━━━━━━━━━━━━
এই মেসেজের উত্তর দিলে তা সরাসরি ইউজারে যাবে`;
}

export function formatReplyMessage(originalMessage, replyMessage, expertNumber) {
  return `📨 উত্তর পাওয়া গেছে!
━━━━━━━━━━━━━━━
আপনার প্রশ্ন: ${originalMessage}
উত্তর: ${replyMessage}
━━━━━━━━━━━━━━━
${expertNumber} থেকে উত্তর`;
}

export function formatPhoneToJID(phoneNumber) {
  let cleaned = phoneNumber.replace(/[^\d+]/g, '');
  
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }

  return `${cleaned}@s.whatsapp.net`;
}

export function extractPhoneFromJID(jid) {
  return jid.split('@')[0];
}

export function extractDisplayName(msg) {
  if (msg.pushName) {
    return msg.pushName;
  }

  const jid = msg.key.remoteJid || msg.key.participant || '';
  const phone = jid.split('@')[0];
  
  return phone || 'Unknown';
}

export function getMessageText(msg) {
  const messageType = Object.keys(msg.message || {})[0];

  if (messageType === 'conversation') {
    return msg.message.conversation;
  }

  if (messageType === 'extendedTextMessage') {
    return msg.message.extendedTextMessage.text;
  }

  if (messageType === 'imageMessage' && msg.message.imageMessage.caption) {
    return msg.message.imageMessage.caption;
  }

  if (messageType === 'videoMessage' && msg.message.videoMessage.caption) {
    return msg.message.videoMessage.caption;
  }

  return null;
}

export function getSenderJID(msg) {
  const remoteJid = msg.key.remoteJid;
  
  if (remoteJid.includes('@g.us')) {
    return msg.key.participant || remoteJid;
  }
  
  return msg.key.remoteJid;
}
