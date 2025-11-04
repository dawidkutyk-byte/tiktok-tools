import React, { useState, useEffect, useRef } from "react";
import io from "socket.io-client";

export default function App() {
  const [activeTab, setActiveTab] = useState("connect");
  const [username, setUsername] = useState("widow_og");
  const [serverTapUrl, setServerTapUrl] = useState("http://83.168.106.220:21001");
  const [serverKey, setServerKey] = useState("change_me");
  const [isTikTokConnected, setIsTikTokConnected] = useState(false);
  const [isServerTapConnected, setIsServerTapConnected] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [message, setMessage] = useState(null);

  const socketRef = useRef(null);

  const [giftsText, setGiftsText] = useState(`{
  "5479": [
    "execute as @a at @s run summon zombie ~ ~ ~ {CustomName:'{\\"text\\":\\"{nickname}\\"}',CustomNameVisible:1b}",
    "title @a title {\\"text\\":\\"🎁 RÓŻYCZKA!\\",\\"color\\":\\"light_purple\\"}"
  ]
}`);

  // --- 🔌 Połączenie z backendem socket.io ---
  useEffect(() => {
    const socket = io("/", { path: "/api/socket" });
    socketRef.current = socket;

    socket.on("connect", () => console.log("✅ Połączono z backendem"));

    socket.on("tiktokConnected", (u) => {
      setIsTikTokConnected(true);
      setMessage({ type: "success", text: `✅ Połączono z TikTok Live: ${u}` });
    });

    socket.on("gift", async (data) => {
      const gifts = JSON.parse(giftsText);
      const giftId = data.giftId?.toString();
      const nickname = data.user?.uniqueId;
      const repeatcount = data.repeatCount || 1;

      if (gifts[giftId]) {
        for (let cmd of gifts[giftId]) {
          cmd = cmd.replace(/{nickname}/g, nickname).replace(/{repeatcount}/g, repeatcount);
          await sendCommandToServerTap(cmd);
        }
      }
    });

    socket.on("chat", (data) => {
      if (ttsEnabled) {
        const text = `${data.nickname} mówi: ${data.comment}`;
        const u = new SpeechSynthesisUtterance(text);
        u.lang = "pl-PL";
        window.speechSynthesis.speak(u);
      }
    });

    return () => socket.disconnect();
  }, [ttsEnabled, giftsText]);

  // --- 📡 Połączenie z TikTok ---
  function connectTikTok() {
    socketRef.current.emit("connectTikTok", username);
  }

  // --- 🧪 Test triggera ---
  async function testTrigger() {
    if (!isServerTapConnected) {
      setMessage({ type: "error", text: "Brak połączenia z ServerTap!" });
      return;
    }
    const cmd = 'execute as @a at @s run summon zombie ~ ~ ~ {CustomName:\'{"text":"TEST"}\',CustomNameVisible:1b}';
    await sendCommandToServerTap(cmd);
  }

  // --- 🔗 Połączenie z ServerTap ---
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
      setIsServerTapConnected(false);
      setMessage({ type: "error", text: "❌ Błąd łączenia z ServerTap." });
    }
  }

  // --- 💥 Wysyłanie komend do Minecrafta ---
  async function sendCommandToServerTap(command) {
    try {
      const res = await fetch(`${serverTapUrl}/v1/server/exec`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          key: serverKey,
        },
        body: new URLSearchParams({ command, time: "" }),
      });

      if (res.ok) {
        setMessage({ type: "success", text: "✅ Komenda wysłana do Minecrafta!" });
      } else {
        const err = await res.text();
        setMessage({ type: "error", text: `⚠️ Błąd: ${err}` });
      }
    } catch {
      setMessage({ type: "error", text: "❌ Nie udało się połączyć z ServerTap." });
    }
  }

  return (
    <div className="flex w-screen h-screen bg-[#0b1220] text-white font-sans">
      <aside className="w-60 bg-[#111827] p-4 flex flex-col">
        <h1 className="text-xl mb-4">🎮 TikTok Tools</h1>
        <button onClick={() => setActiveTab("connect")}>🔗 Connect</button>
        <button onClick={() => setActiveTab("gifts")}>🎁 Gifts</button>
        <button onClick={() => setActiveTab("tts")}>🗣️ TTS Chat</button>
      </aside>

      <main className="flex-1 p-4 overflow-y-auto">
        {activeTab === "connect" && (
          <div>
            <h2>Połączenia</h2>
            <p>TikTok username:</p>
            <input value={username} onChange={(e) => setUsername(e.target.value)} />
            <button onClick={connectTikTok}>Połącz z TikTok</button>

            <p className="mt-4">ServerTap URL:</p>
            <input value={serverTapUrl} onChange={(e) => setServerTapUrl(e.target.value)} />
            <p>Server Key:</p>
            <input value={serverKey} onChange={(e) => setServerKey(e.target.value)} />
            <button onClick={connectServerTap}>Połącz z ServerTap</button>
          </div>
        )}

        {activeTab === "gifts" && (
          <div>
            <h2>🎁 Gifts</h2>
            <p>
              🔗 Lista ID:{" "}
              <a href="https://tapujemy.pl/gifts" target="_blank" style={{ color: "#22d3ee" }}>
                https://tapujemy.pl/gifts
              </a>
            </p>
            <textarea rows={10} value={giftsText} onChange={(e) => setGiftsText(e.target.value)} />
            <button onClick={testTrigger}>🧪 Testuj Trigger</button>
          </div>
        )}

        {activeTab === "tts" && (
          <div>
            <h2>🗣️ TTS Chat</h2>
            <button onClick={() => setTtsEnabled(!ttsEnabled)}>
              {ttsEnabled ? "Wyłącz TTS" : "Włącz TTS"}
            </button>
            <p>Status: {ttsEnabled ? "🟢 Aktywny" : "🔴 Nieaktywny"}</p>
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
