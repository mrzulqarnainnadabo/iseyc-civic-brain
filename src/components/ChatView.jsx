import { useEffect, useRef } from "react";
import Logo from "./Logo";
import Markdown from "./Markdown";
import { COLORS, QUICK_ACTIONS } from "../data/civicBrain";

function ProcessingDots() {
  const { gold: G, muted: MU } = COLORS;
  return <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "10px 14px" }}>{[0, 1, 2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: G, animation: `dp 1.3s ease-in-out ${i * 0.22}s infinite` }} />)}<span style={{ color: MU, fontSize: 10, marginLeft: 6, fontStyle: "italic" }}>Civic Brain processing…</span></div>;
}

export default function ChatView({ messages, busy, debugMessage, input, onInput, onKeyDown, onSend }) {
  const { gold: G, goldLight: GL, cream: CR, forest: F, forestDark: FD, muted: MU } = COLORS;
  const endRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, busy]);

  const resetHeight = () => { if (textareaRef.current) textareaRef.current.style.height = "40px"; };
  const handleInput = event => { const element = event.target; element.style.height = "auto"; element.style.height = Math.min(element.scrollHeight, 120) + "px"; onInput(element.value); };
  const handleKeyDown = event => { onKeyDown(event); if (event.key === "Enter" && !event.shiftKey) resetHeight(); };
  const handleSend = () => { resetHeight(); onSend(input); };

  return <>
    <div style={{ flex: 1, overflowY: "auto", padding: "12px 12px 0" }}>
      {messages.map((message, index) => message.role === "user" ? (
        <div key={index} style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}><div style={{ maxWidth: "82%", background: `linear-gradient(135deg,${F},#214d21)`, border: `1px solid ${G}45`, borderRadius: "14px 4px 14px 14px", padding: "9px 13px", color: CR, fontSize: 12, lineHeight: 1.6, boxShadow: "0 7px 18px rgba(0,0,0,.12)" }}>{message.content}</div></div>
      ) : (
        <div key={index} style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "flex-start" }}><div style={{ flexShrink: 0, marginTop: 2, background: "#F5F1E8", borderRadius: 8, padding: 2 }}><Logo size={26} /></div><div style={{ flex: 1, background: "linear-gradient(135deg,#102310,#050d05)", border: `1px solid ${G}28`, borderRadius: "4px 14px 14px 14px", padding: "11px 14px", position: "relative", boxShadow: "0 8px 22px rgba(0,0,0,.1)" }}><div style={{ position: "absolute", top: 6, right: 10, fontSize: 7.5, color: G, opacity: 0.7, letterSpacing: 1, textTransform: "uppercase" }}>ISEYC Civic Brain</div><div style={{ marginTop: 2 }}><Markdown text={message.content} /></div></div></div>
      ))}
      {busy && <div style={{ display: "flex", gap: 8, marginBottom: 14, alignItems: "flex-start" }}><div style={{ background: "#F5F1E8", borderRadius: 8, padding: 2 }}><Logo size={26} /></div><div style={{ background: "linear-gradient(135deg,#102310,#050d05)", border: `1px solid ${G}28`, borderRadius: "4px 14px 14px 14px" }}><ProcessingDots /></div></div>}
      {debugMessage && <div style={{ background: "#1a0a0a", border: "1px solid #ef444430", borderRadius: 8, padding: "8px 12px", marginBottom: 12, fontSize: 10, color: "#ef4444", wordBreak: "break-word" }}>System debug: {debugMessage}</div>}
      <div ref={endRef} />
    </div>

    {messages.length <= 1 && <div style={{ padding: "8px 12px 10px" }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}><div style={{ fontSize: 8, color: GL, fontWeight: 800, letterSpacing: 1.2, textTransform: "uppercase" }}>Strategic command actions</div><div className="live-indicator" style={{ padding: "3px 6px", fontSize: 6.5 }}><span className="live-dot" /> Ready</div></div><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>{QUICK_ACTIONS.map((action, index) => <button key={index} className="qa" onClick={() => onSend(action.prompt)} style={{ background: `${F}55`, border: `1px solid ${G}25`, borderRadius: 8, padding: "8px 9px", cursor: "pointer", display: "flex", alignItems: "center", gap: 7, transition: "all 0.2s", textAlign: "left" }}><span style={{ fontSize: 14 }}>{action.icon}</span><span style={{ fontSize: 9.5, fontWeight: 700, color: CR, lineHeight: 1.25 }}>{action.label}</span></button>)}</div></div>}

    <div style={{ padding: "8px 12px 12px", borderTop: `1px solid ${G}15`, background: FD, flexShrink: 0 }}><div style={{ display: "flex", gap: 7, alignItems: "flex-end" }}><textarea ref={textareaRef} value={input} onChange={handleInput} onKeyDown={handleKeyDown} placeholder="Ask the Civic Brain — strategy, frameworks, accountability, scaling…" disabled={busy} rows={1} style={{ flex: 1, background: `${F}30`, border: `1px solid ${G}40`, borderRadius: 10, color: CR, fontSize: 12, padding: "9px 12px", resize: "none", lineHeight: 1.5, minHeight: 38, maxHeight: 120, overflowY: "auto" }} /><button onClick={handleSend} disabled={busy || !input.trim()} style={{ width: 38, height: 38, borderRadius: 10, background: busy ? `${F}60` : `linear-gradient(135deg,${G},${GL})`, border: "none", cursor: busy ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13" stroke={busy ? MU : FD} strokeWidth="2.5" strokeLinecap="round" /><path d="M22 2L15 22L11 13L2 9L22 2Z" stroke={busy ? MU : FD} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg></button></div><div style={{ fontSize: 7.5, color: MU, marginTop: 5, textAlign: "center", letterSpacing: .55 }}>ISEYC Civic Brain · Official institutional system · Non-partisan · Confidential</div></div>
  </>;
}
