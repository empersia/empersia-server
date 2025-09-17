const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
  path: "/socket.io/",
});

const PORT = process.env.PORT || 10000;

// اتصال به PostgreSQL با Environment Variables
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// تست اتصال به دیتابیس + ساخت جدول و ستون email + resources + last_login
pool.connect()
  .then(async (client) => {
    console.log("✅ PostgreSQL متصل شد");

    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS players (
          id SERIAL PRIMARY KEY,
          username VARCHAR(50) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          email VARCHAR(100) UNIQUE NOT NULL,
          resources JSONB DEFAULT '{"wood":0,"stone":0,"iron":0}',
          last_login TIMESTAMP
        );
      `);
      console.log("✅ جدول players آماده شد");

      // اطمینان از وجود ستون last_login در جدول (برای دیتابیس‌های قدیمی)
      await client.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name='players' AND column_name='last_login'
          ) THEN
            ALTER TABLE players ADD COLUMN last_login TIMESTAMP;
          END IF;
        END$$;
      `);

    } catch (err) {
      console.error("❌ خطا در ساخت جدول:", err);
    }

    client.release();
  })
  .catch(err => {
    console.error("❌ خطا در اتصال به PostgreSQL: ", err);
  });

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// تست ساده برای API
app.get("/api", (req, res) => {
  res.send("Empersia API is running ✅");
});

// ----------------- ثبت‌نام -----------------
app.post("/api/register", async (req, res) => {
  const { username, password, email } = req.body;
  if (!username || !password || !email) {
    return res.status(400).json({ error: "تمام فیلدها الزامی هستند" });
  }

  try {
    const check = await pool.query(
      "SELECT * FROM players WHERE username=$1 OR email=$2",
      [username, email]
    );
    if (check.rows.length > 0) {
      return res.status(400).json({ error: "نام کاربری یا ایمیل قبلاً استفاده شده است" });
    }

    const hashed = await bcrypt.hash(password, 10);

    // ✅ منابع اولیه هر پلیر جدید
    const initialResources = { wood: 0, stone: 0, iron: 0 };

    // ✅ ثبت با منابع مستقل
    await pool.query(
      "INSERT INTO players (username, email, password, resources) VALUES ($1, $2, $3, $4)",
      [username, email, hashed, initialResources]
    );

    res.json({ success: true, message: "ثبت‌نام با موفقیت انجام شد" });
  } catch (err) {
    console.error("❌ خطا در ثبت‌نام:", err);
    res.status(500).json({ error: "خطا در سرور" });
  }
});

// ----------------- ورود -----------------
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "username یا password خالی است" });
  }

  try {
    const result = await pool.query("SELECT * FROM players WHERE username=$1", [username]);
    if (result.rows.length === 0) {
      return res.status(400).json({ error: "نام کاربری یا رمز عبور اشتباه است" });
    }

    const player = result.rows[0];
    const match = await bcrypt.compare(password, player.password);
    if (!match) {
      return res.status(400).json({ error: "نام کاربری یا رمز عبور اشتباه است" });
    }

    // آپدیت تاریخ آخرین ورود
    await pool.query(
      "UPDATE players SET last_login = NOW() WHERE username = $1",
      [username]
    );

    res.json({
      success: true,
      player: {
        username: player.username,
        email: player.email,
        resources: player.resources,
        last_login: new Date().toISOString()
      }
    });
  } catch (err) {
    console.error("❌ خطا در ورود:", err);
    res.status(500).json({ error: "خطا در سرور" });
  }
});

// ----------------- وب‌سوکت -----------------
io.on("connection", (socket) => {
  console.log("✅ کاربر وصل شد:", socket.id);
  socket.emit("message", "خوش آمدید! اتصال موفق بود.");

  // پاسخ به ping
  socket.on("ping", (data) => {
    console.log("📨 دریافت ping:", data);
    socket.emit("pong", "pong از سرور");
  });

  // بروزرسانی منابع در دیتابیس بر اساس username
  socket.on("update_resources", async (data) => {
    const { username, resources } = data;
    if (!username || !resources) return;

    try {
      await pool.query(
        "UPDATE players SET resources = $1 WHERE username = $2",
        [resources, username]
      );
      socket.emit("resource_update", resources);
      console.log(`💾 منابع پلیر ${username} ذخیره شد:`, resources);
    } catch (err) {
      console.error("❌ خطا در ذخیره منابع:", err);
    }
  });

  // دریافت منابع فعلی از دیتابیس بر اساس username
  socket.on("get_resources", async (username) => {
    try {
      const result = await pool.query(
        "SELECT resources FROM players WHERE username=$1",
        [username]
      );
      if (result.rows.length > 0) {
        socket.emit("resource_update", result.rows[0].resources);
      } else {
        socket.emit("resource_update", { wood: 0, stone: 0, iron: 0 });
      }
    } catch (err) {
      console.error("❌ خطا در گرفتن منابع:", err);
    }
  });

  socket.on("disconnect", () => {
    console.log("❌ کاربر قطع شد:", socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 سرور Empersia روی پورت ${PORT} اجرا شد`);
});
