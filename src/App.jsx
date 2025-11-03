import React, { useEffect, useState, useRef } from "react";
import io from "socket.io-client";

export default function App() {
  const [activeTab, setActiveTab] = useState("gifts");
  const [username, setUsername] = useState("widow_og");
  const [serverTapUrl, setServerTapUrl] = useState("http://83.168.106.220:21001");
  const [serverKey, setServerKey] = useState("change_me");
  const [wsUrl, setWsUrl] = useState("http://localhost:4000");

  const [giftsText, setGiftsText] = useState(`{
  "5479": [
    "execute as @a at @s run summon zombie ~ ~ ~ {DragonPhase:0,CustomName:'{\\"text\\":\\"{nickname}\\"}',CustomNameVisible:1b,Invisible:1b,Marker:1b}",
    "title @a title {\\"text\\":\\"🎁 TEST\\",\\"color\\":\\"red\\",\\"bold\\":true}",
    "title @a subtitle {\\"text\\":\\"{nickname} TEST\\",\\"color\\":\\"blue\\",\\"italic\\":true}"
  ]
}`);
  const [message, setMessage] = useState(null);

  // --- TTS (text to speech) ---
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [rate, setRate] = useState(1);
  const [pitch, setPitch] = useState(1);
  const [volume, setVolume] = useState(1);
  const [voiceName, setVoiceName] = useState("");
  const [voices, setVoices] = useState([]);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const socketRef = useRef(null);

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
        speakText(`${nick} mówi: ${text}`);
      });

      return () => socket.disconnect();
    } catch (err) {
      console.error("Socket error:", err);
    }
  }, [ttsEnabled, wsUrl]);

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

  function download(filename, content) {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "sans-serif" }}>
      <aside style={{ width: 240, background: "#111827", color: "white", padding: 20 }}>
        <h1 style={{ fontSize: 20 }}>🎮 TikTok Tools</h1>
        <button onClick={() => setActiveTab("gifts")} style={{ width: "100%", marginBottom: 8 }}>🎁 Gifts</button>
        <button onClick={() => setActiveTab("tts")} style={{ width: "100%" }}>🗣️ TTS Chat</button>
        <div style={{ marginTop: 20 }}>
          <a href="https://tapujemy.pl/gifts" target="_blank" rel="noreferrer" style={{ color: "#22d3ee" }}>
            🌐 Strona z ID giftami
          </a>
        </div>
      </aside>

      <main style={{ flex: 1, padding: 24, background: "#0b1220", color: "white" }}>
        {activeTab === "gifts" && (
          <div>
            <h2>🎁 Gifts Config</h2>
            <label>TikTok username</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)} />
            <p>ServerTap URL:</p>
            <input value={serverTapUrl} onChange={(e) => setServerTapUrl(e.target.value)} />
            <p>Server Key:</p>
            <input value={serverKey} onChange={(e) => setServerKey(e.target.value)} />
            <p>Socket URL:</p>
            <input value={wsUrl} onChange={(e) => setWsUrl(e.target.value)} />

            <textarea
              rows={10}
              value={giftsText}
              onChange={(e) => setGiftsText(e.target.value)}
              style={{ width: "100%", marginTop: 10 }}
            />
          </div>
        )}

        {activeTab === "tts" && (
          <div>
            <h2>🗣️ TTS Chat</h2>
            <button onClick={() => setTtsEnabled(!ttsEnabled)}>
              {ttsEnabled ? "Wyłącz TTS" : "Włącz TTS"}
            </button>
            <div style={{ marginTop: 10 }}>
              <p>Status: {connected ? "🟢 Połączono" : "🔴 Brak połączenia"}</p>
              <select value={voiceName} onChange={(e) => setVoiceName(e.target.value)}>
                {voices.map((v) => (
                  <option key={v.name}>{v.name}</option>
                ))}
              </select>
              <div style={{ marginTop: 10 }}>
                {messages.map((m, i) => (
                  <div key={i}>
                    <b>{m.nick}</b>: {m.text}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
