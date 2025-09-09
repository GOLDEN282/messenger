const express = require('express');
const http = require('http');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const chatsRoutes = require('./routes/chats');
const setupSockets = require('./sockets');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/chats', chatsRoutes);

const server = http.createServer(app);
setupSockets(server);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
