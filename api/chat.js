import { callAnthropic, callOpenAICompatible } from "./providers.js";

const PROVIDERS = [
  {
    name: "groq",
    key: "GROQ_API_KEY",
    model: "llama-3.3-70b-versatile",
    endpoint: "https://api.groq.com/openai/v1/chat/completions",
  },
  {
    name: "anthropic",
    key: "ANTHROPIC_API_KEY",
  },
  {
    name: "xai",
    key: "XAI_API_KEY",
    model: "grok-3",
    endpoint: "https://api.x.ai/v1/chat/completions",
  },
];

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { messages, system } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "messages array is required" });
  }

  for (const provider of PROVIDERS) {
    const apiKey = process.env[provider.key];
    if (!apiKey) continue;

    try {
      const result = provider.name === "anthropic"
        ? await callAnthropic({ apiKey, messages, system })
        : await callOpenAICompatible({
            apiKey,
            endpoint: provider.endpoint,
            model: provider.model,
            provider: provider.name,
            messages,
            system,
          });

      if (result.ok) {
        if (provider.name === "anthropic") {
          return res.status(200).json({ ...result.data, provider: "anthropic" });
        }
        return res.status(200).json({
          content: [{ type: "text", text: result.text }],
          provider: provider.name,
          model: result.model,
        });
      }

      if (provider.name === "anthropic") {
        const message = (result.error || "").toLowerCase();
        const isCreditError = ["credit", "balance", "billing", "quota"].some(term => message.includes(term)) || [400, 402, 429].includes(result.status);
        if (!isCreditError) {
          return res.status(result.status || 500).json({ error: result.error || "Anthropic API error", provider: "anthropic", details: result.details });
        }
      }

      console.error(`${provider.name} provider failed:`, result.error);
    } catch (error) {
      console.error(`${provider.name} provider exception:`, error.message);
      if (provider.name === "xai") {
        return res.status(500).json({ error: "xAI proxy error: " + error.message, provider: "xai" });
      }
    }
  }

  return res.status(402).json({
    error: "No working AI provider. Add a free GROQ_API_KEY from console.groq.com (recommended), or top up Anthropic / add XAI_API_KEY.",
  });
}
