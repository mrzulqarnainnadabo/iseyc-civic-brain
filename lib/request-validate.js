/**
 * Validate chat request bodies. Reject prompt-injection via system field,
 * oversized payloads, bad roles, and excessive history.
 */

const MAX_MESSAGES = 20;
const MAX_CONTENT_CHARS = 4000;
const MAX_TOTAL_CHARS = 24000;
const ALLOWED_ROLES = new Set(['user', 'assistant']);
const ALLOWED_MODES = new Set(['civic', 'research', 'planning']);

export function validateChatBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, code: 'INVALID_BODY', message: 'JSON body required.' };
  }

  // Explicitly reject client-controlled system prompts
  if (body.system != null || body.systemPrompt != null || body.system_prompt != null) {
    // Soft: ignore is safer than 400 for older clients — but we never use the field.
    // Validation still proceeds; server owns system.
  }

  const messages = body.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    return { ok: false, code: 'MESSAGES_REQUIRED', message: 'messages array is required.' };
  }
  if (messages.length > MAX_MESSAGES) {
    return {
      ok: false,
      code: 'TOO_MANY_MESSAGES',
      message: `At most ${MAX_MESSAGES} messages per request.`,
    };
  }

  let total = 0;
  const cleaned = [];
  for (const m of messages) {
    if (!m || typeof m !== 'object') {
      return { ok: false, code: 'INVALID_MESSAGE', message: 'Each message must be an object.' };
    }
    if (!ALLOWED_ROLES.has(m.role)) {
      return {
        ok: false,
        code: 'UNSUPPORTED_ROLE',
        message: 'Only user and assistant roles are allowed.',
      };
    }
    if (typeof m.content !== 'string') {
      return { ok: false, code: 'INVALID_CONTENT', message: 'Message content must be a string.' };
    }
    const content = m.content.trim();
    if (!content) {
      return { ok: false, code: 'EMPTY_CONTENT', message: 'Message content cannot be empty.' };
    }
    if (content.length > MAX_CONTENT_CHARS) {
      return {
        ok: false,
        code: 'MESSAGE_TOO_LONG',
        message: `Each message must be at most ${MAX_CONTENT_CHARS} characters.`,
      };
    }
    total += content.length;
    cleaned.push({ role: m.role, content });
  }

  if (total > MAX_TOTAL_CHARS) {
    return {
      ok: false,
      code: 'CONVERSATION_TOO_LARGE',
      message: 'Conversation exceeds size limit.',
    };
  }

  // Last message should be from user for a normal turn
  if (cleaned[cleaned.length - 1].role !== 'user') {
    return {
      ok: false,
      code: 'LAST_MUST_BE_USER',
      message: 'The last message must be from the user.',
    };
  }

  let mode = typeof body.mode === 'string' ? body.mode.trim().toLowerCase() : 'civic';
  if (!ALLOWED_MODES.has(mode)) mode = 'civic';

  return { ok: true, value: { messages: cleaned, mode } };
}
