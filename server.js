const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const bcrypt = require("bcrypt");
const fs = require("fs");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" }, path: "/socket.io/" });

const PORT = process.env.PORT || 10000;
const PLAYERS_FILE = "./players.json";

// بارگذاری بازیکن‌ها یا ایجاد فایل خالی
let players = {};
if (fs.existsSync(PLAYERS_FILE)) {
    players = JSON.parse(fs.readFileSync(PLAYERS_FILE));
} else {
    fs.writeFileSync(PLAYERS_FILE, JSON.stringify({}));
}

io.on("connection", (socket) => {
    console.log("✅ کاربر وصل شد:", socket.id);

    // ثبت نام
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
});

server.listen(PORT, () => console.log(`🚀 سرور Empersia روی پورت ${PORT} اجرا شد`));
