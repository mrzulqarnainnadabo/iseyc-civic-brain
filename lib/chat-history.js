export const MAX_CHAT_MESSAGES = 20;
export const MAX_CHAT_TOTAL_CHARS = 22000;
export const MAX_CHAT_MESSAGE_CHARS = 4000;

/** Keep the newest valid context while satisfying the server request contract. */
export function buildBoundedChatHistory(messages) {
  if (!Array.isArray(messages) || !messages.length) return [];
  const last = messages[messages.length - 1];
  if (!last || last.role !== "user" || typeof last.content !== "string" || !last.content.trim()) return [];

  const latest = last.content.trim().slice(0, MAX_CHAT_MESSAGE_CHARS);
  const selected = [{ role: "user", content: latest }];
  let total = latest.length;

  for (let index = messages.length - 2; index >= 0; index--) {
    if (selected.length >= MAX_CHAT_MESSAGES) break;
    const message = messages[index];
    if (!message || !["user", "assistant"].includes(message.role) || typeof message.content !== "string") continue;
    const content = message.content.trim().slice(-MAX_CHAT_MESSAGE_CHARS);
    if (!content || total + content.length > MAX_CHAT_TOTAL_CHARS) continue;
    selected.unshift({ role: message.role, content });
    total += content.length;
  }
  return selected;
}
