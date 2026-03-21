const https = require('https');

module.exports = async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const key = process.env.GEMINI_KEY;
    if (!key) return res.status(500).json({ error: "Missing GEMINI_KEY env variable" });

    const { system, messages } = req.body || {};

    // Combine system + user messages into Gemini format
    const userContent = messages?.map(m => {
      if (typeof m.content === 'string') return m.content;
      if (Array.isArray(m.content)) return m.content.map(c => c.text || '').join(' ');
      return '';
    }).join('\n') || "Hello";

    const payload = JSON.stringify({
      system_instruction: {
        parts: [{ text: system || "You are a helpful assistant" }]
      },
      contents: [
        {
          role: "user",
          parts: [{ text: userContent }]
        }
      ]
    });

    const model = "gemini-2.0-flash"; // Free tier, fast & capable
    const path = `/v1beta/models/${model}:generateContent?key=${key}`;

    const result = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'generativelanguage.googleapis.com',
        path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        }
      };

      const request = https.request(options, (response) => {
        let data = '';
        response.on('data', chunk => data += chunk);
        response.on('end', () => resolve({ status: response.statusCode, body: data }));
      });

      request.on('error', err => resolve({ status: 500, body: JSON.stringify({ error: err.message }) }));
      request.write(payload);
      request.end();
    });

    let data;
    try { data = JSON.parse(result.body); }
    catch (e) { return res.status(500).json({ error: "Parse error", raw: result.body.slice(0, 200) }); }

    if (result.status !== 200) return res.status(500).json({ error: "Gemini error", details: data });

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    return res.status(200).json({ content: [{ text }] });

  } catch (err) {
    return res.status(500).json({ error: "Crashed", message: err.message });
  }
};
