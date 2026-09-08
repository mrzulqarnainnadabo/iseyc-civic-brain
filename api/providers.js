async function parseResponse(response, provider) {
  const raw = await response.text();
  let data;

  try {
    data = JSON.parse(raw);
  } catch {
    return { ok: false, status: 500, error: `Failed to parse ${provider} response`, details: raw.slice(0, 200) };
  }

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      error: data?.error?.message || data?.error || `${provider} API error`,
      details: data,
    };
  }

  const text = data.choices?.[0]?.message?.content;
  if (!text) {
    return { ok: false, status: 500, error: `No text in ${provider} response`, details: data };
  }

  return { ok: true, text, model: data.model };
}

function buildMessages(messages, system) {
  const output = [];
  if (system && system.trim()) output.push({ role: "system", content: system.trim() });
  return output.concat(messages);
}

export async function callOpenAICompatible({ apiKey, endpoint, model, provider, messages, system }) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: buildMessages(messages, system),
      max_tokens: 1024,
      temperature: 0.7,
    }),
  });

  const result = await parseResponse(response, provider);
  return { ...result, model: result.model || model };
}

export async function callAnthropic({ apiKey, messages, system }) {
  const payload = {
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages,
  };
  if (system && system.trim()) payload.system = system.trim();

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(payload),
  });

  const raw = await response.text();
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    return { ok: false, status: 500, error: "Failed to parse Anthropic response", details: raw.slice(0, 200) };
  }

  if (!response.ok) {
    return { ok: false, status: response.status, error: data?.error?.message || "Anthropic API error", details: data };
  }

  const textBlock = data.content?.find(block => block.type === "text");
  if (!textBlock) return { ok: false, status: 500, error: "No text in Anthropic response", details: data };

  return { ok: true, data };
}
