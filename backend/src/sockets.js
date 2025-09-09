const { Server } = require('socket.io');
const Redis = require('ioredis');
const { createAdapter } = require('@socket.io/redis-adapter');
const jwt = require('jsonwebtoken');
const db = require('./db');
const chatsModel = require('./models/chats');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'devsecret';

async function setupSockets(server) {
  const io = new Server(server, {
    cors: { origin: '*' },
    maxHttpBufferSize: 1e6
  });

  if (process.env.REDIS_URL) {
    const pubClient = new Redis(process.env.REDIS_URL);
    const subClient = pubClient.duplicate();
    io.adapter(createAdapter(pubClient, subClient));
  }

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('auth error'));
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      socket.user = payload;
      next();
    } catch {
      next(new Error('auth error'));
    }
  });

  io.on('connection', (socket) => {
    console.log('ws connect', socket.user.username, socket.id);

    socket.on('join', async (chatId) => {
      chatId = Number(chatId);
      if (!chatId) return socket.emit('error', { code: 'invalid_chat_id' });
      const member = await chatsModel.isMember(chatId, socket.user.id);
      if (!member) return socket.emit('error', { code: 'not_a_member' });
      socket.join(`chat_${chatId}`);
      socket.emit('joined', { chatId });
    });

    socket.on('leave', (chatId) => {
      socket.leave(`chat_${chatId}`);
      socket.emit('left', { chatId });
    });

    socket.on('message', async ({ chatId, content, filePath }) => {
      chatId = Number(chatId);
      if (!chatId) return socket.emit('error', { code: 'invalid_chat_id' });
      const member = await chatsModel.isMember(chatId, socket.user.id);
      if (!member) return socket.emit('error', { code: 'not_a_member' });

      const r = await db.query(
        'INSERT INTO messages (chat_id, sender_id, content, file_path) VALUES ($1,$2,$3,$4) RETURNING id, created_at',
        [chatId, socket.user.id, content || null, filePath || null]
      );
      const msg = {
        id: r.rows[0].id,
        chat_id: chatId,
        sender_id: socket.user.id,
        content: content || null,
        file_path: filePath || null,
        created_at: r.rows[0].created_at
      };
      io.to(`chat_${chatId}`).emit('message', msg);
    });

    socket.on('typing', async ({ chatId, typing }) => {
      chatId = Number(chatId);
      if (!chatId) return;
      const member = await chatsModel.isMember(chatId, socket.user.id);
      if (!member) return;
      socket.to(`chat_${chatId}`).emit('typing', { userId: socket.user.id, typing: !!typing });
    });
  });
}

module.exports = setupSockets;
