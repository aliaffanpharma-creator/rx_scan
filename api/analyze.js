export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "No API key found" });
  }

  const { system, messages } = req.body || {};
  if (!system || !messages) {
    return res.status(400).json({ error: "Missing system or messages" });
  }

  const userContent = messages.map(m => {
    if (typeof m.content === 'string') return m.content;
    if (Array.isArray(m.content)) return m.content.map(c => c.text || '').join(' ');
    return '';
  }).join('\n');

  const prompt = `${system}\n\n${userContent}`;

  const geminiRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1 }
      })
    }
  );

  const geminiData = await geminiRes.json();

  if (!geminiRes.ok) {
    return res.status(500).json({ error: "Gemini failed", details: geminiData });
  }

  const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
  return res.status(200).json({ content: [{ text }] });
}
