const https = require('https');

module.exports = async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const key = process.env.GROQ_KEY || "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";
    const { system, messages } = req.body || {};

    const userContent = messages.map(m => {
      if (typeof m.content === 'string') return m.content;
      if (Array.isArray(m.content)) return m.content.map(c => c.text || '').join(' ');
      return '';
    }).join('\n');

    const payload = JSON.stringify({
      model: "llama3-8b-8192",
      messages: [
        { role: "system", content: system || "You are a helpful assistant" },
        { role: "user", content: userContent || "Hello" }
      ]
    });

    const result = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.groq.com',
        path: '/openai/v1/chat/completions',
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
      request.on('error', err => resolve({ status: 500, body: JSON.stringify({ error: err.message }) }));
      request.write(payload);
      request.end();
    });

    let data;
    try { data = JSON.parse(result.body); } 
    catch(e) { return res.status(500).json({ error: "Parse error", raw: result.body.slice(0, 200) }); }

    if (result.status !== 200) return res.status(500).json({ error: "Groq error", details: data });

    const text = data.choices?.[0]?.message?.content || "";
    return res.status(200).json({ content: [{ text }] });

  } catch(err) {
    return res.status(500).json({ error: "Crashed", message: err.message });
  }
}
