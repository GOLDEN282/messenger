const db = require('../db');

async function isMember(chatId, userId) {
  const r = await db.query(
    'SELECT 1 FROM chat_members WHERE chat_id=$1 AND user_id=$2 LIMIT 1',
    [chatId, userId]
  );
  return r.rowCount > 0;
}

async function createChatWithMembers({ title = null, is_group = false, members = [], creatorId }) {
  if (!Array.isArray(members)) members = [];
  const uniqueMembers = Array.from(new Set([...members, creatorId]));

  const r = await db.query(
    'INSERT INTO chats (title, is_group) VALUES ($1, $2) RETURNING id, title, is_group, created_at',
    [title, !!is_group]
  );
  const chat = r.rows[0];

  const values = [];
  const params = [chat.id];
  uniqueMembers.forEach((u, idx) => {
    params.push(u);
    values.push(`($1,$${idx + 2})`);
  });
  if (values.length > 0) {
    const q = `INSERT INTO chat_members (chat_id, user_id) VALUES ${values.join(', ')}`;
    await db.query(q, params);
  }

  return chat;
}

async function getUserChats(userId) {
  const r = await db.query(`
    SELECT c.* FROM chats c
    JOIN chat_members m ON m.chat_id = c.id
    WHERE m.user_id = $1
    ORDER BY c.created_at DESC
  `, [userId]);
  return r.rows;
}

async function getChatMessages(chatId, limit = 50, offset = 0) {
  const r = await db.query(`
    SELECT m.id, m.chat_id, m.sender_id, m.content, m.file_path, m.created_at
    FROM messages m
    WHERE m.chat_id = $1
    ORDER BY m.created_at ASC
    LIMIT $2 OFFSET $3
  `, [chatId, limit, offset]);
  return r.rows;
}

module.exports = {
  isMember,
  createChatWithMembers,
  getUserChats,
  getChatMessages
};
