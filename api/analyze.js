const https = require('https');

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  
  try {
    const key = process.env.OPENROUTER_KEY;
    if (!key) return res.status(500).json({ error: "No API key" });

    const { system, messages } = req.body || {};
    if (!system || !messages) return res.status(400).json({ error: "Missing input" });

    const userContent = messages.map(m => {
      if (typeof m.content === 'string') return m.content;
      if (Array.isArray(m.content)) return m.content.map(c => c.text || '').join(' ');
      return '';
    }).join('\n');

    const payload = JSON.stringify({
      model: "meta-llama/llama-3.2-3b-instruct:free",
      messages: [
        { role: "system", content: system },
        { role: "user", content: userContent }
      ]
    });

    const result = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'openrouter.ai',
        path: '/api/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`,
          'Content-Length': Buffer.byteLength(payload)
        }
      };

      const request = https.request(options, (response) => {
        let data = '';
        response.on('data', chunk => data += chunk);
        response.on('end', () => resolve({ status: response.statusCode, body: data }));
      });

      request.on('error', reject);
      request.write(payload);
      request.end();
    });

    const data = JSON.parse(result.body);
    if (result.status !== 200) return res.status(500).json({ error: "AI error", details: data });

    const text = data.choices?.[0]?.message?.content || "";
    return res.status(200).json({ content: [{ text }] });

  } catch(err) {
    return res.status(500).json({ error: "Server error", message: err.message });
  }
}
