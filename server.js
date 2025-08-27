const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcrypt");

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

const io = new Server(server, {
  cors: { origin: "*" },
  path: "/socket.io/",
});

// فایل استاتیک
app.use(express.static(path.join(__dirname, "public")));

// تست ساده API
app.get("/api", (req, res) => {
  res.send("Empersia API is running ✅");
});

// فایل ذخیره‌سازی بازیکن‌ها
const PLAYERS_FILE = path.join(__dirname, "players.json");
let players = {};

// بارگذاری بازیکن‌ها یا ایجاد فایل خالی
if (fs.existsSync(PLAYERS_FILE)) {
  players = JSON.parse(fs.readFileSync(PLAYERS_FILE));
} else {
  fs.writeFileSync(PLAYERS_FILE, JSON.stringify({}));
}

// WebSocket
io.on("connection", (socket) => {
  console.log("✅ کاربر وصل شد:", socket.id);

  // پیام خوش‌آمد
  socket.emit("message", "خوش آمدید! اتصال موفق بود.");

  // تست ping
  socket.on("ping", (data) => {
    console.log("📨 دریافت ping:", data);
    socket.emit("pong", "pong از سرور");
  });

  // ========================
  // ثبت نام (Register)
  // ========================
  socket.on("register", async (data) => {
    const { username, password, email, captcha, captcha_server } = data;

    // اعتبارسنجی ساده
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

    // هش کردن پسورد
    const hash = await bcrypt.hash(password, 10);

    // ذخیره بازیکن
    players[username] = {
      password_hash: hash,
      email,
      resources: { wood: 100, stone: 100, iron: 50 }
    };

    fs.writeFileSync(PLAYERS_FILE, JSON.stringify(players, null, 2));
    socket.emit("register_response", { success: true, msg: "ثبت نام موفق بود!" });
  });

  // قطع اتصال
  socket.on("disconnect", () => {
    console.log("❌ کاربر قطع شد:", socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 سرور Empersia روی پورت ${PORT} اجرا شد`);
});
