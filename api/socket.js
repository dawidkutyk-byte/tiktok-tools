import { Server } from "socket.io";
import TikTokLiveConnection from "tiktok-live-connector";

let io;
let tiktokConnection = null;

export default function handler(req, res) {
  if (!res.socket.server.io) {
    io = new Server(res.socket.server, { cors: { origin: "*" } });
    res.socket.server.io = io;

    io.on("connection", (socket) => {
      console.log("🟢 Klient połączony z WebSocket");

      socket.on("connectTikTok", async (username) => {
        console.log("📡 Łączenie z TikTok Live:", username);
        if (tiktokConnection) {
          tiktokConnection.disconnect();
          tiktokConnection = null;
        }

        try {
          const tiktok = new TikTokLiveConnection(username);
          tiktokConnection = tiktok;

          tiktok.connect().then(() => {
            socket.emit("tiktokConnected", username);
            console.log(`✅ Połączono z TikTok Live: ${username}`);
          });

          tiktok.on("gift", (data) => {
            socket.emit("gift", data);
            io.emit("gift", data); // przekazanie do wszystkich klientów
          });

          tiktok.on("chat", (data) => {
            io.emit("chat", data);
          });

          tiktok.on("disconnected", () => {
            io.emit("tiktokDisconnected");
            console.log("❌ TikTok rozłączony");
          });
        } catch (err) {
          console.error("Błąd połączenia TikTok:", err.message);
          socket.emit("error", err.message);
        }
      });
    });

    console.log("✅ Socket.io zainicjalizowany");
  }

  res.end();
}
