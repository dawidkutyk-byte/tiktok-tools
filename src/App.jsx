import React, { useState, useEffect } from "react";
import io from "socket.io-client";

export default function App() {
  const [activeTab, setActiveTab] = useState("connect");
  const [username, setUsername] = useState("widow_og");
  const [serverTapUrl, setServerTapUrl] = useState("http://83.168.106.220:21001");
  const [serverKey, setServerKey] = useState("change_me");
  const [wsUrl, setWsUrl] = useState("http://localhost:4000");

  const [message, setMessage] = useState(null);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [voices, setVoices] = useState([]);
  const [voiceName, setVoiceName] = useState("");

  const [serverTapConnected, setServerTapConnected] = useState(false);

  // Załaduj głosy TTS
  useEffect(() => {
    const loadVoices = () => {
      const v = window.speechSynthesis.getVoices();
      setVoices(v);
      if (v.length && !voiceName) setVoiceName(v[0].name);
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, [voiceName]);

  // --- Połączenie do TTS
  useEffect(() => {
    if (!ttsEnabled) {
      setConnected(false);
      return;
    }
    const socket = io(wsUrl, { transports: ["websocket"] });

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("chat", (data) => {
      const nick = data.nickname || "Anon";
      const text = data.message || "";
      setMessages((m) => [{ nick, text }, ...m].slice(0, 50));
      const u = new SpeechSynthesisUtterance(`${nick} mówi ${text}`);
      const v = voices.find((x) => x.name === voiceName);
      if (v) u.voice = v;
      window.speechSynthesis.speak(u);
    });

    return () => socket.disconnect();
  }, [ttsEnabled, wsUrl, voices, voiceName]);

  // --- Połącz z ServerTap
  async function connectServerTap() {
    try {
      const resp = await fetch("/api/servertap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          command: "say ✅ Test połączenia z ServerTap",
          serverTapUrl,
          serverKey,
        }),
      });
      const data = await resp.json();
      if (data.ok) {
        setServerTapConnected(true);
        setMessage({ type: "success", text: "Połączono z ServerTap!" });
      } else {
        setServerTapConnected(false);
        setMessage({ type: "error", text: "Błąd połączenia z ServerTap" });
      }
    } catch (err) {
      setServerTapConnected(false);
      setMessage({ type: "error", text: "Nie udało się połączyć z ServerTap" });
    }
  }

  // --- Testowy trigger
  async function triggerTest() {
    await fetch("/api/servertap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        command:
          "execute as @a at @s run summon zombie ~ ~ ~ {CustomName:'{\"text\":\"TestUser\"}',CustomNameVisible:1b}",
        serverTapUrl,
        serverKey,
      }),
    });
    setMessage({ type: "success", text: "Wysłano testowy trigger!" });
  }

  return (
    <div style={{ display: "flex", height: "100vh", background: "#0b1220", color: "#e6edf3" }}>
      <aside style={{ width: 240, background: "#111827", padding: 20 }}>
        <h1 style={{ fontSize: 20 }}>🎮 TikTok Tools</h1>
        <button onClick={() => setActiveTab("connect")} style={{ width: "100%", marginBottom: 8 }}>
          🔌 Connect
        </button>
        <button onClick={() => setActiveTab("gifts")} style={{ width: "100%", marginBottom: 8 }}>
          🎁 Gifts
        </button>
        <button onClick={() => setActiveTab("tts")} style={{ width: "100%" }}>
          🗣️ TTS Chat
        </button>
      </aside>

      <main style={{ flex: 1, padding: 24 }}>
        {message && (
          <div
            style={{
              background: message.type === "error" ? "#b91c1c" : "#047857",
              padding: 10,
              marginBottom: 12,
              borderRadius: 6,
            }}
          >
            {message.text}
          </div>
        )}

        {activeTab === "connect" && (
          <div>
            <h2>🔌 Connect</h2>
            <p style={{ opacity: 0.8 }}>Podaj dane logowania i połącz się:</p>

            <label>TikTok username</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{ width: "100%", marginBottom: 10 }}
            />

            <p style={{ fontWeight: "bold", marginTop: 16 }}>ServerTap URL</p>
            <a
              href="https://github.com/TimeCodings/servertap/releases/download/v0.5.4/ServerTap-0.5.4-SNAPSHOT.jar"
              target="_blank"
              rel="noreferrer"
              style={{ color: "#22d3ee", fontSize: 14 }}
            >
              🔗 Pobierz ServerTap plugin
            </a>
            <input
              value={serverTapUrl}
              onChange={(e) => setServerTapUrl(e.target.value)}
              style={{ width: "100%", marginTop: 8 }}
            />

            <p>Server Key</p>
            <input
              value={serverKey}
              onChange={(e) => setServerKey(e.target.value)}
              style={{ width: "100%", marginBottom: 10 }}
            />

            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button
                onClick={() => setTtsEnabled(true)}
                style={{ padding: "8px 12px", borderRadius: 6, background: "#2563eb", color: "white" }}
              >
                Połącz z TikTok
              </button>
              <button
                onClick={connectServerTap}
                style={{ padding: "8px 12px", borderRadius: 6, background: "#0ea5a4", color: "white" }}
              >
                Połącz z ServerTap
              </button>
            </div>

            <p style={{ marginTop: 12 }}>
              ServerTap status:{" "}
              {serverTapConnected ? "🟢 Połączono" : "🔴 Niepołączono"}
            </p>
          </div>
        )}

        {activeTab === "gifts" && (
          <div>
            <h2>🎁 Gift Trigger</h2>
            <p style={{ color: "#94a3b8", marginBottom: 4 }}>LIMIT 10 INTERAKCJI</p>
            <a href="https://tapujemy.pl/gifts" target="_blank" rel="noreferrer" style={{ color: "#22d3ee" }}>
              🌐 Strona z ID giftami
            </a>

            <textarea
              rows={10}
              value={`{
  "5479": [
    "execute as @a at @s run summon zombie ~ ~ ~ {CustomName:'{\\"text\\":\\"{nickname}\\"}',CustomNameVisible:1b,Invisible:1b,Marker:1b}",
    "title @a title {\\"text\\":\\"🎁 TEST\\",\\"color\\":\\"red\\",\\"bold\\":true}",
    "title @a subtitle {\\"text\\":\\"{nickname} TEST\\",\\"color\\":\\"blue\\",\\"italic\\":true}"
  ]
}`}
              readOnly
              style={{ width: "100%", marginTop: 10 }}
            />

            <button
              onClick={triggerTest}
              style={{ marginTop: 10, background: "#0ea5a4", padding: "8px 12px", borderRadius: 6, border: "none" }}
            >
              🔥 Test Trigger
            </button>
          </div>
        )}

        {activeTab === "tts" && (
          <div>
            <h2>🗣️ TTS Chat</h2>
            <button
              onClick={() => setTtsEnabled(!ttsEnabled)}
              style={{ padding: "8px 12px", borderRadius: 6, background: "#1d4ed8", color: "white" }}
            >
              {ttsEnabled ? "Wyłącz TTS" : "Włącz TTS"}
            </button>
            <p style={{ marginTop: 10 }}>
              Status: {connected ? "🟢 Połączono" : "🔴 Niepołączono"}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
