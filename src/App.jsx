import { useState, useRef, useEffect } from "react";

const BRAND = {
  forest:  "#1A3C1A",
  forestL: "#244D24",
  forestD: "#122812",
  gold:    "#C9A84C",
  goldL:   "#E2C068",
  cream:   "#F5F1E8",
  creamD:  "#EDE8DA",
  muted:   "#6B7280",
};

const SYSTEM_PROMPT = `You are ISEYC Civic Brain — the official Institutional AI Architect and Strategic Intelligence System for the Initiative for Sustainable Evolution for Youth and Community (ISEYC).

IDENTITY & PHILOSOPHY
ISEYC is a youth-led, non-partisan, national movement — not a regular NGO. Slogan: "Empowering Youth, Shaping Communities – Every Street. Every Voice. Accountable Leadership."
Youth are not leaders of tomorrow — they are change makers of today. Nigeria's governance challenges stem from both bad leadership and weak followership. ISEYC is not fighting the system — it is entering the system to change it through structured responsibility, data, institutions, and organized citizen voice.

HEADQUARTERS: Abuja, FCT (national coordination)
GRASSROOTS PILOT: Kaduna State → Northwest → National
National President: Comr. Zulqarnain

ORGANIZATIONAL STRUCTURE
5 Departments: Education | Health & Wellbeing | Software & Technology | Graphic Design & Creativity | Business & Investment
7 Responsibility Pillars (4-tier delivery: Street Rep → Line Coordinator → Ward Coordinator → Central Leadership):
1. Community Safety & Emergency
2. Health Awareness
3. Youth Development & Education
4. Economic Linkages
5. Sanitation & Environment
6. Community Data & Intelligence
7. Community Voice
Governance: Presidential Council | Board of Trustees | Advisory Council

CORE CAPABILITIES
1. Grassroots Intelligence & Mobilization — synthesize 7-pillar reports, ward summaries, scaling strategy
2. Leadership Accountability Tracker — non-partisan scorecards for NASS, Governors, LGAs; monthly awards; right-of-reply mechanism
3. Departmental Support — strategies, content, reports, cross-department coordination
4. National Scaling Strategy — Kaduna South pilot → Northwest → National

RESPONSE STYLE
- Institutional, visionary, professional, authoritative
- Solution-oriented, systems-focused
- Always tie outputs to core philosophy: "Enter the system to change the system"
- Use data, structure, and measurable outcomes. Non-partisan. Non-inflammatory.
- End major strategic outputs with: "Empowering Youth, Shaping Communities — Every Street. Every Voice. Accountable Leadership."

CONTEXT
- Current date: June 2026. 2027 Nigerian general elections are 13 months away.
- Kaduna South is the active pilot zone. Abuja HQ handles national coordination.
- The Kaduna Proof of Concept must be documented and publishable by December 2026.
- Contact: iseycglobal@gmail.com | +234 803 698 4766 | www.iseyc.com.ng`;

