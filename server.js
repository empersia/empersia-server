const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const { Pool } = require("pg"); // اضافه کردن PostgreSQL

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// 👇 اتصال به PostgreSQL
const pool = new Pool({
  host: "localhost",         // یا IP سرور شما
  port: 5432,
  user: "postgres",          // یوزر PostgreSQL شما
  password: "YOUR_PASSWORD", // پسورد PostgreSQL
  database: "empersia_db",
  ssl: false,                // چون محلی است
});

// Middleware برای JSON
app.use(express.json());

// فایل‌های استاتیک
app.use(express.static(path.join(__dirname, "public")));

// تست ساده API
app.get("/api", (req, res) => {
  res.send("Empersia API is running ✅");
});

// ثبت‌نام بازیکن
app.post("/register", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "نام کاربری و رمز عبور لازم است" });
  }

  try {
    // بررسی اینکه نام کاربری تکراری نباشد
    const exists = await pool.query(
      "SELECT * FROM players WHERE username = $1",
      [username]
    );

    if (exists.rows.length > 0) {
      return res.status(400).json({ error: "نام کاربری موجود است" });
    }

    // اضافه کردن بازیکن جدید
    await pool.query(
      "INSERT INTO players (username, password) VALUES ($1, $2)",
      [username, password] // ⚠️ بعداً بهتر است رمز هش شود
    );

    res.json({ success: true, message: "ثبت‌نام با موفقیت انجام شد" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "خطا در ثبت‌نام" });
  }
});

// ورود بازیکن
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "نام کاربری و رمز عبور لازم است" });
  }

  try {
    const result = await pool.query(
      "SELECT * FROM players WHERE username = $1 AND password = $2",
      [username, password]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: "نام کاربری یا رمز عبور اشتباه است" });
    }

    res.json({ success: true, player: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "خطا در ورود" });
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
