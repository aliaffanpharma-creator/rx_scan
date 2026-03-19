export default async function handler(req, res) {
  try {
    const key = process.env.OPENROUTER_KEY;
    return res.status(200).json({ 
      keyFound: !!key,
      keyPreview: key ? key.slice(0, 15) : "NOT FOUND"
    });
  } catch(err) {
    return res.status(200).json({ error: err.message });
  }
}
