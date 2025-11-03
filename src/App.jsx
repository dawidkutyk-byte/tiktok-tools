import React, { useEffect, useState, useRef } from "react";
import io from "socket.io-client";

export default function App() {
  const [activeTab, setActiveTab] = useState("connect");

  // --- Connect form ---
  const [username, setUsername] = useState("widow_og");
  const [serverTapUrl, setServerTapUrl] = useState("http://83.168.106.220:21001");
  const [serverKey, setServerKey] = useState("change_me");
  const [wsUrl, setWsUrl] = useState("http://localhost:4000");

  // --- Gifts ---
  const [giftsText, setGiftsText] = useState(`{
  "5479": [
    "execute as @a at @s run summon zombie ~ ~ ~ {DragonPhase:0,CustomName:'{\\"text\\":\\"{nickname}\\"}',CustomNameVisible:1b,Invisible:1b,Marker:1b}",
    "title @a title {\\"text\\":\\"🎁 TEST\\",\\"color\\":\\"red\\",\\"bold\\":true}",
    "title @a subtitle {\\"text\\":\\"{nickname} TEST\\",\\"color\\":\\"blue\\",\\"italic\\":true}"
  ]
}`);

  // --- TTS Chat ---
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [voices, setVoices] = useState([]);
  const [voiceName, setVoiceName] = useState("");
  const [rate, setRate] = useState(1);
  const [pitch, setPitch] = useState(1);
  const [volume, setVolume] = useState(1);
  const socketRef = useRef(null);

  // Load voices
  useEffect(() => {
    function loadVoices() {
      const v = window.speechSynthesis.getVoices();
      setVoices(v);
      if (v.length && !voiceName) setVoiceName(v[0].name);
    }
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, [voiceName]);

  // Handle TTS connection
  useEffect(() => {
    if (!ttsEnabled) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setConnected(false);
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
        speakText(`${nick} mówi: ${text}`);
      });

      return () => socket.disconnect();
    } catch (err) {
      console.error("Socket error:", err);
    }
  }, [ttsEnabled, wsUrl]);

  // --- Speech ---
  function speakText(text) {
    if (!ttsEnabled || !window.speechSynthesis) return;
    const u = new SpeechSynthesisUtterance(text);
    u.rate = rate;
    u.pitch = pitch;
    u.volume = volume;
    if (voiceName) {
      const v = voices.find((x) => x.name === voiceName);
      if (v) u.voice = v;
    }
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }

  // --- Connect handler ---
  function handleConnect() {
    setTtsEnabled(true);
    setActiveTab("tts");
  }

  return (
    <div style={{ display: "flex", height: "100vh", width: "100vw", fontFamily: 'Inter, ui-sans-serif, system-ui' }}>
      {/* Sidebar */}
      <aside style={{ width: 240, background: "#111827", color: "white", padding: 20 }}>
        <h1 style={{ fontSize: 20, marginBottom: 20 }}>🎮 TikTok Tools</h1>
        <button onClick={() => setActiveTab("connect")} style={{ width: "100%", marginBottom: 8 }}>🔌 Connect</button>
        <button onClick={() => setActiveTab("gifts")} style={{ width: "100%", marginBottom: 8 }}>🎁 Gifts</button>
        <button onClick={() => setActiveTab("tts")} style={{ width: "100%" }}>🗣️ TTS Chat</button>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, padding: 24, background: '#0b1220', color: '#e6edf3', overflowY: 'auto' }}>
        {/* Connect tab */}
        {activeTab === "connect" && (
          <div>
            <h2>🔌 Połącz z ServerTap i TTS</h2>
            <p>Login do pluginu</p>
            <label>TikTok username:</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)} style={{ width: "100%", marginBottom: 10 }} />
            <p>ServerTap URL:</p>
            <input value={serverTapUrl} onChange={(e) => setServerTapUrl(e.target.value)} style={{ width: "100%", marginBottom: 10 }} />
            <p>Server Key:</p>
            <input value={serverKey} onChange={(e) => setServerKey(e.target.value)} style={{ width: "100%", marginBottom: 10 }} />
            <p>Socket URL:</p>
            <input value={wsUrl} onChange={(e) => setWsUrl(e.target.value)} style={{ width: "100%", marginBottom: 10 }} />
            <button onClick={handleConnect} style={{ background: '#10b981', border: 'none', padding: '10px 16px', borderRadius: 6, color: 'white' }}>Połącz</button>
          </div>
        )}

        {/* Gifts tab */}
        {activeTab === "gifts" && (
          <div>
            <h2>🎁 Gifts Config</h2>
            <h4 style={{ marginTop: 20 }}>🌐 Strona z ID giftami:</h4>
            <a href="https://tapujemy.pl/gifts" target="_blank" rel="noreferrer" style={{ color: "#22d3ee" }}>
              https://tapujemy.pl/gifts
            </a>
            <h4 style={{ marginTop: 20 }}>Gift Trigger</h4>
            <textarea
              rows={12}
              value={giftsText}
              onChange={(e) => setGiftsText(e.target.value)}
              style={{ width: "100%", marginTop: 10, borderRadius: 8, padding: 10 }}
            />
          </div>
        )}

        {/* TTS tab */}
        {activeTab === "tts" && (
          <div>
            <h2>🗣️ TTS Chat</h2>
            <button onClick={() => setTtsEnabled(!ttsEnabled)} style={{ background: ttsEnabled ? '#ef4444' : '#10b981', border: 'none', padding: '10px 16px', borderRadius: 6, color: 'white', marginBottom: 10 }}>
              {ttsEnabled ? "Wyłącz TTS" : "Włącz TTS"}
            </button>
            <p>Status: {connected ? "🟢 Połączono" : "🔴 Rozłączono"}</p>
            <label>Wybierz głos:</label>
            <select value={voiceName} onChange={(e) => setVoiceName(e.target.value)} style={{ width: "100%", marginBottom: 10 }}>
              {voices.map((v) => (
                <option key={v.name}>{v.name}</option>
              ))}
            </select>

            <div style={{ maxHeight: "60vh", overflowY: "auto", background: "#1e293b", padding: 10, borderRadius: 8 }}>
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