const QUICK_ACTIONS = [
  { icon: "🗺️", label: "Kaduna Pilot Setup",      prompt: "Generate a complete Kaduna South pilot ward setup plan for Phase 0 — ward selection criteria, Street Representative recruitment structure, and the baseline Community Needs Assessment framework." },
  { icon: "📊", label: "Accountability Scorecard", prompt: "Build the complete Leadership Accountability Scorecard framework for Kaduna — criteria, weightings, monthly tracking methodology, and the Senator/Rep/Governor of the Month award structure." },
  { icon: "🏛️", label: "7 Pillars Activation",    prompt: "Give me a month-by-month activation plan for all 7 Responsibility Pillars across our Kaduna South pilot wards, with one documented, measurable activity per pillar per month." },
  { icon: "💰", label: "Funding Pipeline",         prompt: "Identify the top 10 most suitable grant opportunities for ISEYC right now — EU, USAID, MacArthur, Ford, UNDP, OSIWA and others — with deadlines, fit assessment, and priority ranking." },
  { icon: "📡", label: "Media Strategy",           prompt: "Build ISEYC's earned media strategy for July–December 2026 — NTA Kaduna, Daily Trust, Channels, Arise, and social media — anchored to the Kaduna pilot and Leadership Accountability Tracker launches." },
  { icon: "🚀", label: "National Scaling Plan",    prompt: "Develop the national scaling roadmap from Kaduna South → Northwest → National, with state-by-state sequencing, replication criteria, and milestone gates for each expansion phase." },
  { icon: "📋", label: "Kaduna Civic Report",      prompt: "Generate the full outline and template structure for the Kaduna Civic Report 2026 — the flagship evidence document for the Governor, NASS members, INEC, international partners, and donors." },
  { icon: "🏢", label: "Department Briefs",        prompt: "Generate a strategic brief for each of ISEYC's 5 departments — Education, Health & Wellbeing, Software & Technology, Graphic Design & Creativity, and Business & Investment — with Kaduna pilot roles and Q3 2026 priorities." },
];

const PILLARS = [
  { name: "Community Safety & Emergency",  desc: "Map safety infrastructure per street. Emergency response protocols per ward." },
  { name: "Health Awareness",              desc: "Monthly screenings at markets and schools. Referral tracking and health data." },
  { name: "Youth Development & Education", desc: "Homework clubs, reading circles, skills workshops for young people." },
  { name: "Economic Linkages",             desc: "Micro-trader database. Market linkages. Business registration support." },
  { name: "Sanitation & Environment",      desc: "Monthly clean-ups. Environmental mapping. Waste tonnage data." },
  { name: "Community Data & Intelligence", desc: "Household surveys. Ward-level datasets. Real-time reports to Abuja HQ." },
  { name: "Community Voice",               desc: "Monthly townhalls. Issue logs. Accountability demands and follow-up tracking." },
];

const PHASES = [
  { label: "Phase 0 — Structural Setup",     date: "Now – Jul 2026",  active: true,  desc: "Ward selection, recruit Street Reps, baseline data collection" },
  { label: "Phase 1 — 7 Pillars Activation", date: "Jul – Sep 2026", active: false, desc: "One documented activity per pillar per ward per month" },
  { label: "Phase 2 — Accountability Tracker",date: "Aug 2026",       active: false, desc: "Kaduna Senator/Rep/Governor scorecards go live" },
  { label: "Phase 3 — Publish & Present",    date: "Oct – Dec 2026", active: false, desc: "Kaduna Civic Report, Replication Manual, 2027 Declaration" },
];

const PRIORITIES = [
  { task: "Finalize 3–5 pilot wards in Kaduna South",        due: "Jun 28" },
  { task: "Design Street Rep recruitment flyer",              due: "Jun 30" },
  { task: "Build Community Needs Assessment questionnaire",   due: "Jun 30" },
  { task: "Set up Ward Operations Dashboard (Google Sheets)", due: "Jun 30" },
  { task: "Draft Accountability Scorecard criteria",          due: "Jul 5"  },
  { task: "Write to NTA Kaduna — media partnership",         due: "Jul 7"  },
];

function InlineText({ text }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return (
    <>
      {parts.map((p, i) => {
        if (p.startsWith("**") && p.endsWith("**")) return <strong key={i} style={{ color: "#E2C068" }}>{p.slice(2,-2)}</strong>;
        if (p.startsWith("*") && p.endsWith("*")) return <em key={i} style={{ color: "#EDE8DA" }}>{p.slice(1,-1)}</em>;
        if (p.startsWith("`") && p.endsWith("`")) return <code key={i} style={{ background: "#050d05", color: "#C9A84C", padding: "1px 5px", borderRadius: 3, fontSize: "0.9em", fontFamily: "monospace" }}>{p.slice(1,-1)}</code>;
        return <span key={i}>{p}</span>;
      })}
    </>
  );
}

