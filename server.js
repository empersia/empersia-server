const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

const io = new Server(server, {
  cors: { origin: "*" },
  path: "/socket.io/",
});

// 👇 فایل‌های استاتیک مثل index.html, css, js
app.use(express.static(path.join(__dirname, "public")));

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
