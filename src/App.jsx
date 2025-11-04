import React, { useState, useEffect, useRef } from "react";
import io from "socket.io-client";

export default function App() {
  const [activeTab, setActiveTab] = useState("connect");
  const [username, setUsername] = useState("");
  const [serverTapUrl, setServerTapUrl] = useState("http://83.168.106.220:21001");
  const [serverKey, setServerKey] = useState("change_me");
  const [message, setMessage] = useState(null);

  const [isTikTokConnected, setIsTikTokConnected] = useState(false);
  const [isServerTapConnected, setIsServerTapConnected] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [connected, setConnected] = useState(false);

  const [giftsText, setGiftsText] = useState(`{
  "5479": [
    "execute as @a at @s run summon zombie ~ ~ ~ {CustomName:'{\\"text\\":\\"{nickname}\\"}',CustomNameVisible:1b}",
    "title @a title {\\"text\\":\\"🎁 TEST GIFTS\\",\\"color\\":\\"gold\\",\\"bold\\":true}"
  ]
}`);

  const socketRef = useRef(null);

  // ✅ Połączenie z TikTok Live (sprawdza, czy live istnieje)
  async function connectTikTok() {
    if (!username) return setMessage({ type: "error", text: "Podaj nazwę użytkownika TikTok!" });
    setMessage({ type: "info", text: "Sprawdzanie transmisji LIVE..." });

    try {
      const resp = await fetch(`https://www.tiktok.com/@${username}/live`);
      const html = await resp.text();
      if (html.includes('"roomId"')) {
        setIsTikTokConnected(true);
        setMessage({ type: "success", text: `Połączono z LIVE TikToka: ${username}` });
      } else {
        setIsTikTokConnected(false);
        setMessage({ type: "error", text: `Użytkownik ${username} nie prowadzi aktualnie LIVE.` });
      }
    } catch (err) {
      setIsTikTokConnected(false);
      setMessage({ type: "error", text: "Nie udało się połączyć z TikTok." });
    }
  }

  // ✅ Połączenie z ServerTap
  async function connectServerTap() {
    setMessage({ type: "info", text: "Sprawdzanie połączenia z ServerTap..." });
    try {
      const resp = await fetch(`${serverTapUrl}/v1/server`, {
        headers: { key: serverKey },
      });
      if (resp.ok) {
        setIsServerTapConnected(true);
        setMessage({ type: "success", text: "Połączono z ServerTap!" });
      } else {
        throw new Error("Odpowiedź serwera: " + resp.status);
      }
    } catch (err) {
      setIsServerTapConnected(false);
      setMessage({ type: "error", text: "Nie udało się połączyć z ServerTap." });
    }
  }

  // ✅ Testowy trigger (sprawdza, czy komendy się wykonują)
  async function testTrigger() {
    if (!isServerTapConnected) {
      setMessage({ type: "error", text: "Brak połączenia z ServerTap!" });
      return;
    }

    const command = 'execute as @a at @s run summon zombie ~ ~ ~ {CustomName:\'{"text":"TEST"}\',CustomNameVisible:1b}';
    try {
      const res = await fetch("/api/servertap?action=send-command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command, serverTapUrl, serverKey }),
      });
      const data = await res.json();
      setMessage({ type: "success", text: data.message || "✅ Komenda wysłana pomyślnie!" });
    } catch {
      setMessage({ type: "error", text: "❌ Błąd połączenia z API!" });
    }
  }

  // ✅ TTS CHAT (czytanie wiadomości na głos)
  useEffect(() => {
    if (!ttsEnabled) {
      if (socketRef.current) socketRef.current.disconnect();
      setConnected(false);
      return;
    }

    const socket = io("wss://tiktok-chat-server.onrender.com", { transports: ["websocket"] });
    socketRef.current = socket;

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    socket.on("chat", (data) => {
      const text = `${data.nickname} mówi: ${data.comment}`;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "pl-PL";
      window.speechSynthesis.speak(utterance);
    });

    return () => socket.disconnect();
  }, [ttsEnabled]);

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        backgroundColor: "#0f172a",
        color: "#f8fafc",
        fontFamily: "Inter, sans-serif",
      }}
    >
      {/* LEWE MENU */}
      <aside
        style={{
          width: 240,
          backgroundColor: "#111827",
          padding: 20,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <h2 style={{ fontSize: 20, fontWeight: "bold", marginBottom: 20 }}>🎮 TikTok Tools</h2>
        <button onClick={() => setActiveTab("connect")} style={{ padding: 10 }}>
          🔗 Connect
        </button>
        <button onClick={() => setActiveTab("gifts")} style={{ padding: 10 }}>
          🎁 Gifts
        </button>
        <button onClick={() => setActiveTab("tts")} style={{ padding: 10 }}>
          🗣️ TTS Chat
        </button>
      </aside>

      {/* PRAWA STRONA */}
      <main style={{ flex: 1, padding: 30, overflowY: "auto" }}>
        {activeTab === "connect" && (
          <div>
            <h2>🔗 Połączenia</h2>
            <p>TikTok username:</p>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="@twoj_nick"
              style={{ width: "100%", marginBottom: 10 }}
            />
            <button onClick={connectTikTok} style={{ padding: 10, background: "#0ea5a4" }}>
              Połącz z TikTok
            </button>

            <p style={{ marginTop: 20 }}>ServerTap URL:</p>
            <input
              value={serverTapUrl}
              onChange={(e) => setServerTapUrl(e.target.value)}
              style={{ width: "100%", marginBottom: 10 }}
            />
            <p>Server Key:</p>
            <input
              value={serverKey}
              onChange={(e) => setServerKey(e.target.value)}
              style={{ width: "100%", marginBottom: 10 }}
            />
            <button onClick={connectServerTap} style={{ padding: 10, background: "#0ea5a4" }}>
              Połącz z ServerTap
            </button>
          </div>
        )}

        {activeTab === "gifts" && (
          <div>
            <h2>🎁 Gifts</h2>
            <p>
              Limit: <b>MAX 10 INTERAKCJI</b>
            </p>
            <a
              href="https://tapujemy.pl/gifts"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#38bdf8", fontSize: 14 }}
            >
              🔗 Zobacz listę ID Giftów
            </a>

            <h3 style={{ marginTop: 20 }}>📄 Stały testowy trigger</h3>
            <textarea
              readOnly
              rows={4}
              value={`{
  "5479": [
    "execute as @a at @s run summon zombie ~ ~ ~ {CustomName:'{\\"text\\":\\"TEST\\"}',CustomNameVisible:1b}"
  ]
}`}
              style={{ width: "100%", background: "#1e293b", color: "#22d3ee", marginBottom: 10 }}
            />
            <button onClick={testTrigger} style={{ background: "#10b981", padding: 8, borderRadius: 6 }}>
              🧪 Testuj Trigger
            </button>

            <hr style={{ margin: "20px 0", opacity: 0.3 }} />

            <h3>🎨 Edytowalne interakcje Giftów</h3>
            <textarea
              rows={10}
              value={giftsText}
              onChange={(e) => setGiftsText(e.target.value)}
              style={{ width: "100%", background: "#1e293b", color: "#e2e8f0" }}
            />
          </div>
        )}

        {activeTab === "tts" && (
          <div>
            <h2>🗣️ TTS Chat</h2>
            <button onClick={() => setTtsEnabled(!ttsEnabled)} style={{ padding: 10, background: "#0ea5a4" }}>
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
