export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY is not set');
    return res.status(500).json({ error: 'API key not configured' });
  }

  const { messages, system } = req.body || {};
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array is required' });
  }

  const payload = {
    model: 'claude-sonnet-4-6-20250514',
    max_tokens: 1024,
    messages: messages,
  };
  if (system && system.trim()) payload.system = system.trim();

  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(payload),
    });

    const raw = await upstream.text();
    console.log('Anthropic status:', upstream.status);
    console.log('Anthropic raw response:', raw.slice(0, 500));

    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      return res.status(500).json({ error: 'Failed to parse Anthropic response', raw: raw.slice(0, 200) });
    }

    if (!upstream.ok) {
      console.error('Anthropic API error:', data);
      return res.status(upstream.status).json({ error: data?.error?.message || 'Anthropic API error', details: data });
    }

    // Extract text content and return in expected format
    const textBlock = data.content?.find(b => b.type === 'text');
    if (!textBlock) {
      console.error('No text block in response:', JSON.stringify(data));
      return res.status(500).json({ error: 'No text in response', data });
    }

    return res.status(200).json(data);

  } catch (err) {
    console.error('Proxy fetch error:', err.message);
    return res.status(500).json({ error: 'Proxy error: ' + err.message });
  }
}