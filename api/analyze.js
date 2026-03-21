const https = require('https');

module.exports = async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const key = process.env.GROQ_KEY;
    if (!key) return res.status(500).json({ error: "Missing GROQ_KEY env variable" });

    const { system, messages } = req.body || {};

    const userContent = messages?.map(m => {
      if (typeof m.content === 'string') return m.content;
      if (Array.isArray(m.content)) return m.content.map(c => c.text || '').join(' ');
      return '';
    }).join('\n') || "Hello";

    const payload = JSON.stringify({
      model: "meta-llama/llama-4-scout-17b-16e-instruct", // ✅ Llama 4 Scout on Groq
      messages: [
        { role: "system", content: system || "You are a helpful medical assistant specialized in analyzing prescriptions." },
        { role: "user", content: userContent }
      ],
      temperature: 0.3,      // Lower = more accurate/consistent for medical tasks
      max_tokens: 2048
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

      request.on('error', err => resolve({ 
        status: 500, 
        body: JSON.stringify({ error: err.message }) 
      }));

      request.write(payload);
      request.end();
    });

    let data;
    try { 
      data = JSON.parse(result.body); 
    } catch(e) { 
      return res.status(500).json({ 
        error: "Parse error", 
        raw: result.body.slice(0, 200) 
      }); 
    }

    if (result.status !== 200) return res.status(500).json({ 
      error: "Groq error", 
      details: data,
      status: result.status,
      rawBody: result.body.slice(0, 500)
    });

    const text = data.choices?.[0]?.message?.content || "";
    return res.status(200).json({ content: [{ text }] });

  } catch(err) {
    return res.status(500).json({ error: "Crashed", message: err.message });
  }
};
