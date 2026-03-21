const https = require('https');

module.exports = async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const key = process.env.GROQ_KEY;
    if (!key) return res.status(500).json({ error: "Missing GROQ_KEY env variable" });

    const { system, messages } = req.body || {};

    // ── BUILD GROQ MESSAGES ──
    // Frontend sends messages with content as string OR array (with image + text)
    const groqMessages = [];

    // System message
    groqMessages.push({
      role: "system",
      content: system || "You are a helpful medical assistant specialized in analyzing prescriptions."
    });

    // Process each message
    for (const m of (messages || [])) {
      if (typeof m.content === 'string') {
        // Plain text message
        groqMessages.push({ role: m.role || 'user', content: m.content });

      } else if (Array.isArray(m.content)) {
        // Mixed content (image + text) — Llama 4 Scout supports vision
        const parts = [];

        for (const c of m.content) {
          if (c.type === 'text') {
            parts.push({ type: 'text', text: c.text || '' });

          } else if (c.type === 'image' && c.source?.type === 'base64') {
            // Convert Anthropic format → Groq/OpenAI format
            parts.push({
              type: 'image_url',
              image_url: {
                url: `data:${c.source.media_type || 'image/jpeg'};base64,${c.source.data}`
              }
            });
          }
        }

        groqMessages.push({ role: m.role || 'user', content: parts });
      }
    }

    const payload = JSON.stringify({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      messages: groqMessages,
      temperature: 0.3,
      max_tokens: 2048
    });

    const result = await new Promise((resolve) => {
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
    } catch (e) {
      return res.status(500).json({ error: "Parse error", raw: result.body.slice(0, 200) });
    }

    if (result.status !== 200) return res.status(500).json({
      error: "Groq error",
      details: data,
      status: result.status,
      rawBody: result.body.slice(0, 500)
    });

    const text = data.choices?.[0]?.message?.content || "";
    return res.status(200).json({ content: [{ text }] });

  } catch (err) {
    return res.status(500).json({ error: "Crashed", message: err.message });
  }
};
