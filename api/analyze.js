export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { system, messages } = req.body;
    if (!messages || !system) {
      return res.status(400).json({ error: "Missing input" });
    }

    const userContent = messages.map(m => {
      if (typeof m.content === 'string') return m.content;
      if (Array.isArray(m.content)) {
        return m.content.map(c => c.text || '').join(' ');
      }
      return '';
    }).join('\n');

    const prompt = system + "\n\n" + userContent;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({ error: "Gemini error", details: JSON.stringify(data) });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    return res.status(200).json({
      content: [{ text }]
    });

  } catch (err) {
    return res.status(500).json({ error: "Server error", message: err.message });
  }
}

