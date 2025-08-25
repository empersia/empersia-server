// server.js
const http = require("http");
const { Server } = require("socket.io");

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  if (req.url === "/" || req.url === "/health") {
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Empersia server is running");
  } else {
    res.writeHead(404);
    res.end();
  }
});

const io = new Server(server, {
  cors: { origin: "*" },
  path: "/socket.io/",
});

io.on("connection", (socket) => {
  console.log("✅ کاربر وصل شد:", socket.id);

  // پیام خوش آمد
  socket.emit("message", "خوش آمدید! اتصال موفق بود.");

  // پاسخ به ping
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
