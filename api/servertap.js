// api/servertap.js
import axios from "axios";
import querystring from "querystring";

export default async function handler(req, res) {
  const { action } = req.query;

  // Ustawienia z requestu (przekazywane z frontu)
  const { serverUrl, serverKey, command } = req.body || {};

  if (!serverUrl || !serverKey) {
    return res.status(400).json({ error: "Brak ServerTap URL lub klucza." });
  }

  try {
    if (action === "test") {
      // Testowe połączenie - sprawdza status serwera
      const response = await axios.get(`${serverUrl}/v1/server`, {
        headers: { key: serverKey },
      });
      return res.status(200).json({ ok: true, server: response.data });
    }

    if (action === "send-command") {
      if (!command) return res.status(400).json({ error: "Brak komendy!" });

      // ServerTap wymaga form-urlencoded
      const data = querystring.stringify({
        command: command,
        time: "",
      });

      const response = await axios.post(
        `${serverUrl}/v1/server/exec`,
        data,
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            key: serverKey,
          },
        }
      );

      return res.status(200).json({ ok: true, response: response.data });
    }

    return res.status(400).json({ error: "Nieprawidłowe action" });
  } catch (err) {
    console.error("ServerTap error:", err.message);
    return res
      .status(500)
      .json({ error: "Błąd połączenia z ServerTap", details: err.message });
  }
}
