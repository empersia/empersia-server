const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

const io = new Server(server, {
  cors: { origin: "*" },
  path: "/socket.io/",
});

// مسیری ساده برای تست
app.get("/", (req, res) => {
  res.send("Empersia server is running ✅");
});

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
  console.log(`🚀 سرور ساده Socket.io روی پورت ${PORT} اجرا شد`);
});
