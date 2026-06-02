import {
  getPendingReplyByForwardedTo,
  markReplyAsReplied,
} from '../database/db.js';
import { getUserSession } from './sessionManager.js';
import { formatReplyMessage } from './forwardHandler.js';

export async function handleIncomingReply(fromNumber, message, userId) {
  try {
    const pending = await getPendingReplyByForwardedTo(fromNumber);

    if (!pending) {
      console.log(`[${userId}] No pending reply found for ${fromNumber}`);
      return false;
    }

    await forwardReplyToUser(pending, message, userId);
    await markReplyAsReplied(pending.id);

    return true;
  } catch (error) {
    console.error(`Error in handleIncomingReply:`, error);
    return false;
  }
}

export async function forwardReplyToUser(pending, replyMessage, userId) {
  try {
    const sock = getUserSession(userId);

    if (!sock) {
      console.error(`[${userId}] Session not found for forwarding reply`);
      return false;
    }

    const formattedMessage = formatReplyMessage(
      pending.original_message,
      replyMessage,
      pending.forwarded_to
    );

    const originalSenderJID = pending.original_sender;
    await sock.sendMessage(originalSenderJID, { text: formattedMessage });

    console.log(`[${userId}] Reply forwarded to ${pending.original_sender}`);
    return true;
  } catch (error) {
    console.error(`Error in forwardReplyToUser:`, error);
    return false;
  }
}

export async function processIncomingMessage(userId, msg) {
  try {
    const messageText = getMessageText(msg);

    if (!messageText) {
      return;
    }

    const senderJID = getSenderJID(msg);
    const senderPhone = extractPhoneFromJID(senderJID);

    const handled = await handleIncomingReply(senderPhone, messageText, userId);

    if (handled) {
      console.log(`[${userId}] Reply handled for ${senderPhone}`);
    }
  } catch (error) {
    console.error(`Error processing incoming message for ${userId}:`, error);
  }
}

function extractPhoneFromJID(jid) {
  return jid.split('@')[0];
}

function getMessageText(msg) {
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

function getSenderJID(msg) {
  const remoteJid = msg.key.remoteJid;
  
  if (remoteJid.includes('@g.us')) {
    return msg.key.participant || remoteJid;
  }
  
  return msg.key.remoteJid;
}
