import React, { useState, useEffect, useRef } from "react";
import io from "socket.io-client";

export default function App() {
  const [activeTab, setActiveTab] = useState("connect");
  const [username, setUsername] = useState("widow_og");
  const [serverTapUrl, setServerTapUrl] = useState("http://83.168.106.220:21001");
  const [serverKey, setServerKey] = useState("change_me");
  const [isTikTokConnected, setIsTikTokConnected] = useState(false);
  const [isServerTapConnected, setIsServerTapConnected] = useState(false);
  const [message, setMessage] = useState(null);

  const socketRef = useRef(null);

  const [giftsText, setGiftsText] = useState(`{
  "5479": [
    "execute as @a at @s run summon zombie ~ ~ ~ {CustomName:'{\\"text\\":\\"{nickname}\\"}',CustomNameVisible:1b}",
    "title @a title {\\"text\\":\\"🎁 TEST\\",\\"color\\":\\"red\\",\\"bold\\":true}"
  ]
}`);

  // --- 🔌 POŁĄCZENIE Z BACKENDEM (socket.io) ---
  useEffect(() => {
    const socket = io("/", { path: "/api/socket" });
    socketRef.current = socket;

    socket.on("connect", () => console.log("🟢 Połączono z backendem"));
    socket.on("tiktokConnected", (u) => {
      setIsTikTokConnected(true);
      setMessage({ type: "success", text: `✅ Połączono z TikTok Live: ${u}` });
    });
    socket.on("tiktokDisconnected", () => {
      setIsTikTokConnected(false);
      setMessage({ type: "error", text: "❌ Rozłączono z TikTok Live" });
    });

    socket.on("gift", async (data) => {
      const gifts = JSON.parse(giftsText);
      const giftId = data.giftId?.toString();
      const nickname = data.user?.uniqueId;

      if (gifts[giftId]) {
        for (let cmd of gifts[giftId]) {
          cmd = cmd.replace(/{nickname}/g, nickname);
          await sendCommandToServerTap(cmd);
        }
      }
    });

    return () => socket.disconnect();
  }, [giftsText]);

  function connectTikTok() {
    socketRef.current.emit("connectTikTok", username);
  }

  // --- 🧪 TEST TRIGGER ---
  async function testTrigger() {
    if (!isServerTapConnected) {
      setMessage({ type: "error", text: "Brak połączenia z ServerTap!" });
      return;
    }
    const command =
      'execute as @a at @s run summon zombie ~ ~ ~ {CustomName:\'{"text":"TEST ZOMBIE"}\',CustomNameVisible:1b}';
    await sendCommandToServerTap(command);
  }

  // --- WYSYŁANIE KOMEND DO SERVERTAP ---
  async function sendCommandToServerTap(command) {
    try {
      const body = new URLSearchParams({ command, time: "" });
      const res = await fetch(`${serverTapUrl}/v1/server/exec`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          key: serverKey,
        },
        body,
      });

      if (res.ok) {
        setMessage({ type: "success", text: "✅ Komenda wysłana!" });
      } else {
        setMessage({ type: "error", text: "⚠️ Błąd wysyłania komendy." });
      }
    } catch (err) {
      setMessage({ type: "error", text: "❌ Brak połączenia z ServerTap." });
    }
  }

  async function connectServerTap() {
    try {
      const resp = await fetch(`${serverTapUrl}/v1/server`, { headers: { key: serverKey } });
      if (resp.ok) {
        setIsServerTapConnected(true);
        setMessage({ type: "success", text: "✅ Połączono z ServerTap!" });
      } else {
        setIsServerTapConnected(false);
        setMessage({ type: "error", text: "❌ Nie udało się połączyć z ServerTap." });
      }
    } catch {
      setMessage({ type: "error", text: "❌ Błąd podczas łączenia z ServerTap." });
    }
  }

  // --- UI ---
  return (
    <div style={{ display: "flex", width: "100vw", height: "100vh", background: "#0b1220", color: "white" }}>
      <aside style={{ width: 220, background: "#111827", padding: 20 }}>
        <h2>🎮 TikTok Tools</h2>
        <button onClick={() => setActiveTab("connect")}>🔗 Connect</button>
        <button onClick={() => setActiveTab("gifts")}>🎁 Gifts</button>
      </aside>

      <main style={{ flex: 1, padding: 20 }}>
        {activeTab === "connect" && (
          <div>
            <h3>Połączenia</h3>
            <p>TikTok Username:</p>
            <input value={username} onChange={(e) => setUsername(e.target.value)} />
            <button onClick={connectTikTok}>Połącz z TikTok</button>

            <p>ServerTap URL:</p>
            <input value={serverTapUrl} onChange={(e) => setServerTapUrl(e.target.value)} />
            <p>Server Key:</p>
            <input value={serverKey} onChange={(e) => setServerKey(e.target.value)} />
            <button onClick={connectServerTap}>Połącz z ServerTap</button>
          </div>
        )}

        {activeTab === "gifts" && (
          <div>
            <h3>🎁 Gift Trigger</h3>
            <p>
              🔗 Lista ID:{" "}
              <a href="https://tapujemy.pl/gifts" target="_blank" style={{ color: "#22d3ee" }}>
                tapujemy.pl/gifts
              </a>
            </p>
            <textarea rows={10} value={giftsText} onChange={(e) => setGiftsText(e.target.value)} />
            <button onClick={testTrigger}>🧪 Testuj Trigger</button>
          </div>
        )}

        {message && (
          <div style={{ marginTop: 10, color: message.type === "error" ? "red" : "lightgreen" }}>
            {message.text}
          </div>
        )}
      </main>
    </div>
  );
}
