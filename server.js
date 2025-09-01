const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const { Pool } = require("pg");

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// ✅ تعریف io قبل از استفاده
const io = new Server(server, {
  cors: { origin: "*" },
  path: "/socket.io/",
});

// 📦 اتصال به PostgreSQL
const pool = new Pool({
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "empersia_db",
  password: process.env.DB_PASSWORD || "your_password",
  port: process.env.DB_PORT || 5432,
});

// تست اتصال دیتابیس
pool.connect()
  .then(() => console.log("✅ PostgreSQL متصل شد"))
  .catch((err) => console.error("❌ خطا در اتصال به PostgreSQL:", err.message));

// 🔻 فایل‌های استاتیک مثل index.html
app.use(express.static(path.join(__dirname, "public")));

// تست ساده برای API
app.get("/api", (req, res) => {
  res.send("Empersia API is running ✅");
});

// ✅ حالا بخش WebSocket بعد از تعریف io
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
