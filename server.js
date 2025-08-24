const { Server } = require("socket.io");
const fs = require("fs");
const path = require("path");

// پورت Render یا fallback به 3000 برای توسعه محلی
const PORT = process.env.PORT || 3000;
const io = new Server(PORT, { cors: { origin: "*" } });

const PLAYERS_FILE = path.join(__dirname, "players.json");

// --- بارگذاری بازیکنان ---
function loadPlayers() {
  if (!fs.existsSync(PLAYERS_FILE)) return {};
  return JSON.parse(fs.readFileSync(PLAYERS_FILE, "utf8"));
}

// --- ذخیره بازیکنان ---
function savePlayers(players) {
  fs.writeFileSync(PLAYERS_FILE, JSON.stringify(players, null, 2));
}

io.on("connection", (socket) => {
  console.log("✅ کاربر وصل شد:", socket.id);
  socket.emit("message", "خوش اومدی بازیکن عزیز!");

  // --- ثبت‌نام ---
  socket.on("register", (data) => {
    const { username, password, email } = data;
    if (!username || !password || !email) {
      socket.emit("register_response", { success: false, error: "نام کاربری، رمز و ایمیل لازم است." });
      return;
    }

    const players = loadPlayers();

    if (players[username]) {
      socket.emit("register_response", { success: false, error: "این نام کاربری قبلاً گرفته شده است." });
      return;
    }

    for (let user in players) {
      if (players[user].email === email) {
        socket.emit("register_response", { success: false, error: "این ایمیل قبلاً استفاده شده است." });
        return;
      }
    }

    players[username] = {
      password,
      email,
      resources: { wood: 100, stone: 100, iron: 50 }
    };

    savePlayers(players);
    console.log(`🆕 بازیکن ${username} ثبت شد!`);
    socket.emit("register_response", { success: true, username });
  });

  // --- ورود ---
  socket.on("login", (data) => {
    const { username, password } = data;
    if (!username || !password) {
      socket.emit("login_response", { success: false, error: "نام کاربری و رمز عبور لازم است." });
      return;
    }

    const players = loadPlayers();

    if (!players[username]) {
      socket.emit("login_response", { success: false, error: "کاربری با این نام پیدا نشد." });
      return;
    }

    if (players[username].password !== password) {
      socket.emit("login_response", { success: false, error: "رمز عبور اشتباه است." });
      return;
    }

    console.log(`🔑 ورود موفق: ${username}`);
    socket.emit("login_response", { success: true, username, resources: players[username].resources });
  });

  // --- بروزرسانی منابع ---
  socket.on("update_resources", (data) => {
    const { username, resources } = data;
    const players = loadPlayers();

    if (!username || !resources) {
      socket.emit("resources_updated", { success: false, error: "اطلاعات ناقص است." });
      return;
    }

    if (!players[username]) {
      socket.emit("resources_updated", { success: false, error: "بازیکن پیدا نشد." });
      return;
    }

    players[username].resources = resources;
    savePlayers(players);
    console.log(`📦 منابع بازیکن ${username} بروزرسانی شد:`, resources);
    socket.emit("resources_updated", { success: true, resources });
  });

  // --- قطع اتصال ---
  socket.on("disconnect", () => {
    console.log("❌ کاربر خارج شد:", socket.id);
  });
});

console.log(`🚀 سرور Socket.io روی پورت ${PORT} اجرا شد`);
