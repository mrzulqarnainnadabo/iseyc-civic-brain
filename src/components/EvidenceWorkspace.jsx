import { useState, useRef, useEffect } from "react";
import Markdown from "./Markdown.jsx";
import Card from "./ui/Card.jsx";

const MANDATE_URL = "https://2027-street-mandate.vercel.app";

const TOOL_LIMITS = [
  "Published Civic Mandate aggregates only, when available",
  "States when evidence is missing or thin",
  "Does not invent institutional responses",
  "Does not rank candidates or parties",
];

const SUGGESTIONS = [
  {
    label: "Published snapshot",
    prompt:
      "Using only the current published Civic Mandate evidence, summarise published totals, states represented, top duties, and the main methodology limitations. If evidence is thin, say so.",
  },
  {
    label: "Coverage limits",
    prompt:
      "From published Civic Mandate evidence only, which states and LGAs appear, and what does limited pilot coverage mean?",
  },
  {
    label: "Health in the record",
    prompt:
      "What do published Civic Mandate records show about Health-related demands? Separate record facts from unknowns. Do not invent institutional responses.",
  },
  {
    label: "Research brief",
    prompt:
      "Draft a short research brief from published Civic Mandate evidence only. Label unsupported points as questions for research, not facts.",
  },
];

function friendlyError(errMsg, status) {
  const m = (errMsg || "").toLowerCase();
  if (m.includes("rate") || status === 429)
    return "Too many requests. Please wait a moment and try again.";
  if (m.includes("credit") || m.includes("balance") || m.includes("billing") || m.includes("quota"))
    return "The language provider is temporarily unavailable. Try again later.";
  if (m.includes("api key") || m.includes("not configured"))
    return "This service is not fully configured. An operator needs to set API keys.";
  return `Request failed${status ? ` (${status})` : ""}. Please try again.`;
}

const INTRO = `ISEYC Civic Brain helps you understand **published** Civic Mandate Nigeria records — and what those records cannot yet establish.\n\n- Answers are grounded on published evidence only (not a national survey).\n- Thin evidence is reported honestly.\n- Routing recommendations require human review and are never auto-sent.\n\nOpen the public record: ${MANDATE_URL}`;