function Markdown({ text }) {
  const lines = text.split("\n");
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const l = lines[i];
    if (l.startsWith("# ")) { out.push(<h2 key={i} style={{ color: "#C9A84C", fontSize: 15, fontWeight: 700, fontFamily: "Georgia,serif", margin: "14px 0 5px" }}>{l.slice(2)}</h2>); }
    else if (l.startsWith("## ")) { out.push(<h3 key={i} style={{ color: "#E2C068", fontSize: 13, fontWeight: 700, fontFamily: "Georgia,serif", margin: "12px 0 4px", borderBottom: "1px solid #C9A84C30", paddingBottom: 3 }}>{l.slice(3)}</h3>); }
    else if (l.startsWith("### ")) { out.push(<h4 key={i} style={{ color: "#F5F1E8", fontSize: 11, fontWeight: 700, margin: "10px 0 3px", textTransform: "uppercase", letterSpacing: 0.8 }}>{l.slice(4)}</h4>); }
    else if (l.match(/^\|/)) {
      const rows = [];
      while (i < lines.length && lines[i].startsWith("|")) { if (!lines[i].includes("---")) rows.push(lines[i].split("|").filter(c => c.trim()).map(c => c.trim())); i++; }
      out.push(<div key={`t${i}`} style={{ overflowX: "auto", margin: "10px 0" }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}><thead><tr>{rows[0]?.map((c,ci) => <th key={ci} style={{ background: "#050d05", color: "#C9A84C", padding: "6px 10px", textAlign: "left", fontSize: 10, fontWeight: 700, borderBottom: "2px solid #C9A84C" }}>{c}</th>)}</tr></thead><tbody>{rows.slice(1).map((row,ri) => <tr key={ri} style={{ background: ri%2===0 ? "#1A3C1A25" : "transparent" }}>{row.map((c,ci) => <td key={ci} style={{ padding: "6px 10px", color: "#F5F1E8", fontSize: 11, borderBottom: "1px solid #1A3C1A50", verticalAlign: "top" }}><InlineText text={c} /></td>)}</tr>)}</tbody></table></div>);
      continue;
    }
    else if (l.startsWith("- ") || l.startsWith("• ")) { out.push(<div key={i} style={{ display: "flex", gap: 8, margin: "3px 0" }}><span style={{ color: "#C9A84C", flexShrink: 0 }}>▸</span><span style={{ color: "#F5F1E8", fontSize: 12, lineHeight: 1.65 }}><InlineText text={l.slice(2)} /></span></div>); }
    else if (/^\d+\.\s/.test(l)) { const n = l.match(/^(\d+)/)[1]; out.push(<div key={i} style={{ display: "flex", gap: 8, margin: "4px 0" }}><span style={{ color: "#C9A84C", fontWeight: 700, fontSize: 11, minWidth: 18, flexShrink: 0 }}>{n}.</span><span style={{ color: "#F5F1E8", fontSize: 12, lineHeight: 1.65 }}><InlineText text={l.replace(/^\d+\.\s/, "")} /></span></div>); }
    else if (l.startsWith("---")) { out.push(<div key={i} style={{ borderTop: "1px solid #C9A84C35", margin: "12px 0" }} />); }
    else if (l.trim() === "") { out.push(<div key={i} style={{ height: 5 }} />); }
    else { out.push(<p key={i} style={{ color: "#F5F1E8", fontSize: 12, lineHeight: 1.7, margin: "3px 0" }}><InlineText text={l} /></p>); }
    i++;
  }
  return <div>{out}</div>;
}

