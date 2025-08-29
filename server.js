import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
app.use(cors());

const PORT = process.env.PORT || 10000;

// فقط برای تست (ببینیم سرور بالا اومده)
app.get("/", (req, res) => {
  res.send("✅ Empersia Socket.IO Server is running...");
});

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  path: "/socket.io/", // 👈 این خیلی مهمه که با Config.gd هماهنگ باشه
});

io.on("connection", (socket) => {
  console.log("🔗 کلاینت وصل شد:", socket.id);

  // دریافت پیام تست از Godot
  socket.on("hello", (data) => {
    console.log("📨 پیام از Godot:", data);
    // جواب برگردون
    socket.emit("hello_response", { msg: "سلام از سرور 👋" });
  });

  socket.on("disconnect", () => {
    console.log("⚡ کلاینت قطع شد:", socket.id);
  });
});

httpServer.listen(PORT, () => {
  console.log(`🚀 سرور روی پورت ${PORT} در حال اجراست`);
});
