const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("./src/db");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// Тестовый маршрут
app.get("/", (req, res) => {
  res.send("🚀 Messenger backend is running!");
});

// middleware для проверки токена
function auth(req, res, next) {
  const header = req.headers["authorization"];
  if (!header) return res.status(403).json({ error: "No token" });

  const token = header.split(" ")[1];
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ error: "Invalid token" });
    req.userId = decoded.id;
    next();
  });
}
// Регистрация
app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  const hashed = await bcrypt.hash(password, 10);

  try {
    await pool.query(
      "INSERT INTO users (username, password) VALUES ($1, $2)",
      [username, hashed]
    );
    res.json({ message: "User registered" });
  } catch (err) {
    res.status(400).json({ error: "User already exists" });
  }
});

// Логин
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const result = await pool.query("SELECT * FROM users WHERE username=$1", [username]);
  const user = result.rows[0];

  if (!user) return res.status(400).json({ error: "User not found" });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(400).json({ error: "Invalid password" });

  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: "1h" });
  res.json({ token });
});

// Отправка сообщения
app.post("/messages/send", auth, async (req, res) => {
  const { message } = req.body;
  await pool.query(
    "INSERT INTO messages (user_id, message) VALUES ($1, $2)",
    [req.userId, message]
  );
  res.json({ message: "Sent" });
});

// Получение всех сообщений
app.get("/messages/all", auth, async (req, res) => {
  const result = await pool.query(
    "SELECT m.id, u.username, m.message, m.created_at FROM messages m JOIN users u ON m.user_id = u.id ORDER BY m.created_at DESC"
  );
  res.json(result.rows);
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
