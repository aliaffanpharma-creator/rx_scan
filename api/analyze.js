export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { system, messages } = req.body;
    if (!messages || !system) {
      return res.status(400).json({ error: "Missing input" });
    }

    const prompt = system + "\n\n" + messages.map(m => m.content).join("\n");

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    return res.status(200).json({
      content: [{ text }]
    });

  } catch (err) {
    return res.status(500).json({ error: "Server error", message: err.message });
  }
}
```

Click **Commit changes**

---

## Step 3 — Wait & Test (1 min)

Vercel auto-deploys in **30–60 seconds** after commit.

Then open your live link and test with:
```
Metformin 500mg twice daily
Aspirin 75mg once daily
Amlodipine 5mg once daily
