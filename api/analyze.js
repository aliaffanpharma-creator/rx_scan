export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { system, messages } = req.body;

    if (!messages || !system) {
      return res.status(400).json({ error: "Missing input" });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 900,
        system,
        messages
      })
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const text = await response.text();
      return res.status(500).json({
        error: "AI request failed",
        details: text.slice(0, 200)
      });
    }

    const data = await response.json();
    return res.status(200).json(data);

  } catch (err) {
    if (err.name === "AbortError") {
      return res.status(504).json({ error: "Request timeout" });
    }

    return res.status(500).json({
      error: "Server error",
      message: err.message
    });
  }
}
