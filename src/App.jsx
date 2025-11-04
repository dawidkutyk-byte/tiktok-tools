import React, { useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import TikTokLiveConnector from "tiktok-live-connector";

export default function App() {
  const [activeTab, setActiveTab] = useState("connect");
  const [username, setUsername] = useState("widow_og");
  const [serverTapUrl, setServerTapUrl] = useState("http://83.168.106.220:21001");
  const [serverKey, setServerKey] = useState("change_me");
  const [wsUrl, setWsUrl] = useState("ws://localhost:4000");

  const [isTikTokConnected, setIsTikTokConnected] = useState(false);
  const [isServerTapConnected, setIsServerTapConnected] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [connected, setConnected] = useState(false);
  const [message, setMessage] = useState(null);
  const socketRef = useRef(null);
  const tiktokRef = useRef(null);

  const [giftsText, setGiftsText] = useState(`{
  "5479": [
    "execute as @a at @s run summon zombie ~ ~ ~ {DragonPhase:0,CustomName:'{\\"text\\":\\"{nickname}\\"}',CustomNameVisible:1b,Invisible:1b,Marker:1b}",
    "title @a title {\\"text\\":\\"🎁 TEST\\",\\"color\\":\\"red\\",\\"bold\\":true}",
    "title @a subtitle {\\"text\\":\\"{nickname} TEST\\",\\"color\\":\\"blue\\",\\"italic\\":true}"
  ]
}`);

  // --- 🟣 POŁĄCZENIE Z TIKTOK LIVE ---
  async function connectTikTok() {
    setMessage({ type: "info", text: "Łączenie z TikTok Live..." });
    try {
      const { TikTokLiveConnection } = await import("tiktok-live-connector");
      const tiktok = new TikTokLiveConnection(username);
      tiktokRef.current = tiktok;

      tiktok.connect().then((state) => {
        setIsTikTokConnected(true);
        setMessage({ type: "success", text: `✅ Połączono z LIVE TikToka: ${username}` });
      });

      tiktok.on("gift", async (data) => {
        const gifts = JSON.parse(giftsText);
        const giftId = data.giftId?.toString();
        const nickname = data.user.uniqueId;
        const repeatcount = data.repeatCount || 1;
        const giftname = data.giftName || "prezent";

        if (gifts[giftId]) {
          const commands = Array.isArray(gifts[giftId]) ? gifts[giftId] : [gifts[giftId]];
          for (let command of commands) {
            command = command
              .replace(/{nickname}/g, nickname)
              .replace(/{repeatcount}/g, repeatcount)
              .replace(/{giftname}/g, giftname);
            await sendCommandToServerTap(command);
          }
        }
      });

      tiktok.on("disconnected", () => {
        setIsTikTokConnected(false);
        setMessage({ type: "error", text: "❌ Rozłączono z TikTok Live" });
      });
    } catch (err) {
      console.error("TikTok error:", err);
      setMessage({ type: "error", text: "Błąd połączenia z TikTok Live." });
    }
  }

  // --- 🟢 POŁĄCZENIE Z SERVERTAP ---
  async function connectServerTap() {
    setMessage({ type: "info", text: "Sprawdzanie połączenia z ServerTap..." });
    try {
      const resp = await fetch(`${serverTapUrl}/v1/server`, {
        headers: { key: serverKey },
      });
      if (resp.ok) {
        setIsServerTapConnected(true);
        setMessage({ type: "success", text: "✅ Połączono z ServerTap!" });
      } else {
        setIsServerTapConnected(false);
        setMessage({ type: "error", text: "Nie udało się połączyć z ServerTap." });
      }
    } catch {
      setIsServerTapConnected(false);
      setMessage({ type: "error", text: "Błąd podczas łączenia z ServerTap." });
    }
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

  // --- 💥 FUNKCJA WYSYŁANIA KOMEND DO SERVERTAP ---
  async function sendCommandToServerTap(command) {
    try {
      const formData = new URLSearchParams();
      formData.append("command", command);
      formData.append("time", "");

      const res = await fetch(`${serverTapUrl}/v1/server/exec`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          key: serverKey,
        },
        body: formData.toString(),
      });

      if (res.ok) {
        setMessage({ type: "success", text: "✅ Komenda wysłana do Minecrafta!" });
      } else {
        const errText = await res.text();
        setMessage({ type: "error", text: `⚠️ Błąd: ${errText}` });
      }
    } catch (err) {
      console.error("Błąd wysyłania:", err);
      setMessage({ type: "error", text: "❌ Nie udało się wysłać komendy (sprawdź CORS w ServerTap)." });
    }
  }

  // --- 🔊 TTS CHAT ---
  useEffect(() => {
    if (!ttsEnabled) {
      if (socketRef.current) socketRef.current.disconnect();
      setConnected(false);
      return;
    }

    const socket = io(wsUrl, { transports: ["websocket"] });
    socketRef.current = socket;

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    socket.on("chat", (data) => {
      const text = `${data.nickname} mówi: ${data.message}`;
      const u = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(u);
    });

    return () => socket.disconnect();
  }, [ttsEnabled, wsUrl]);

  // --- RENDER ---
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        background: "#0b1220",
        color: "#e6edf3",
        fontFamily: "Inter, sans-serif",
      }}
    >
      <aside style={{ width: 240, background: "#111827", color: "white", padding: 20 }}>
        <h1 style={{ fontSize: 20, marginBottom: 20 }}>🎮 TikTok Tools</h1>
        <button onClick={() => setActiveTab("connect")} style={{ width: "100%", marginBottom: 8 }}>
          🔗 Connect
        </button>
        <button onClick={() => setActiveTab("gifts")} style={{ width: "100%", marginBottom: 8 }}>
          🎁 Gifts
        </button>
        <button onClick={() => setActiveTab("tts")} style={{ width: "100%" }}>
          🗣️ TTS Chat
        </button>
      </aside>

      <main style={{ flex: 1, padding: 24, overflowY: "auto" }}>
        {activeTab === "connect" && (
          <div>
            <h2>🔗 Połączenia</h2>
            <p>TikTok username:</p>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{ width: "100%", marginBottom: 8 }}
            />
            <button onClick={connectTikTok} style={{ background: "#0ea5a4", padding: 8, borderRadius: 6 }}>
              Połącz z TikTok
            </button>

            <p style={{ marginTop: 20 }}>ServerTap URL:</p>
            <a
              href="https://github.com/TimeCodings/servertap/releases/download/v0.5.4/ServerTap-0.5.4-SNAPSHOT.jar"
              style={{ color: "#22d3ee", fontSize: 14 }}
              target="_blank"
            >
              📦 Pobierz plugin ServerTap
            </a>
            <input
              value={serverTapUrl}
              onChange={(e) => setServerTapUrl(e.target.value)}
              style={{ width: "100%", marginBottom: 8 }}
            />
            <p>Server Key:</p>
            <input
              value={serverKey}
              onChange={(e) => setServerKey(e.target.value)}
              style={{ width: "100%", marginBottom: 8 }}
            />
            <button onClick={connectServerTap} style={{ background: "#0ea5a4", padding: 8, borderRadius: 6 }}>
              Połącz z ServerTap
            </button>
          </div>
        )}

        {activeTab === "gifts" && (
          <div>
            <h2>🎁 Gift Trigger</h2>
            <p>
              🔗 Sprawdź ID giftów na stronie:{" "}
              <a href="https://tapujemy.pl/gifts" target="_blank" style={{ color: "#22d3ee" }}>
                https://tapujemy.pl/gifts
              </a>
            </p>
            <p>Limit: <b>MAX 10 INTERAKCJI</b></p>

            <p>📄 Stały testowy trigger:</p>
            <textarea
              readOnly
              rows={4}
              value={`{
  "5479": [
    "execute as @a at @s run summon zombie ~ ~ ~ {DragonPhase:0,CustomName:'{\\"text\\":\\"{nickname}\\"}',CustomNameVisible:1b,Invisible:1b,Marker:1b}",
    "title @a title {\\"text\\":\\"🎁 TEST\\",\\"color\\":\\"red\\",\\"bold\\":true}"
  ]
}`}
              style={{ width: "100%", background: "#1e293b", color: "#22d3ee", marginBottom: 10 }}
            />
            <button onClick={testTrigger} style={{ background: "#10b981", padding: 8, borderRadius: 6 }}>
              🧪 Testuj Trigger
            </button>

            <hr style={{ margin: "20px 0", opacity: 0.3 }} />

            <p>🎨 Edytowalne ID Gift:</p>
            <textarea
              rows={10}
              maxLength={2000}
              value={giftsText}
              onChange={(e) => setGiftsText(e.target.value)}
              style={{ width: "100%" }}
            />
          </div>
        )}

        {activeTab === "tts" && (
          <div>
            <h2>🗣️ TTS Chat</h2>
            <button onClick={() => setTtsEnabled(!ttsEnabled)}>
              {ttsEnabled ? "Wyłącz TTS" : "Włącz TTS"}
            </button>
            <p>Status: {connected ? "🟢 Połączono z czatem" : "🔴 Niepołączono"}</p>
          </div>
        )}

        {message && (
          <div style={{ marginTop: 20, color: message.type === "error" ? "red" : "lightgreen" }}>
            {message.text}
          </div>
        )}
      </main>
    </div>
  );
}
