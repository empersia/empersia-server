const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcryptjs");

const app = express();
const server = http.createServer(app);

// در Render همیشه PORT از طریق env داده میشه
// روی لوکال مثلا 3000 میشه
const PORT = process.env.PORT || 3000;

// socket.io config
const io = new Server(server, {
  cors: { origin: "*" },
  path: "/socket.io/", // حتماً همین باشه تا Godot پیدا کنه
});

// فایل استاتیک (برای تست لوکال)
app.use(express.static(path.join(__dirname, "public")));

// تست ساده API
app.get("/api", (req, res) => {
  res.send("Empersia API is running ✅");
});

// فایل ذخیره بازیکن‌ها
const PLAYERS_FILE = path.join(__dirname, "players.json");
let players = {};

// بارگذاری فایل یا ایجاد خالی
if (fs.existsSync(PLAYERS_FILE)) {
  players = JSON.parse(fs.readFileSync(PLAYERS_FILE));
} else {
  fs.writeFileSync(PLAYERS_FILE, JSON.stringify({}));
}

// WebSocket
io.on("connection", (socket) => {
  console.log("✅ کاربر وصل شد:", socket.id);

  socket.emit("message", "خوش آمدید! اتصال موفق بود.");

  socket.on("ping", (data) => {
    console.log("📨 دریافت ping:", data);
    socket.emit("pong", "pong از سرور");
  });

  // ثبت‌نام
  socket.on("register", async (data) => {
    const { username, password, email, captcha, captcha_server } = data;

    if (!username || !password || !email || !captcha) {
      socket.emit("register_response", { success: false, msg: "تمام فیلدها الزامی هستند." });
      return;
    }

    if (captcha !== captcha_server) {
      socket.emit("register_response", { success: false, msg: "کپچا اشتباه است." });
      return;
    }

    if (players[username]) {
      socket.emit("register_response", { success: false, msg: "نام کاربری تکراری است." });
      return;
    }

    const hash = await bcrypt.hash(password, 10);

    players[username] = {
      password_hash: hash,
      email,
      resources: { wood: 100, stone: 100, iron: 50 }
    };

    fs.writeFileSync(PLAYERS_FILE, JSON.stringify(players, null, 2));
    socket.emit("register_response", { success: true, msg: "ثبت نام موفق بود!" });
  });

  socket.on("disconnect", () => {
    console.log("❌ کاربر قطع شد:", socket.id);
  });
});

// ✅ اینجا تغییر اصلیه
server.listen(PORT, () => {
  console.log(`🚀 سرور Empersia روی پورت ${PORT} اجرا شد`);
});
