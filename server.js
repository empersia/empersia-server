// server.js
const http = require("http");
const { Server } = require("socket.io");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;

// HTTP handler ساده برای سلامت سرویس و جلوگیری از خطای Render
const server = http.createServer((req, res) => {
  if (req.method === "GET" && (req.url === "/" || req.url === "/health")) {
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Empersia server is running");
  } else {
    res.writeHead(404);
    res.end();
  }
});

// Socket.io روی همین سرور HTTP
const io = new Server(server, {
  cors: { origin: "*" },
  path: "/socket.io/", // با کلاینت Godot هماهنگ
});

const PLAYERS_FILE = path.join(__dirname, "players.json");

// ——— util ها ———
function loadPlayers() {
  try {
    if (!fs.existsSync(PLAYERS_FILE)) return {};
    return JSON.parse(fs.readFileSync(PLAYERS_FILE, "utf8"));
  } catch (e) {
    console.error("❌ خطا در بارگذاری players.json:", e);
    return {};
  }
}

function savePlayers(players) {
  try {
    fs.writeFileSync(PLAYERS_FILE, JSON.stringify(players, null, 2));
  } catch (e) {
    console.error("❌ خطا در ذخیره players.json:", e);
  }
}

// بعضی پلاگین‌های Godot payload را در آرایه می‌فرستند؛ این نرمال‌سازی می‌کند
function normalizePayload(payload) {
  if (Array.isArray(payload)) return payload[0];
  return payload;
}

function capacityForLevel(level = 1) {
  return 3000 + (Math.max(1, level) - 1) * 500;
}

// ——— رویدادها ———
io.on("connection", (socket) => {
  console.log("✅ کاربر وصل شد:", socket.id);
  socket.emit("message", "خوش اومدی بازیکن عزیز!");

  // ثبت‌نام
  socket.on("register", (payload) => {
    const data = normalizePayload(payload) || {};
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
    for (const u in players) {
      if (players[u]?.email === email) {
        socket.emit("register_response", { success: false, error: "این ایمیل قبلاً استفاده شده است." });
        return;
      }
    }

    players[username] = {
      password,
      email,
      level: 1,
      capacity: capacityForLevel(1),
      resources: { wood: 100, stone: 100, iron: 50 },
      last_update: Date.now(),
    };

    savePlayers(players);
    console.log(`🆕 بازیکن ${username} ثبت شد!`);
    socket.emit("register_response", { success: true, username });
  });

  // ورود
  socket.on("login", (payload) => {
    const data = normalizePayload(payload) || {};
    const { username, password } = data;

    if (!username || !password) {
      socket.emit("login_response", { success: false, error: "نام کاربری و رمز عبور لازم است." });
      return;
    }

    const players = loadPlayers();
    const player = players[username];

    if (!player) {
      socket.emit("login_response", { success: false, error: "کاربری با این نام پیدا نشد." });
      return;
    }
    if (player.password !== password) {
      socket.emit("login_response", { success: false, error: "رمز عبور اشتباه است." });
      return;
    }

    // برگرداندن اطلاعات لازم برای UI (سطح انبار/ظرفیت/منابع)
    socket.emit("login_response", {
      success: true,
      username,
      resources: player.resources,
      level: player.level ?? 1,
      capacity: player.capacity ?? capacityForLevel(player.level ?? 1),
    });

    console.log(`🔑 ورود موفق: ${username}`);
  });

  // بروزرسانی منابع
  socket.on("update_resources", (payload) => {
    const data = normalizePayload(payload) || {};
    const { username, resources } = data;

    if (!username || !resources) {
      socket.emit("resources_updated", { success: false, error: "اطلاعات ناقص است." });
      return;
    }

    const players = loadPlayers();
    const player = players[username];
    if (!player) {
      socket.emit("resources_updated", { success: false, error: "بازیکن پیدا نشد." });
      return;
    }

    player.resources = resources;
    player.last_update = Date.now();
    savePlayers(players);
    console.log(`📦 منابع ${username} بروزرسانی شد:`, resources);

    socket.emit("resources_updated", { success: true, resources: player.resources });
  });

  // ارتقای انبار
  socket.on("upgrade_storeroom", (payload) => {
    const data = normalizePayload(payload) || {};
    const { username, level } = data;

    if (!username || !level) {
      socket.emit("storeroom_upgraded", { success: false, error: "اطلاعات ناقص است." });
      return;
    }

    const players = loadPlayers();
    const player = players[username];
    if (!player) {
      socket.emit("storeroom_upgraded", { success: false, error: "بازیکن پیدا نشد." });
      return;
    }

    player.level = level;
    player.capacity = capacityForLevel(level);
    savePlayers(players);
    console.log(`🏗️ انبار ${username} به لول ${level} ارتقا یافت (ظرفیت: ${player.capacity})`);

    socket.emit("storeroom_upgraded", { success: true, level, capacity: player.capacity });
  });

  socket.on("disconnect", () => {
    console.log("❌ کاربر خارج شد:", socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 سرور Socket.io روی پورت ${PORT} اجرا شد`);
});
