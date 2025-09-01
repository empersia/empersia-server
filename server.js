const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
  path: "/socket.io/",
});

const PORT = process.env.PORT || 10000;

// 👇 اتصال به PostgreSQL با Environment Variables
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// تست اتصال به دیتابیس
pool.connect()
  .then(client => {
    console.log("✅ PostgreSQL متصل شد");
    client.release();
  })
  .catch(err => {
    console.error("❌ خطا در اتصال به PostgreSQL: ", err);
  });

// Middleware برای دریافت JSON
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// تست ساده برای API
app.get("/api", (req, res) => {
  res.send("Empersia API is running ✅");
});

// ثبت‌نام پلیر
app.post("/api/register", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: "username یا password خالی است" });

  try {
    // بررسی تکراری بودن یوزرنیم
    const check = await pool.query("SELECT * FROM players WHERE username=$1", [username]);
    if (check.rows.length > 0) return res.status(400).json({ error: "این نام کاربری قبلا ثبت شده" });

    const hashed = await bcrypt.hash(password, 10);
    await pool.query("INSERT INTO players (username, password) VALUES ($1, $2)", [username, hashed]);
    res.json({ success: true, message: "ثبت‌نام با موفقیت انجام شد" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "خطا در سرور" });
  }
});

// ورود پلیر
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: "username یا password خالی است" });

  try {
    const result = await pool.query("SELECT * FROM players WHERE username=$1", [username]);
    if (result.rows.length === 0) return res.status(400).json({ error: "نام کاربری یا رمز عبور اشتباه است" });

    const player = result.rows[0];
    const match = await bcrypt.compare(password, player.password);
    if (!match) return res.status(400).json({ error: "نام کاربری یا رمز عبور اشتباه است" });

    res.json({ success: true, player });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "خطا در سرور" });
  }
});

// WebSocket
io.on("connection", (socket) => {
  console.log("✅ کاربر وصل شد:", socket.id);
  socket.emit("message", "خوش آمدید! اتصال موفق بود.");

  socket.on("ping", (data) => {
    console.log("📨 دریافت ping:", data);
    socket.emit("pong", "pong از سرور");
  });

  socket.on("disconnect", () => {
    console.log("❌ کاربر قطع شد:", socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 سرور Empersia روی پورت ${PORT} اجرا شد`);
});
