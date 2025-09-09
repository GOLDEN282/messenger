const express = require('express');
const auth = require('../middleware/auth');
const chatsModel = require('../models/chats');

const router = express.Router();

router.post('/create', auth, async (req, res) => {
  try {
    const { title, is_group, memberIds } = req.body;
    const creatorId = req.user.id;
    let members = Array.isArray(memberIds) ? memberIds.map(Number).filter(Boolean) : [];
    members = members.filter(id => id !== creatorId);

    const chat = await chatsModel.createChatWithMembers({ title, is_group, members, creatorId });
    res.json({ chat });
  } catch (err) {
    console.error('create chat error', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

router.get('/my', auth, async (req, res) => {
  try {
    const rows = await chatsModel.getUserChats(req.user.id);
    res.json(rows);
  } catch (err) {
    console.error('get my chats', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

router.get('/:chatId/messages', auth, async (req, res) => {
  try {
    const chatId = parseInt(req.params.chatId);
    if (Number.isNaN(chatId)) return res.status(400).json({ error: 'invalid chat id' });

    const member = await chatsModel.isMember(chatId, req.user.id);
    if (!member) return res.status(403).json({ error: 'forbidden' });

    const limit = Math.min(parseInt(req.query.limit || '50'), 200);
    const offset = Math.max(parseInt(req.query.offset || '0'), 0);
    const msgs = await chatsModel.getChatMessages(chatId, limit, offset);
    res.json(msgs);
  } catch (err) {
    console.error('get messages error', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

module.exports = router;
