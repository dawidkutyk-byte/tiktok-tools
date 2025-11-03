import React, { useEffect, useState, useRef } from "react";
import io from "socket.io-client";

export default function App() {
  const [activeTab, setActiveTab] = useState("connect");

  // --- Config ---
  const [username, setUsername] = useState("widow_og");
  const [serverTapUrl, setServerTapUrl] = useState("http://83.168.106.220:21001");
  const [serverKey, setServerKey] = useState("change_me");
  const [wsUrl, setWsUrl] = useState("http://localhost:4000");

  // --- Statusy ---
  const [tiktokConnected, setTiktokConnected] = useState(false);
  const [serverTapConnected, setServerTapConnected] = useState(false);
  const [message, setMessage] = useState(null);

  // --- TTS ---
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [rate, setRate] = useState(1);
  const [pitch, setPitch] = useState(1);
  const [volume, setVolume] = useState(1);
  const [voiceName, setVoiceName] = useState("");
  const [voices, setVoices] = useState([]);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const socketRef = useRef(null);

  // --- Gifts ---
  const [giftsText, setGiftsText] = useState(`{
  "5479": [
    "execute as @a at @s run summon zombie ~ ~ ~ {DragonPhase:0,CustomName:'{\\"text\\":\\"{nickname}\\"}',CustomNameVisible:1b,Invisible:1b,Marker:1b}",
    "title @a title {\\"text\\":\\"🎁 TEST\\",\\"color\\":\\"red\\",\\"bold\\":true}",
    "title @a subtitle {\\"text\\":\\"{nickname} TEST\\",\\"color\\":\\"blue\\",\\"italic\\":true}"
  ]
}`);

  // === VOICES ===
  useEffect(() => {
    function loadVoices() {
      const v = window.speechSynthesis.getVoices();
      setVoices(v);
      if (v.length && !voiceName) setVoiceName(v[0].name);
    }
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, [voiceName]);

  // === TTS SOCKET ===
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
      const socket = io(wsUrl, { transports: ["websocket"], reconnectionAttempts: 3 });

      socketRef.current = socket;

      socket.on("connect", () => {
        console.log("✅ Połączono z serwerem TTS:", wsUrl);
        setConnected(true);
      });

      socket.on("connect_error", (err) => {
        console.error("❌ Błąd połączenia z TTS:", err.message);
        setConnected(false);
      });

      socket.on("disconnect", () => {
        console.log("🔴 Rozłączono z TTS");
        setConnected(false);
      });

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

  // === FUNKCJE ===
  function speakText(text) {
    if (!ttsEnabled || !window.speechSynthesis) return;
    const u = new SpeechSynthesisUtterance(text);
    u.rate = rate;
    u.pitch = pitch;
    u.volume = volume;
    const v = voices.find((x) => x.name === voiceName);
    if (v) u.voice = v;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }

  async function handleConnectTikTok() {
    try {
      const res = await fetch(`https://www.tiktok.com/@${username}/live`, { method: "HEAD" });
      if (res.ok) {
        setTiktokConnected(true);
        setMessage({ type: "success", text: "✅ TikTok LIVE znaleziony!" });
        if (ttsEnabled) speakText("Połączono z TikTok LIVE.");
      } else {
        setTiktokConnected(false);
        setMessage({ type: "error", text: "❌ Brak aktywnego LIVE na TikToku." });
      }
    } catch {
      setTiktokConnected(false);
      setMessage({ type: "error", text: "❌ Nie udało się połączyć z TikTok." });
    }
  }

  async function handleConnectServerTap() {
    try {
      const res = await fetch(`${serverTapUrl}/v1/server`, {
        headers: { "Server-Key": serverKey },
      });
      if (res.ok) {
        setServerTapConnected(true);
        setMessage({ type: "success", text: "✅ Połączono z ServerTap!" });
      } else {
        console.error("ServerTap status:", res.status);
        throw new Error("Błąd odpowiedzi serwera");
      }
    } catch (err) {
      console.error("ServerTap error:", err);
      setServerTapConnected(false);
      setMessage({ type: "error", text: "❌ Nie udało się połączyć z ServerTap." });
    }
  }

  async function triggerTestGift() {
    if (!serverTapConnected) {
      alert("⚠️ Najpierw połącz z ServerTap!");
      return;
    }

    const cmds = [
      `execute as @a at @s run summon zombie ~ ~ ~ {CustomName:'{"text":"TEST"}',CustomNameVisible:1b}`,
      `title @a title {"text":"🎁 TEST","color":"red","bold":true}`,
      `title @a subtitle {"text":"Działa połączenie!","color":"blue","italic":true}`
    ];

    for (const c of cmds) {
      await fetch(`${serverTapUrl}/v1/server/exec`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Server-Key": serverKey,
        },
        body: JSON.stringify({ command: c }),
      });
    }
    alert("🎉 Testowy gift trigger wysłany do ServerTap!");
  }

  return (
    <div style={{ display: "flex", height: "100vh", width: "100vw", fontFamily: 'Inter, ui-sans-serif, system-ui' }}>
      {/* Sidebar */}
      <aside style={{ width: 240, background: "#111827", color: "white", padding: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600 }}>🎮 TikTok Tools</h1>
        <button onClick={() => setActiveTab("connect")} style={{ width: "100%", marginBottom: 8 }}>🔗 Connect</button>
        <button onClick={() => setActiveTab("gifts")} style={{ width: "100%", marginBottom: 8 }}>🎁 Gifts</button>
        <button onClick={() => setActiveTab("tts")} style={{ width: "100%" }}>🗣️ TTS Chat</button>
        <div style={{ marginTop: 20 }}>
          <a href="https://tapujemy.pl/gifts" target="_blank" rel="noreferrer" style={{ color: "#22d3ee" }}>
            🌐 Strona z ID giftami
          </a>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, padding: 24, background: '#0b1220', color: '#e6edf3', overflowY: 'auto' }}>
        {activeTab === "connect" && (
          <div>
            <h2>🔗 Połączenia</h2>

            <div style={{ marginBottom: 20 }}>
              <h3>🎥 TikTok</h3>
              <label>TikTok username:</label>
              <input value={username} onChange={(e) => setUsername(e.target.value)} style={{ width: "100%", padding: 8, marginTop: 4 }} />
              <button onClick={handleConnectTikTok} style={{ marginTop: 10, background: "#0ea5a4", padding: "8px 12px", border: "none", borderRadius: 6, color: "#fff" }}>Połącz z TikTok</button>
              <p>Status: {tiktokConnected ? "🟢 Połączono" : "🔴 Niepołączono"}</p>
            </div>

            <div>
              <h3>🖥️ ServerTap</h3>
              <p>
                📦{" "}
                <a
                  href="https://github.com/TimeCodings/servertap/releases/download/v0.5.4/ServerTap-0.5.4-SNAPSHOT.jar"
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "#22d3ee" }}
                >
                  Pobierz ServerTap (v0.5.4)
                </a>
              </p>
              <label>ServerTap URL:</label>
              <input value={serverTapUrl} onChange={(e) => setServerTapUrl(e.target.value)} style={{ width: "100%", padding: 8, marginTop: 4 }} />
              <label>ServerTap Key:</label>
              <input value={serverKey} onChange={(e) => setServerKey(e.target.value)} style={{ width: "100%", padding: 8, marginTop: 4 }} />
              <button onClick={handleConnectServerTap} style={{ marginTop: 10, background: "#16a34a", padding: "8px 12px", border: "none", borderRadius: 6, color: "#fff" }}>Połącz z ServerTap</button>
              <p>Status: {serverTapConnected ? "🟢 Połączono" : "🔴 Niepołączono"}</p>
            </div>
          </div>
        )}

        {activeTab === "gifts" && (
          <div>
            <h2>🎁 Gift Trigger</h2>
            <p>Użyj tego testowego triggera, aby sprawdzić połączenie z serwerem.</p>

            <pre style={{ background: "#081226", padding: 10, borderRadius: 6, color: "#cbd5e1", fontSize: 13 }}>
{`{
  "5479": [
    "execute as @a at @s run summon zombie ~ ~ ~ {DragonPhase:0,CustomName:'{\\"text\\":\\"{nickname}\\"}',CustomNameVisible:1b,Invisible:1b,Marker:1b}",
    "title @a title {\\"text\\":\\"🎁 TEST\\",\\"color\\":\\"red\\",\\"bold\\":true}",
    "title @a subtitle {\\"text\\":\\"{nickname} TEST\\",\\"color\\":\\"blue\\",\\"italic\\":true}"
  ]
}`}
            </pre>
            <button onClick={triggerTestGift} style={{ marginTop: 10, background: "#f97316", padding: "8px 12px", border: "none", borderRadius: 6, color: "#fff" }}>Test Trigger</button>

            <h3 style={{ marginTop: 30 }}>🎨 Własne Gifts</h3>
            <p><b>LIMIT 10 INTERAKCJI</b></p>
            <p>Strona z ID giftami: <a href="https://tapujemy.pl/gifts" target="_blank" rel="noreferrer" style={{ color: "#22d3ee" }}>tapujemy.pl/gifts</a></p>
            <textarea value={giftsText} onChange={(e) => setGiftsText(e.target.value)} rows={12} style={{ width: "100%", padding: 8, background: "#071022", color: "#e6edf3", borderRadius: 6, marginTop: 8, fontFamily: "monospace" }} />
          </div>
        )}

        {activeTab === "tts" && (
          <div>
            <h2>🗣️ TTS Chat</h2>
            <button onClick={() => setTtsEnabled(!ttsEnabled)} style={{ background: ttsEnabled ? "#dc2626" : "#10b981", color: "#fff", padding: "8px 12px", border: "none", borderRadius: 6 }}>
              {ttsEnabled ? "Wyłącz TTS" : "Włącz TTS"}
            </button>
            <p>Status: {connected ? "🟢 Połączono z czatem" : "🔴 Niepołączono"}</p>
            {!connected && ttsEnabled && (
              <p style={{ color: "#f87171" }}>⚠️ Nie można połączyć się z TTS serwerem ({wsUrl})</p>
            )}
            <select value={voiceName} onChange={(e) => setVoiceName(e.target.value)} style={{ marginTop: 10, padding: 8 }}>
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
        )}

        {message && (
          <div style={{ marginTop: 12, padding: 10, borderRadius: 8, background: message.type === 'error' ? '#dc2626' : '#16a34a' }}>
            {message.text}
          </div>
        )}
      </main>
    </div>
  );
}
