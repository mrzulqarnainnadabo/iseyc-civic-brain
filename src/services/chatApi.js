export async function requestChat({ messages, system }) {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ system, messages }),
  });

  const raw = await response.text();
  let data;

  try {
    data = JSON.parse(raw);
  } catch {
    const error = new Error(`Could not parse server response. Status: ${response.status}`);
    error.debug = `Parse error (status ${response.status}): ${raw.slice(0, 200)}`;
    throw error;
  }

  if (!response.ok) {
    const errMsg = data?.error || data?.details?.error?.message || JSON.stringify(data);
    const error = new Error(errMsg);
    error.status = response.status;
    error.data = data;
    error.debug = `API error ${response.status}: ${errMsg}`;
    throw error;
  }

  const reply = data?.content?.find(block => block.type === "text")?.text;
  if (!reply) {
    const error = new Error(`Unexpected response: ${JSON.stringify(data).slice(0, 200)}`);
    error.debug = `Unexpected response shape: ${JSON.stringify(data).slice(0, 300)}`;
    throw error;
  }

  return { reply, provider: data.provider, model: data.model };
}

export function friendlyError(errMsg, status) {
  const message = (errMsg || "").toLowerCase();
  if (message.includes("credit") || message.includes("balance") || message.includes("billing") || message.includes("quota")) {
    return `**Provider credits low**\n\nThe AI provider is out of credits. Add Anthropic credits at console.anthropic.com, or set an **XAI_API_KEY** (Grok) in Vercel Environment Variables as backup.\n\nThen try again.`;
  }
  if (message.includes("api key") || message.includes("not configured")) {
    return `**API key missing**\n\nSet ANTHROPIC_API_KEY and/or XAI_API_KEY in Vercel → Project → Settings → Environment Variables.`;
  }
  return `**API Error ${status || ""}:** ${errMsg}`;
}
