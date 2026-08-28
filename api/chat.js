export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { messages, system } = req.body || {};
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array is required' });
  }

  const groqKey = process.env.GROQ_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const xaiKey = process.env.XAI_API_KEY;

  // 1) Try free Groq first
  if (groqKey) {
    try {
      const result = await callGroq(groqKey, messages, system);
      if (result.ok) {
        return res.status(200).json({
          content: [{ type: 'text', text: result.text }],
          provider: 'groq',
          model: result.model,
        });
      }
      // If Groq fails for non-credit reasons, still try others
    } catch (err) {
      console.error('Groq error:', err.message);
    }
  }

  // 2) Anthropic
  if (anthropicKey) {
    try {
      const result = await callAnthropic(anthropicKey, messages, system);
      if (result.ok) {
        return res.status(200).json({ ...result.data, provider: 'anthropic' });
      }
      const msg = (result.error || '').toLowerCase();
      const isCreditError =
        msg.includes('credit') ||
        msg.includes('balance') ||
        msg.includes('billing') ||
        msg.includes('quota') ||
        result.status === 400 ||
        result.status === 402 ||
        result.status === 429;

      if (!isCreditError) {
        return res.status(result.status || 500).json({
          error: result.error || 'Anthropic API error',
          provider: 'anthropic',
          details: result.details,
        });
      }
      // credit error → fall through
    } catch (err) {
      console.error('Anthropic error:', err.message);
    }
  }

  // 3) xAI / Grok
  if (xaiKey) {
    try {
      const result = await callXAI(xaiKey, messages, system);
      if (result.ok) {
        return res.status(200).json({
          content: [{ type: 'text', text: result.text }],
          provider: 'xai',
          model: result.model,
        });
      }
      return res.status(result.status || 500).json({
        error: result.error || 'xAI API error',
        provider: 'xai',
        details: result.details,
      });
    } catch (err) {
      return res.status(500).json({ error: 'xAI proxy error: ' + err.message, provider: 'xai' });
    }
  }

  // Nothing worked
  return res.status(402).json({
    error:
      'No working AI provider. Add a free GROQ_API_KEY from console.groq.com (recommended), or top up Anthropic / add XAI_API_KEY.',
  });
}

async function callGroq(apiKey, messages, system) {
  const openAIMessages = [];
  if (system && system.trim()) {
    openAIMessages.push({ role: 'system', content: system.trim() });
  }
  for (const m of messages) {
    openAIMessages.push({ role: m.role, content: m.content });
  }

  // Fast free model on Groq
  const payload = {
    model: 'llama-3.3-70b-versatile',
    messages: openAIMessages,
    max_tokens: 1024,
    temperature: 0.7,
  };

  const upstream = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  const raw = await upstream.text();
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    return { ok: false, status: 500, error: 'Failed to parse Groq response', details: raw.slice(0, 200) };
  }

  if (!upstream.ok) {
    return {
      ok: false,
      status: upstream.status,
      error: data?.error?.message || data?.error || 'Groq API error',
      details: data,
    };
  }

  const text = data.choices?.[0]?.message?.content;
  if (!text) {
    return { ok: false, status: 500, error: 'No text in Groq response', details: data };
  }

  return { ok: true, text, model: data.model || 'llama-3.3-70b-versatile' };
}

async function callAnthropic(apiKey, messages, system) {
  const payload = {
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages,
  };
  if (system && system.trim()) payload.system = system.trim();

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
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    return { ok: false, status: 500, error: 'Failed to parse Anthropic response', details: raw.slice(0, 200) };
  }

  if (!upstream.ok) {
    return {
      ok: false,
      status: upstream.status,
      error: data?.error?.message || 'Anthropic API error',
      details: data,
    };
  }

  const textBlock = data.content?.find((b) => b.type === 'text');
  if (!textBlock) {
    return { ok: false, status: 500, error: 'No text in Anthropic response', details: data };
  }

  return { ok: true, data };
}

async function callXAI(apiKey, messages, system) {
  const openAIMessages = [];
  if (system && system.trim()) {
    openAIMessages.push({ role: 'system', content: system.trim() });
  }
  for (const m of messages) {
    openAIMessages.push({ role: m.role, content: m.content });
  }

  const payload = {
    model: 'grok-3',
    messages: openAIMessages,
    max_tokens: 1024,
    temperature: 0.7,
  };

  const upstream = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  const raw = await upstream.text();
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    return { ok: false, status: 500, error: 'Failed to parse xAI response', details: raw.slice(0, 200) };
  }

  if (!upstream.ok) {
    return {
      ok: false,
      status: upstream.status,
      error: data?.error?.message || data?.error || 'xAI API error',
      details: data,
    };
  }

  const text = data.choices?.[0]?.message?.content;
  if (!text) {
    return { ok: false, status: 500, error: 'No text in xAI response', details: data };
  }

  return { ok: true, text, model: data.model || 'grok-3' };
}
