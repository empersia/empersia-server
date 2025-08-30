const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mysql = require("mysql2");

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

const io = new Server(server, {
  cors: { origin: "*" },
  path: "/socket.io/",
});

// تنظیمات اتصال به MySQL
const db = mysql.createConnection({
  host: "localhost",    // یا آدرس سرور MySQL
  user: "root",         // نام کاربری
  password: "password", // رمز عبور
  database: "empersia", // نام پایگاه داده
});

db.connect((err) => {
  if (err) {
    console.error("خطا در اتصال به پایگاه داده MySQL:", err);
    return;
  }
  console.log("اتصال به پایگاه داده MySQL برقرار شد!");
});

// تست ساده برای API
app.get("/api", (req, res) => {
  res.send("Empersia API is running ✅");
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
