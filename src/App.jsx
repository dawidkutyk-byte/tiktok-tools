import React, { useEffect, useState, useRef } from "react";
import io from "socket.io-client";

export default function App() {
  // --- STANY OGÓLNE ---
  const [activeTab, setActiveTab] = useState("connect");
  const [username, setUsername] = useState("widow_og");
  const [serverTapUrl, setServerTapUrl] = useState("http://83.168.106.220:21001");
  const [serverKey, setServerKey] = useState("change_me");
  const [wsUrl, setWsUrl] = useState("http://localhost:4000");
  const [message, setMessage] = useState(null);

  // --- POŁĄCZENIA ---
  const [tiktokConnected, setTiktokConnected] = useState(false);
  const [serverTapConnected, setServerTapConnected] = useState(false);

  // --- GIFTY ---
  const [giftsText, setGiftsText] = useState(`{
  "5479": [
    "execute as @a at @s run summon zombie ~ ~ ~ {DragonPhase:0,CustomName:'{\\"text\\":\\"{nickname}\\"}',CustomNameVisible:1b,Invisible:1b,Marker:1b}",
    "title @a title {\\"text\\":\\"🎁 TEST\\",\\"color\\":\\"red\\",\\"bold\\":true}",
    "title @a subtitle {\\"text\\":\\"{nickname} TEST\\",\\"color\\":\\"blue\\",\\"italic\\":true}"
  ]
}`);

  // --- TTS ---
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [voices, setVoices] = useState([]);
  const [voiceName, setVoiceName] = useState("");
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const socketRef = useRef(null);

  // --- ŁADOWANIE GŁOSÓW ---
  useEffect(() => {
    function loadVoices() {
      const v = window.speechSynthesis.getVoices();
      setVoices(v);
      if (v.length && !voiceName) setVoiceName(v[0].name);
    }
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => (window.speechSynthesis.onvoiceschanged = null);
  }, [voiceName]);

  // --- POŁĄCZENIE Z TTS SOCKETEM ---
  useEffect(() => {
    if (!ttsEnabled) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setConnected(false);
      }
      return;
    }

    try {
      const socket = io(wsUrl, { transports: ["websocket"] });
      socketRef.current = socket;

      socket.on("connect", () => setConnected(true));
      socket.on("disconnect", () => setConnected(false));

      socket.on("chat", (data) => {
        const nick = data.nickname || "Anon";
        const text = data.message || "";
        setMessages((m) => [{ nick, text }, ...m].slice(0, 100));
        if (ttsEnabled && window.speechSynthesis) speakText(`${nick} mówi: ${text}`);
      });

      return () => socket.disconnect();
    } catch (err) {
      console.error("Socket error:", err);
    }
  }, [ttsEnabled, wsUrl]);

  // --- FUNKCJE ---
  async function handleConnectTikTok() {
    try {
      const res = await fetch(`https://tiktok.livecountapi.com/user/${username}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.user) {
          setTiktokConnected(true);
          setMessage({ type: "success", text: "✅ TikTok Live jest aktywny!" });
        } else {
          setTiktokConnected(false);
          setMessage({ type: "error", text: "❌ Nie znaleziono transmisji na żywo." });
        }
      } else {
        setMessage({ type: "error", text: "❌ Nie udało się połączyć z TikTok." });
      }
    } catch (err) {
      console.error("TikTok connection error:", err);
      setMessage({ type: "error", text: "❌ Błąd połączenia z TikTok." });
    }
  }

  async function handleConnectServerTap() {
    try {
      const res = await fetch(`${serverTapUrl}/v1/server`, {
        headers: { key: serverKey },
      });
      if (res.ok) {
        setServerTapConnected(true);
        setMessage({ type: "success", text: "✅ Połączono z ServerTap!" });
      } else {
        setServerTapConnected(false);
        setMessage({ type: "error", text: "❌ Nie udało się połączyć z ServerTap." });
      }
    } catch (err) {
      console.error("ServerTap error:", err);
      setServerTapConnected(false);
      setMessage({ type: "error", text: "❌ Błąd połączenia z ServerTap." });
    }
  }

  function speakText(text) {
    const u = new SpeechSynthesisUtterance(text);
    const voice = voices.find((v) => v.name === voiceName);
    if (voice) u.voice = voice;
    window.speechSynthesis.speak(u);
  }

  async function triggerTestGift() {
    const commands = [
      "execute as @a at @s run summon zombie ~ ~ ~ {CustomName:'{\"text\":\"TestUser\"}',CustomNameVisible:1b}",
      "title @a title {\"text\":\"🎁 TEST\",\"color\":\"red\"}",
      "title @a subtitle {\"text\":\"Testowy gift działa!\",\"color\":\"blue\"}"
    ];

    try {
      for (const c of commands) {
        console.log("Wysyłam komendę:", c);
        const res = await fetch(`${serverTapUrl}/v1/server/exec`, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            key: serverKey,
          },
          body: new URLSearchParams({ command: c, time: "" }),
        });
        console.log("Status odpowiedzi:", res.status);
      }
      setMessage({ type: "success", text: "✅ Testowy gift został wywołany!" });
    } catch (err) {
      console.error("Gift trigger error:", err);
      setMessage({ type: "error", text: "❌ Nie udało się wysłać testowego giftu." });
    }
  }

  // --- WIDOK ---
  return (
    <div style={{ display: "flex", height: "100vh", width: "100vw", fontFamily: "Inter, sans-serif" }}>
      <aside style={{ width: 240, background: "#111827", color: "white", padding: 20 }}>
        <h1 style={{ fontSize: 20 }}>🎮 TikTok Tools</h1>
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

      <main
        style={{
          flex: 1,
          padding: 24,
          background: "#0b1220",
          color: "#e6edf3",
          overflowY: "auto",
        }}
      >
        {message && (
          <div
            style={{
              background: message.type === "success" ? "#064e3b" : "#7f1d1d",
              color: "white",
              padding: "10px 16px",
              marginBottom: 16,
              borderRadius: 8,
            }}
          >
            {message.text}
          </div>
        )}

        {/* CONNECT */}
        {activeTab === "connect" && (
          <div>
            <h2>🔗 Connect</h2>
            <p>Login do pluginu</p>
            <label>TikTok username:</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{ display: "block", marginBottom: 10, width: "100%" }}
            />
            <button onClick={handleConnectTikTok} style={{ background: "#2563eb", padding: "8px 12px", borderRadius: 6, color: "white" }}>
              Połącz z TikTok Live
            </button>

            <p style={{ marginTop: 20 }}>ServerTap URL:</p>
            <input
              value={serverTapUrl}
              onChange={(e) => setServerTapUrl(e.target.value)}
              style={{ display: "block", marginBottom: 10, width: "100%" }}
            />
            <p>Server Key:</p>
            <input
              value={serverKey}
              onChange={(e) => setServerKey(e.target.value)}
              style={{ display: "block", marginBottom: 10, width: "100%" }}
            />
            <a
              href="https://github.com/TimeCodings/servertap/releases/download/v0.5.4/ServerTap-0.5.4-SNAPSHOT.jar"
              target="_blank"
              rel="noreferrer"
              style={{ color: "#22d3ee" }}
            >
              📥 Pobierz plugin ServerTap
            </a>

            <div style={{ marginTop: 10 }}>
              <button onClick={handleConnectServerTap} style={{ background: "#059669", padding: "8px 12px", borderRadius: 6, color: "white" }}>
                Połącz z ServerTap
              </button>
              <p style={{ marginTop: 8 }}>
                Status:{" "}
                {serverTapConnected ? "🟢 Połączono" : "🔴 Niepołączono"}
              </p>
            </div>
          </div>
        )}

        {/* GIFTS */}
        {activeTab === "gifts" && (
          <div>
            <h2>🎁 Gift Trigger</h2>
            <p>LIMIT 10 INTERAKCJI</p>
            <a
              href="https://tapujemy.pl/gifts"
              target="_blank"
              rel="noreferrer"
              style={{ color: "#22d3ee" }}
            >
              🌐 Strona z ID giftami
            </a>
            <textarea
              rows={10}
              value={giftsText}
              onChange={(e) => setGiftsText(e.target.value)}
              style={{
                width: "100%",
                marginTop: 10,
                fontFamily: "monospace",
                background: "#1e293b",
                color: "white",
                border: "1px solid #334155",
                borderRadius: 6,
                padding: 10,
              }}
            />
            <button onClick={triggerTestGift} style={{ marginTop: 10, background: "#9333ea", padding: "8px 12px", borderRadius: 6, color: "white" }}>
              🔥 Uruchom testowy gift
            </button>
          </div>
        )}

        {/* TTS CHAT */}
        {activeTab === "tts" && (
          <div>
            <h2>🗣️ TTS Chat</h2>
            <button onClick={() => setTtsEnabled(!ttsEnabled)} style={{ background: "#2563eb", padding: "8px 12px", borderRadius: 6, color: "white" }}>
              {ttsEnabled ? "Wyłącz TTS" : "Włącz TTS"}
            </button>
            <p style={{ marginTop: 10 }}>Status: {connected ? "🟢 Połączono" : "🔴 Niepołączono"}</p>
            <select
              value={voiceName}
              onChange={(e) => setVoiceName(e.target.value)}
              style={{ display: "block", marginTop: 10, padding: 5 }}
            >
              {voices.map((v) => (
                <option key={v.name}>{v.name}</option>
              ))}
            </select>

            <div style={{ marginTop: 20, maxHeight: 300, overflowY: "auto" }}>
              {messages.map((m, i) => (
                <div key={i}>
                  <b>{m.nick}</b>: {m.text}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

