// /api/servertap.js
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Only POST allowed" });
  }

  try {
    const { command, serverTapUrl, serverKey } = req.body;

    if (!command || !serverTapUrl || !serverKey) {
      return res.status(400).json({ ok: false, error: "Missing parameters" });
    }

    const response = await fetch(`${serverTapUrl}/v1/server/exec`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        key: serverKey,
      },
      body: new URLSearchParams({ command, time: "" }),
    });

    const text = await response.text();

    if (!response.ok) {
      return res.status(response.status).json({ ok: false, error: text });
    }

    return res.status(200).json({ ok: true, response: text });
  } catch (err) {
    console.error("❌ ServerTap proxy error:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