export default function EvidenceWorkspace() {
  const [msgs, setMsgs] = useState([{ role: "assistant", content: INTRO }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef(null);
  const taRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, busy]);

  const send = async (content) => {
    if (!content.trim() || busy) return;
    const next = [...msgs, { role: "user", content: content.trim() }];
    setMsgs(next);
    setInput("");
    setError("");
    if (taRef.current) taRef.current.style.height = "44px";
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "civic",
          messages: next.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const raw = await res.text();
      let data;
      try {
        data = JSON.parse(raw);
      } catch {
        setError(`Could not read server response (${res.status}).`);
        setMsgs((prev) => [
          ...prev,
          { role: "assistant", content: "The service returned an unreadable response. Please try again." },
        ]);
        return;
      }
      if (!res.ok) {
        const errMsg = data?.error || data?.details?.error?.message || "Unknown error";
        setError(friendlyError(errMsg, res.status));
        setMsgs((prev) => [...prev, { role: "assistant", content: friendlyError(errMsg, res.status) }]);
        return;
      }
      const reply = data?.content?.find((b) => b.type === "text")?.text;
      if (reply) {
        setMsgs((prev) => [...prev, { role: "assistant", content: reply }]);
      } else {
        setMsgs((prev) => [
          ...prev,
          { role: "assistant", content: "No text reply was returned. Please try a more specific question." },
        ]);
      }
    } catch (err) {
      const msg =
        err?.message?.includes("Failed to fetch") || !navigator.onLine
          ? "Network unavailable. Check your connection and try again."
          : `Network error: ${err.message}`;
      setError(msg);
      setMsgs((prev) => [...prev, { role: "assistant", content: msg }]);
    } finally {
      setBusy(false);
    }
  };

  const onKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  const onInput = (e) => {
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 140) + "px";
    setInput(el.value);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      <div
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        style={{ flex: 1, overflowY: "auto", padding: "16px 12px", maxWidth: 720, width: "100%", margin: "0 auto" }}
      >
        <div
          style={{
            marginBottom: 14,
            padding: "12px 14px",
            background: "var(--iseyc-white)",
            border: "1px solid var(--iseyc-border)",
            borderRadius: "var(--radius-md)",
          }}
        >
          <p style={{ margin: "0 0 6px", fontSize: 12, fontWeight: 600, color: "var(--iseyc-forest)" }}>
            Evidence boundaries
          </p>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "var(--iseyc-ink-secondary)", lineHeight: 1.45 }}>
            {TOOL_LIMITS.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <p style={{ margin: "8px 0 0", fontSize: 11 }}>
            <a href={MANDATE_URL} target="_blank" rel="noopener noreferrer" style={{ color: "var(--iseyc-forest)" }}>
              Open Civic Mandate Nigeria
            </a>
            {" · "}
            <a href={MANDATE_URL + "/methodology"} target="_blank" rel="noopener noreferrer" style={{ color: "var(--iseyc-forest)" }}>
              Methodology
            </a>
          </p>
        </div>
        {msgs.map((m, i) =>
          m.role === "user" ? (
            <div key={i} style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
              <div
                style={{
                  maxWidth: "88%",
                  background: "var(--iseyc-forest)",
                  color: "var(--iseyc-cream)",
                  borderRadius: "var(--radius-md)",
                  padding: "10px 14px",
                  fontSize: 14,
                  lineHeight: 1.55,
                }}
              >
                {m.content}
              </div>
            </div>
          ) : (
            <Card key={i} style={{ marginBottom: 12, maxWidth: "100%" }}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "var(--iseyc-ink-muted)",
                  marginBottom: 6,
                }}
              >
                Civic Brain
              </div>
              <Markdown text={m.content} />
            </Card>
          )
        )}
        {busy && (
          <Card style={{ marginBottom: 12 }} aria-busy="true">
            <p style={{ margin: 0, fontSize: 13, color: "var(--iseyc-ink-muted)" }}>
              Retrieving published evidence…
            </p>
          </Card>
        )}
        {error && (
          <div
            role="alert"
            style={{
              background: "var(--iseyc-danger-bg)",
              color: "var(--iseyc-danger-text)",
              border: "1px solid rgba(92,42,42,0.2)",
              borderRadius: "var(--radius-sm)",
              padding: "10px 12px",
              fontSize: 13,
              marginBottom: 12,
            }}
          >
            {error}
          </div>
        )}
        <div ref={endRef} />
      </div>

      {msgs.length <= 1 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 8,
            padding: "0 12px 12px",
            maxWidth: 720,
            width: "100%",
            margin: "0 auto",
          }}
        >
          {SUGGESTIONS.map((s) => (
            <button
              key={s.label}
              type="button"
              disabled={busy}
              onClick={() => send(s.prompt)}
              style={{
                minHeight: 44,
                textAlign: "left",
                padding: "10px 12px",
                fontSize: 12,
                fontWeight: 600,
                fontFamily: "var(--font-body)",
                color: "var(--iseyc-forest)",
                background: "var(--iseyc-white)",
                border: "1px solid var(--iseyc-border)",
                borderRadius: "var(--radius-sm)",
                cursor: busy ? "not-allowed" : "pointer",
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      <div
        style={{
          borderTop: "1px solid var(--iseyc-border)",
          background: "var(--iseyc-white)",
          padding: "10px 12px 14px",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "flex-end",
            maxWidth: 720,
            margin: "0 auto",
          }}
        >
          <label htmlFor="civic-q" className="sr-only">
            Ask about published civic records
          </label>
          <textarea
            id="civic-q"
            ref={taRef}
            value={input}
            onChange={onInput}
            onKeyDown={onKey}
            placeholder="Ask about published civic records…"
            disabled={busy}
            rows={1}
            style={{
              flex: 1,
              minHeight: 44,
              maxHeight: 140,
              resize: "none",
              padding: "10px 12px",
              fontSize: 14,
              fontFamily: "var(--font-body)",
              color: "var(--iseyc-ink)",
              background: "var(--iseyc-cream)",
              border: "1px solid var(--iseyc-border-strong)",
              borderRadius: "var(--radius-sm)",
              lineHeight: 1.45,
            }}
          />
          <button
            type="button"
            onClick={() => send(input)}
            disabled={busy || !input.trim()}
            style={{
              minHeight: 44,
              minWidth: 72,
              padding: "0 14px",
              fontSize: 13,
              fontWeight: 700,
              fontFamily: "var(--font-body)",
              color: "var(--iseyc-cream)",
              background: busy || !input.trim() ? "var(--iseyc-ink-muted)" : "var(--iseyc-forest)",
              border: "none",
              borderRadius: "var(--radius-sm)",
              cursor: busy || !input.trim() ? "not-allowed" : "pointer",
            }}
          >
            Ask
          </button>
        </div>
      </div>
    </div>
  );
}
