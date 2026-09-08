module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Prioritize user-provided key (header or body), fallback to server env
  const userKey = req.headers['x-groq-api-key'] || req.headers['x-groq-key'] || req.body?.groqApiKey || null;
  const apiKey = userKey || process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Groq API key missing. Add it in the UI or configure GROQ_API_KEY on the server.' });
  }

  const { model, messages, max_tokens, temperature } = req.body;
  // don't forward groqApiKey to upstream
  if (req.body.groqApiKey) delete req.body.groqApiKey;

  const upstream = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages, max_tokens, temperature }),
  });

  const data = await upstream.json();

  return res.status(upstream.status).json(data);
};
