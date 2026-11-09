import { useState, useRef, useEffect } from "react";
import Markdown from "./Markdown.jsx";
import Card from "./ui/Card.jsx";
import EvidenceExplorer from "./EvidenceExplorer.jsx";
import CivicBriefCard from "./CivicBriefCard.jsx";
import { buildBoundedChatHistory } from "../../lib/chat-history.js";

const SUGGESTIONS = [
  { label: "Understand a community issue", prompt: "Explain what published community reports and official evidence show about health service gaps in Kaduna. Separate community reports, official facts, estimates and unknowns." },
  { label: "Check national evidence", prompt: "What official national indicators are available for Nigeria in health, education, employment and digital access? State reference years and distinguish measured, estimated and modelled values." },
  { label: "Find responsible institutions", prompt: "For a health service concern in Kaduna, explain which public institutions may have responsibilities and what evidence is needed to confirm jurisdiction. Do not claim a referral was sent." },
  { label: "Generate a structured Civic Brief", format: "civic_brief_v1", prompt: "Prepare a structured Civic Brief about public education conditions in Nigeria using only sources retrieved for this request and published community records. Keep national and subnational evidence separate. If evidence is insufficient, state the gaps." },
];

function safeEvidenceHref(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

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

const INTRO = `I connect published community records with available official evidence. I separate facts, community reports, estimates, analysis and unknowns. I can explain possible institutional responsibilities, but I cannot contact officials or declare an issue resolved.`;

export default function EvidenceWorkspace({ initialPrompt = "" }) {
  const [msgs, setMsgs] = useState([{ role: "assistant", content: INTRO }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef(null);
  const taRef = useRef(null);

  useEffect(() => { if (initialPrompt) setInput(initialPrompt); }, [initialPrompt]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, busy]);

  const send = async (content, options = {}) => {
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
          format: options.format || "narrative",
          messages: buildBoundedChatHistory(next),
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
        setMsgs((prev) => [...prev, { role: "assistant", content: reply, evidence: data.evidence || null, brief: data.briefValid === true ? data.brief : null, format: data.format || "narrative" }]);
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

  const newAnalysis = () => { if (busy) return; setMsgs([{ role: "assistant", content: INTRO }]); setInput(""); setError(""); };\n\n  const onKey = (e) => {
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
        style={{ flex: 1, overflowY: "auto", padding: "16px 12px", maxWidth: 900, width: "100%", margin: "0 auto" }}
      >
        <section style={{ borderRadius: 8, background: "var(--iseyc-forest-deep)", padding: "16px", color: "var(--iseyc-cream)", marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <div><p style={{ margin: 0, color: "var(--iseyc-gold-soft)", fontSize: 9, fontWeight: 800, letterSpacing: ".15em", textTransform: "uppercase" }}>ISEYC · Evidence intelligence</p><h1 className="display" style={{ margin: "4px 0 0", color: "var(--iseyc-cream)", fontSize: 22 }}>Ask Civic Brain</h1></div>
            <button type="button" onClick={newAnalysis} disabled={busy || msgs.length <= 1} style={{ minHeight: 36, padding: "0 10px", border: "1px solid rgba(220,203,155,.45)", borderRadius: 6, background: "transparent", color: "var(--iseyc-gold-soft)", fontSize: 11, fontWeight: 700, cursor: busy || msgs.length <= 1 ? "not-allowed" : "pointer", opacity: msgs.length <= 1 ? .5 : 1 }}>New analysis</button>
          </div>
          <p style={{ margin: "8px 0 0", maxWidth: 660, fontSize: 12, lineHeight: 1.5, color: "rgba(250,249,245,.78)" }}>Evidence-led explanations. Source dates, geography and uncertainty stay visible.</p>
        </section>
        <details style={{ marginBottom: 14, border: "1px solid var(--iseyc-border)", borderRadius: 8, background: "var(--iseyc-white)", padding: "10px 12px" }}>
          <summary style={{ cursor: "pointer", color: "var(--iseyc-forest)", fontSize: 12, fontWeight: 700 }}>Explore published community records</summary>
          <div style={{ marginTop: 10 }}><EvidenceExplorer onAsk={(prompt) => send(prompt)} /></div>
        </details>

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
                Civic Brief
              </div>
              {m.brief ? <CivicBriefCard brief={m.brief} /> : <Markdown text={m.content} />}
              {Array.isArray(m.evidence?.sources) && m.evidence.sources.length > 0 && (
                <section
                  aria-label="Evidence sources retrieved for this response"
                  style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--iseyc-border)" }}
                >
                  <h3 style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 700, color: "var(--iseyc-forest)" }}>
                    Evidence sources retrieved · {m.evidence.sources.length}
                  </h3>
                  <p style={{ margin: "0 0 8px", fontSize: 11, lineHeight: 1.5, color: "var(--iseyc-ink-secondary)" }}>
                    Retrieved source records available to the response. This list does not claim that every item was cited in the generated explanation.
                  </p>
                  <ul style={{ display: "grid", gap: 8, margin: 0, padding: 0, listStyle: "none" }}>
                    {m.evidence.sources.map((source) => {
                      const href = safeEvidenceHref(source.sourceUrl);
                      return (
                        <li key={source.id} style={{ borderLeft: "2px solid var(--iseyc-gold)", paddingLeft: 10 }}>
                          {href ? (
                            <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: "var(--iseyc-forest)", fontWeight: 650, textDecoration: "underline", textUnderlineOffset: 2 }}>
                              {source.title}
                            </a>
                          ) : (
                            <span style={{ color: "var(--iseyc-forest)", fontWeight: 650 }}>{source.title}</span>
                          )}
                          <p style={{ margin: "3px 0 0", fontSize: 11, lineHeight: 1.5, color: "var(--iseyc-ink-secondary)" }}>
                            {[source.publisher, source.sourceType?.replaceAll("_", " "), source.referenceDate, source.geoCoverage, source.verificationStatus].filter(Boolean).join(" · ")}
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              )}
              {m.evidence?.nationalEvidence && m.evidence.nationalEvidence.status !== "skipped" && (
                <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--iseyc-border)", fontSize: 11, color: "var(--iseyc-ink-secondary)" }}>
                  <div style={{ fontWeight: 700, color: "var(--iseyc-forest)", marginBottom: 6 }}>
                    INEC public evidence · {m.evidence.nationalEvidence.status}
                  </div>
                  {m.evidence.nationalEvidence.datasets?.map((source) => (
                    <div key={source.datasetId} style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 5 }}>
                      <a href={source.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--iseyc-forest)", textDecoration: "underline", textUnderlineOffset: 2 }}>
                        {source.title}
                      </a>
                      <span>· {source.referenceDate || "reference date not stated"}</span>
                    </div>
                  ))}
                  {m.evidence.nationalEvidence.status === "unavailable" && (
                    <div>No official INEC dataset was available for this answer. No substitute figures were used.</div>
                  )}
                  {m.evidence.nationalEvidence.status === "partial" && (
                    <div>Partial retrieval. Only the listed datasets were used.</div>
                  )}
                </div>
              )}
              {m.evidence?.observatoryIndicators && m.evidence.observatoryIndicators.status !== "skipped" && (
                <section aria-label="Observatory national indicator evidence" style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--iseyc-border)" }}>
                  <div style={{ fontWeight: 700, color: "var(--iseyc-forest)", fontSize: 11, marginBottom: 6 }}>National indicators · {m.evidence.observatoryIndicators.status}</div>
                  {m.evidence.observatoryIndicators.indicators?.length ? (
                    <ul style={{ display: "grid", gap: 7, margin: 0, padding: 0, listStyle: "none" }}>
                      {m.evidence.observatoryIndicators.indicators.map((item) => {
                        const href = safeEvidenceHref(item.sourceUrl);
                        return <li key={item.id} style={{ borderLeft: "2px solid var(--iseyc-gold)", paddingLeft: 10 }}>
                          {href ? <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: "var(--iseyc-forest)", fontWeight: 650, textDecoration: "underline" }}>{item.title}</a> : <strong>{item.title}</strong>}
                          <p style={{ margin: "3px 0 0", fontSize: 10, color: "var(--iseyc-ink-secondary)" }}>{[item.publisher, item.latestReferencePeriod, item.measurementType, "Nigeria national aggregate only"].filter(Boolean).join(" · ")}</p>
                        </li>;
                      })}
                    </ul>
                  ) : <p style={{ margin: 0, fontSize: 11, color: "var(--iseyc-ink-secondary)" }}>No national indicator was available for this question. No substitute values were used.</p>}
                </section>
              )}
            </Card>
          )
        )}
        {busy && (
          <Card style={{ marginBottom: 12 }} aria-busy="true">
            <p style={{ margin: 0, fontSize: 13, color: "var(--iseyc-ink-muted)" }}>
              Reading the public record…
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
            maxWidth: 900,
            width: "100%",
            margin: "0 auto",
          }}
        >
          {SUGGESTIONS.map((s) => (
            <button
              key={s.label}
              type="button"
              disabled={busy}
              onClick={() => send(s.prompt, { format: s.format })}
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
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end", maxWidth: 900, margin: "0 auto" }}>
          <label htmlFor="civic-q" className="sr-only">
            Ask Civic Brain about public evidence
          </label>
          <textarea
            id="civic-q"
            ref={taRef}
            value={input}
            onChange={onInput}
            onKeyDown={onKey}
            placeholder="Ask Civic Brain about the evidence, a community issue or an institution…"
            disabled={busy}
            rows={1}
            maxLength={4000}
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
            Analyse
          </button>
        </div>
      </div>
    </div>
  );
}