function Logo({ size = 34 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <circle cx="20" cy="20" r="19" fill="#0a150a" stroke="#C9A84C" strokeWidth="1.5" />
      <circle cx="20" cy="20" r="13" fill="none" stroke="#C9A84C" strokeWidth="0.5" opacity="0.5" />
      <text x="20" y="24" textAnchor="middle" fill="#C9A84C" fontSize="10" fontWeight="800" fontFamily="Georgia,serif">IS</text>
      <text x="20" y="31" textAnchor="middle" fill="#E2C068" fontSize="4.5" fontFamily="Georgia,serif" letterSpacing="1.2">EYIC</text>
    </svg>
  );
}

function ThinkingDots() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "10px 14px" }}>
      {[0,1,2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "#C9A84C", animation: `cb-pulse 1.3s ease-in-out ${i*0.22}s infinite` }} />)}
      <span style={{ color: "#6B7280", fontSize: 10, marginLeft: 5, fontFamily: "Georgia,serif", fontStyle: "italic" }}>Civic Brain processing…</span>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState("chat");
  const [messages, setMessages] = useState([{ role: "assistant", content: `# ISEYC Civic Brain — Activated\n\n**Institutional AI Architect & Strategic Intelligence System**\n\nI am fully operational and calibrated to ISEYC's mission, structure, and Nigeria's governance realities.\n\n- **Active pilot zone:** Kaduna South (Phase 0 — structural setup)\n- **HQ coordination:** Abuja, FCT\n- **Scaling sequence:** Kaduna → Northwest → National\n- **Electoral window:** 13 months to 2027 general elections — infrastructure time is NOW\n\nUse the quick actions below or ask me anything directly.\n\n---\n\n*Empowering Youth, Shaping Communities — Every Street. Every Voice. Accountable Leadership.*` }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const taRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  // KEY FIX: call /api/chat proxy instead of Anthropic directly
  const send = async (content) => {
    if (!content.trim() || loading) return;
    const next = [...messages, { role: "user", content: content.trim() }];
    setMessages(next);
    setInput("");
    if (taRef.current) taRef.current.style.height = "40px";
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: SYSTEM_PROMPT,
          messages: next.map(m => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      const reply = data.content?.find(b => b.type === "text")?.text || "No response received.";
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: "assistant", content: "**Connection error.** Please try again." }]);
    } finally { setLoading(false); }
  };

  const onKey = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } };
  const onInput = (e) => { const el = e.target; el.style.height = "auto"; el.style.height = Math.min(el.scrollHeight, 130) + "px"; setInput(el.value); };
  const TABS = [{ id: "chat", label: "Strategic Chat" }, { id: "dashboard", label: "Kaduna Dashboard" }, { id: "pillars", label: "7 Pillars" }];
  const showQuick = messages.length <= 1;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "linear-gradient(160deg,#122812 0%,#0a150a 45%,#050d05 100%)", fontFamily: "Georgia,serif", overflow: "hidden" }}>
      <style>{`*{box-sizing:border-box;margin:0;padding:0;}::-webkit-scrollbar{width:3px;}::-webkit-scrollbar-thumb{background:#C9A84C40;border-radius:2px;}@keyframes cb-pulse{0%,100%{opacity:.25;transform:scale(.75)}50%{opacity:1;transform:scale(1)}}textarea{outline:none;font-family:Georgia,serif;}textarea::placeholder{color:#6B7280;}.cb-qa:hover{background:#1A3C1A !important;border-color:#C9A84C70 !important;}.cb-act:hover{background:#C9A84C25 !important;}`}</style>

      {/* Header */}
      <div style={{ background: "linear-gradient(90deg,#0a150a 0%,#1A3C1A 50%,#0a150a 100%)", borderBottom: "2px solid #C9A84C", padding: "0 18px", height: 54, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <Logo size={36} />
          <div><div style={{ fontSize: 14, fontWeight: 700, color: "#C9A84C" }}>ISEYC Civic Brain</div><div style={{ fontSize: 8.5, color: "#E2C068", letterSpacing: 1.8, textTransform: "uppercase", marginTop: 1 }}>Institutional AI Intelligence System</div></div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 7px #22c55e" }} />
          <span style={{ fontSize: 9, color: "#6B7280", letterSpacing: 1, textTransform: "uppercase" }}>Operational · Kaduna Pilot</span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid #C9A84C20", background: "#0a150a", flexShrink: 0, padding: "0 14px" }}>
        {TABS.map(t => <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "9px 15px", fontSize: 11, fontWeight: tab===t.id?700:400, color: tab===t.id?"#C9A84C":"#6B7280", background: "none", border: "none", borderBottom: tab===t.id?"2px solid #C9A84C":"2px solid transparent", cursor: "pointer", letterSpacing: 0.4 }}>{t.label}</button>)}
      </div>

      {/* CHAT */}
      {tab === "chat" && (
        <>
          <div style={{ flex: 1, overflowY: "auto", padding: "18px 14px 0" }}>
            {messages.map((msg, i) => msg.role==="user" ? (
              <div key={i} style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
                <div style={{ maxWidth: "76%", background: "#1A3C1A", border: "1px solid #C9A84C40", borderRadius: "14px 4px 14px 14px", padding: "9px 13px", color: "#F5F1E8", fontSize: 12, lineHeight: 1.6 }}>{msg.content}</div>
              </div>
            ) : (
              <div key={i} style={{ display: "flex", gap: 9, marginBottom: 18, alignItems: "flex-start" }}>
                <div style={{ flexShrink: 0, marginTop: 2 }}><Logo size={27} /></div>
                <div style={{ flex: 1, background: "linear-gradient(135deg,#0f1f0f,#050d05)", border: "1px solid #C9A84C28", borderRadius: "4px 14px 14px 14px", padding: "12px 15px", position: "relative" }}>
                  <div style={{ position: "absolute", top: 7, right: 11, fontSize: 8, color: "#C9A84C", opacity: 0.6, letterSpacing: 1, textTransform: "uppercase" }}>Civic Brain</div>
                  <div style={{ marginTop: 3 }}><Markdown text={msg.content} /></div>
                </div>
              </div>
            ))}
            {loading && <div style={{ display: "flex", gap: 9, marginBottom: 16, alignItems: "flex-start" }}><div style={{ flexShrink: 0 }}><Logo size={27} /></div><div style={{ background: "linear-gradient(135deg,#0f1f0f,#050d05)", border: "1px solid #C9A84C28", borderRadius: "4px 14px 14px 14px" }}><ThinkingDots /></div></div>}
            <div ref={bottomRef} />
          </div>
          {showQuick && <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7, padding: "10px 14px" }}>{QUICK_ACTIONS.map((a,i) => <button key={i} className="cb-qa" onClick={() => send(a.prompt)} style={{ background: "#1A3C1A55", border: "1px solid #C9A84C28", borderRadius: 8, padding: "8px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 7, transition: "all 0.2s" }}><span style={{ fontSize: 15 }}>{a.icon}</span><span style={{ fontSize: 10, fontWeight: 600, color: "#F5F1E8" }}>{a.label}</span></button>)}</div>}
          <div style={{ padding: "10px 14px 14px", borderTop: "1px solid #C9A84C18", background: "#0a150a", flexShrink: 0 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
              <textarea ref={taRef} value={input} onChange={onInput} onKeyDown={onKey} placeholder="Ask the Civic Brain — strategy, frameworks, accountability, scaling…" disabled={loading} rows={1} style={{ flex: 1, background: "#1A3C1A35", border: "1px solid #C9A84C40", borderRadius: 10, color: "#F5F1E8", fontSize: 12, padding: "10px 13px", resize: "none", lineHeight: 1.5, minHeight: 40, maxHeight: 130, overflowY: "auto" }} />
              <button disabled={loading||!input.trim()} onClick={() => send(input)} style={{ width: 40, height: 40, borderRadius: 10, background: loading?"#1A3C1A60":"linear-gradient(135deg,#C9A84C,#E2C068)", border: "none", cursor: loading?"not-allowed":"pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13" stroke={loading?"#6B7280":"#0a150a"} strokeWidth="2.5" strokeLinecap="round"/><path d="M22 2L15 22L11 13L2 9L22 2Z" stroke={loading?"#6B7280":"#0a150a"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </div>
            <div style={{ fontSize: 8.5, color: "#6B7280", marginTop: 5, textAlign: "center", letterSpacing: 0.5 }}>ISEYC Civic Brain · Non-partisan · Institutional · Confidential</div>
          </div>
        </>
      )}

      {/* DASHBOARD */}
      {tab === "dashboard" && (
        <div style={{ flex: 1, overflowY: "auto", padding: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 12 }}>
            {[{v:"3–5",l:"Pilot Wards",s:"Kaduna South"},{v:"13",l:"Months to 2027",s:"Electoral window"},{v:"7",l:"Pillars",s:"Deploying Jul 2026"}].map((s,i) => <div key={i} style={{ background: "linear-gradient(135deg,#0f1f0f,#050d05)", border: "1px solid #C9A84C25", borderRadius: 10, padding: 12, textAlign: "center" }}><div style={{ fontSize: 24, fontWeight: 700, color: "#C9A84C", fontFamily: "Georgia,serif" }}>{s.v}</div><div style={{ fontSize: 10, color: "#F5F1E8", fontWeight: 600, marginTop: 2 }}>{s.l}</div><div style={{ fontSize: 8.5, color: "#6B7280", marginTop: 1 }}>{s.s}</div></div>)}
          </div>
          <div style={{ background: "linear-gradient(135deg,#0f1f0f,#050d05)", border: "1px solid #C9A84C25", borderRadius: 10, padding: 14, marginBottom: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#C9A84C", letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>🚀 National Scaling Sequence</div>
            {["Kaduna South Pilot (3–5 Wards)","Kaduna State (All 3 Senatorial Zones)","Northwest Zone (7 States)","North Central + FCT Corridor","National — All 36 States + FCT"].map((s,i) => <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 9 }}><div style={{ width: 22, height: 22, borderRadius: "50%", flexShrink: 0, background: i===0?"#C9A84C":"#C9A84C18", border: `1px solid ${i===0?"#C9A84C":"#C9A84C35"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: i===0?"#0a150a":"#6B7280" }}>{i+1}</div><span style={{ fontSize: 11, color: i===0?"#F5F1E8":"#6B7280", fontWeight: i===0?600:400 }}>{s}</span>{i===0&&<span style={{ fontSize: 8, background: "#C9A84C20", color: "#C9A84C", border: "1px solid #C9A84C45", borderRadius: 10, padding: "2px 7px" }}>ACTIVE</span>}</div>)}
          </div>
          <div style={{ background: "linear-gradient(135deg,#0f1f0f,#050d05)", border: "1px solid #C9A84C25", borderRadius: 10, padding: 14, marginBottom: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#C9A84C", letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>📅 Kaduna Pilot Roadmap 2026</div>
            {PHASES.map((p,i) => <div key={i} style={{ display: "flex", gap: 10, marginBottom: 11, alignItems: "flex-start" }}><div style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, marginTop: 4, background: p.active?"#22c55e":"#C9A84C35", boxShadow: p.active?"0 0 6px #22c55e":"none" }}/><div><div style={{ fontSize: 11, fontWeight: 700, color: p.active?"#F5F1E8":"#6B7280" }}>{p.label}</div><div style={{ fontSize: 9, color: "#C9A84C", margin: "1px 0" }}>{p.date}</div><div style={{ fontSize: 10, color: "#6B7280", lineHeight: 1.4 }}>{p.desc}</div></div></div>)}
          </div>
          <div style={{ background: "linear-gradient(135deg,#0f1f0f,#050d05)", border: "1px solid #C9A84C25", borderRadius: 10, padding: 14, marginBottom: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#C9A84C", letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>⚡ Priority Actions — This Week</div>
            {PRIORITIES.map((p,i) => <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: i<PRIORITIES.length-1?8:0, paddingBottom: i<PRIORITIES.length-1?8:0, borderBottom: i<PRIORITIES.length-1?"1px solid #C9A84C10":"none" }}><div style={{ display: "flex", gap: 7, flex: 1 }}><span style={{ color: "#C9A84C", flexShrink: 0 }}>▸</span><span style={{ fontSize: 11, color: "#F5F1E8", lineHeight: 1.4 }}>{p.task}</span></div><span style={{ fontSize: 9, color: "#C9A84C", background: "#C9A84C15", borderRadius: 4, padding: "2px 6px", flexShrink: 0, marginLeft: 8 }}>{p.due}</span></div>)}
          </div>
          <div style={{ textAlign: "center", padding: "6px 0 8px" }}>
            <div style={{ fontSize: 9, color: "#C9A84C", letterSpacing: 1.5, textTransform: "uppercase", fontStyle: "italic" }}>Empowering Youth, Shaping Communities</div>
            <div style={{ fontSize: 8, color: "#6B7280", letterSpacing: 1, marginTop: 2 }}>Every Street. Every Voice. Accountable Leadership.</div>
          </div>
        </div>
      )}

      {/* PILLARS */}
      {tab === "pillars" && (
        <div style={{ flex: 1, overflowY: "auto", padding: 14 }}>
          <p style={{ fontSize: 10, color: "#6B7280", marginBottom: 12 }}>Tap <strong style={{ color: "#C9A84C" }}>Activate →</strong> to get the full Kaduna deployment plan for any pillar.</p>
          {PILLARS.map((p,i) => <div key={i} style={{ background: "linear-gradient(135deg,#0f1f0f,#050d05)", border: "1px solid #C9A84C22", borderRadius: 10, padding: 13, marginBottom: 9 }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}><div style={{ flex: 1 }}><div style={{ fontSize: 11, fontWeight: 700, color: "#F5F1E8", marginBottom: 4 }}><span style={{ color: "#C9A84C", marginRight: 6 }}>{i+1}.</span>{p.name}</div><div style={{ fontSize: 10, color: "#6B7280", lineHeight: 1.5 }}>{p.desc}</div></div><button className="cb-act" onClick={() => { setTab("chat"); send(`Give me the complete Kaduna pilot activation plan for Pillar ${i+1}: ${p.name} — including the specific monthly activity, how to document it, what data to collect, and what the measurable output looks like after 3 months.`); }} style={{ background: "#C9A84C12", border: "1px solid #C9A84C40", borderRadius: 7, padding: "5px 9px", cursor: "pointer", color: "#C9A84C", fontSize: 9, fontWeight: 700, flexShrink: 0, marginLeft: 10, transition: "all 0.2s", whiteSpace: "nowrap" }}>Activate →</button></div></div>)}
          <div style={{ background: "#C9A84C10", border: "1px solid #C9A84C35", borderRadius: 10, padding: 13, textAlign: "center" }}>
            <div style={{ fontSize: 10, color: "#C9A84C", fontWeight: 700, marginBottom: 9 }}>4-TIER DELIVERY SYSTEM</div>
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", flexWrap: "wrap", gap: 3 }}>
              {["Street Rep","Line Coord.","Ward Coord.","Central HQ"].map((tier,i) => <div key={i} style={{ display: "flex", alignItems: "center", gap: 3 }}><div style={{ fontSize: 10, color: i===3?"#C9A84C":"#F5F1E8", padding: "3px 8px", background: "#1A3C1A60", borderRadius: 5 }}>{tier}</div>{i<3&&<span style={{ color: "#C9A84C", fontSize: 11 }}>→</span>}</div>)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}