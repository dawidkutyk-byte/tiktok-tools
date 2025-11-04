export default async function handler(req, res) {
  const { action } = req.query;

  if (action === "send-command") {
    const { command, serverTapUrl, serverKey } = req.body;
    try {
      const r = await fetch(`${serverTapUrl}/v1/server/exec`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          key: serverKey,
        },
        body: JSON.stringify({ command }),
      });

      if (!r.ok) {
        const text = await r.text();
        return res.status(400).json({ message: `Błąd ServerTap: ${text}` });
      }

      const data = await r.json();
      return res.status(200).json({ message: "Komenda wysłana do serwera!", data });
    } catch (err) {
      return res.status(500).json({ message: "Nie udało się wysłać komendy do ServerTap." });
    }
  }

  return res.status(400).json({ message: "Niepoprawne żądanie." });
}

