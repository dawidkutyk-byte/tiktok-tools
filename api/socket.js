import { Server } from "socket.io";
import TikTokLiveConnection from "tiktok-live-connector";

const tiktokConnections = {};

export default function handler(req, res) {
  if (!res.socket.server.io) {
    const io = new Server(res.socket.server, {
      cors: { origin: "*" },
    });
    res.socket.server.io = io;

    io.on("connection", (socket) => {
      console.log("🔌 Nowy klient połączony");

      socket.on("connectTikTok", async (username) => {
        if (!username) return;
        console.log(`📡 Łączenie z TikTok Live: ${username}`);

        try {
          const tiktok = new TikTokLiveConnection(username);
          tiktokConnections[username] = tiktok;

          tiktok.connect().then(() => {
            socket.emit("tiktokConnected", username);
            console.log(`✅ Połączono z ${username}`);
          });

          // eventy z TikToka
          tiktok.on("gift", (data) => socket.emit("gift", data));
          tiktok.on("chat", (data) => socket.emit("chat", data));
          tiktok.on("disconnected", () => socket.emit("tiktokDisconnected"));
        } catch (err) {
          console.error("❌ Błąd TikTok:", err.message);
          socket.emit("error", err.message);
        }
      });
    });
  }

  res.end();
}

