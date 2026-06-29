import { useState, useRef, useEffect } from "react";

const G = "#C9A84C";
const GL = "#E2C068";
const CR = "#F5F1E8";
const F = "#1A3C1A";
const FD = "#0a150a";
const MU = "#6B7280";

const SYSTEM_PROMPT = `You are ISEYC Civic Brain — the official Institutional AI Architect and Strategic Intelligence System for the Initiative for Sustainable Evolution for Youth and Community (ISEYC).

ISEYC is a youth-led, non-partisan, national movement headquartered in Abuja, FCT. Grassroots pilot: Kaduna State → Northwest → National. National President: Comr. Zulqarnain.

5 Departments: Education | Health & Wellbeing | Software & Technology | Graphic Design & Creativity | Business & Investment

7 Responsibility Pillars: Community Safety & Emergency | Health Awareness | Youth Development & Education | Economic Linkages | Sanitation & Environment | Community Data & Intelligence | Community Voice

4-tier delivery: Street Rep → Line Coordinator → Ward Coordinator → Central Leadership

Governance: Presidential Council | Board of Trustees | Advisory Council

Capabilities: Grassroots Intelligence & Mobilization | Leadership Accountability Tracker (non-partisan scorecards, monthly awards) | Departmental Support | National Scaling Strategy

Style: Institutional, visionary, professional, authoritative. Non-partisan. End major outputs with the slogan: "Empowering Youth, Shaping Communities — Every Street. Every Voice. Accountable Leadership."

Context: June 2026. 13 months to 2027 elections. Kaduna South is active pilot zone. Kaduna PoC must be publishable by December 2026. Contact: iseycglobal@gmail.com | +234 803 698 4766 | www.iseyc.com.ng`;

const QUICK_ACTIONS = [
  { icon: "\uD83D\uDDFA\uFE0F", label: "Kaduna Pilot Setup", prompt: "Generate a complete Kaduna South pilot ward setup plan for Phase 0 — ward selection criteria, Street Representative recruitment structure, and the baseline Community Needs Assessment framework." },
  { icon: "\uD83D\uDCCA", label: "Accountability Scorecard", prompt: "Build the complete Leadership Accountability Scorecard framework for Kaduna — criteria, weightings, monthly tracking methodology, and the Senator/Rep/Governor of the Month award structure." },
  { icon: "\uD83C\uDFDB\uFE0F", label: "7 Pillars Activation", prompt: "Give me a month-by-month activation plan for all 7 Responsibility Pillars across our Kaduna South pilot wards, with one documented, measurable activity per pillar per month." },
  { icon: "\uD83D\uDCB0", label: "Funding Pipeline", prompt: "Identify the top 10 grant opportunities for ISEYC right now — EU, USAID, MacArthur, Ford, UNDP, OSIWA — with deadlines, fit assessment, and priority ranking." },
  { icon: "\uD83D\uDCE1", label: "Media Strategy", prompt: "Build ISEYC's earned media strategy for July–December 2026 — NTA Kaduna, Daily Trust, Channels, Arise, social media — anchored to the Kaduna pilot and Accountability Tracker launches." },
  { icon: "\uD83D\uDE80", label: "National Scaling Plan", prompt: "Develop the national scaling roadmap from Kaduna South to Northwest to National, with state-by-state sequencing, replication criteria, and milestone gates." },
  { icon: "\uD83D\uDCCB", label: "Kaduna Civic Report", prompt: "Generate the full outline for the Kaduna Civic Report 2026 — the flagship evidence document for the Governor, NASS members, INEC, international partners, and donors." },
  { icon: "\uD83C\uDFE2", label: "Department Briefs", prompt: "Generate a strategic brief for each of ISEYC's 5 departments — Education, Health & Wellbeing, Software & Technology, Graphic Design & Creativity, and Business & Investment — with Kaduna roles and Q3 2026 priorities." },
];

const PILLARS = [
  { name: "Community Safety & Emergency", desc: "Map safety infrastructure per street. Emergency response protocols per ward." },
  { name: "Health Awareness", desc: "Monthly screenings at markets and schools. Referral tracking and health data." },
  { name: "Youth Development & Education", desc: "Homework clubs, reading circles, skills workshops for young people." },
  { name: "Economic Linkages", desc: "Micro-trader database. Market linkages. Business registration support." },
  { name: "Sanitation & Environment", desc: "Monthly clean-ups. Environmental mapping. Waste tonnage data." },
  { name: "Community Data & Intelligence", desc: "Household surveys. Ward-level datasets. Real-time reports to Abuja HQ." },
  { name: "Community Voice", desc: "Monthly townhalls. Issue logs. Accountability demands and follow-up tracking." },
];

const PHASES = [
  { label: "Phase 0 — Structural Setup", date: "Now – Jul 2026", active: true, desc: "Ward selection, Street Reps, baseline data" },
  { label: "Phase 1 — 7 Pillars Activation", date: "Jul – Sep 2026", active: false, desc: "One activity per pillar per ward per month" },
  { label: "Phase 2 — Accountability Tracker", date: "Aug 2026", active: false, desc: "Kaduna Senator/Rep/Governor scorecards live" },
  { label: "Phase 3 — Publish & Present", date: "Oct – Dec 2026", active: false, desc: "Kaduna Civic Report + 2027 Declaration" },
];

const PRIORITIES = [
  { task: "Finalize 3–5 pilot wards in Kaduna South", due: "Jun 28" },
  { task: "Design Street Rep recruitment flyer", due: "Jun 30" },
  { task: "Build Community Needs Assessment questionnaire", due: "Jun 30" },
  { task: "Set up Ward Operations Dashboard (Google Sheets)", due: "Jun 30" },
  { task: "Draft Accountability Scorecard criteria", due: "Jul 5" },
  { task: "Write to NTA Kaduna — media partnership", due: "Jul 7" },
];

function Logo({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <circle cx="20" cy="20" r="19" fill={FD} stroke={G} strokeWidth="1.5" />
      <circle cx="20" cy="20" r="13" fill="none" stroke={G} strokeWidth="0.5" opacity="0.5" />
      <text x="20" y="23" textAnchor="middle" fill={G} fontSize="10" fontWeight="800" fontFamily="Georgia,serif">IS</text>
      <text x="20" y="30" textAnchor="middle" fill={GL} fontSize="4.5" fontFamily="Georgia,serif" letterSpacing="1">EYIC</text>
    </svg>
  );
}

function Dots() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "10px 14px" }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: G, animation: `dp 1.3s ease-in-out ${i * 0.22}s infinite` }} />
      ))}
      <span style={{ color: MU, fontSize: 10, marginLeft: 6, fontFamily: "Georgia,serif", fontStyle: "italic" }}>Civic Brain processing…</span>
    </div>
  );
}

function Md({ text }) {
  return (
    <div style={{ color: CR, fontSize: 12, lineHeight: 1.7 }}>
      {text.split("\n").map((line, i) => {
        if (line.startsWith("# ")) return <div key={i} style={{ color: G, fontSize: 15, fontWeight: 700, fontFamily: "Georgia,serif", margin: "12px 0 4px" }}>{line.slice(2)}</div>;
        if (line.startsWith("## ")) return <div key={i} style={{ color: GL, fontSize: 13, fontWeight: 700, margin: "10px 0 3px", borderBottom: `1px solid ${G}30`, paddingBottom: 2 }}>{line.slice(3)}</div>;
        if (line.startsWith("### ")) return <div key={i} style={{ color: CR, fontSize: 11, fontWeight: 700, margin: "8px 0 2px", textTransform: "uppercase", letterSpacing: 0.7 }}>{line.slice(4)}</div>;
        if (line.startsWith("- ") || line.startsWith("* ")) return <div key={i} style={{ display: "flex", gap: 7, margin: "2px 0" }}><span style={{ color: G }}>▸</span><span>{fmt(line.slice(2))}</span></div>;
        if (/^\d+\.\s/.test(line)) { const n = line.match(/^(\d+)/)[1]; return <div key={i} style={{ display: "flex", gap: 7, margin: "2px 0" }}><span style={{ color: G, minWidth: 16, fontWeight: 700 }}>{n}.</span><span>{fmt(line.replace(/^\d+\.\s/, ""))}</span></div>; }
        if (line.startsWith("---")) return <hr key={i} style={{ border: "none", borderTop: `1px solid ${G}30`, margin: "10px 0" }} />;
        if (!line.trim()) return <div key={i} style={{ height: 4 }} />;
        if (line.startsWith("|")) return <div key={i} style={{ color: GL, fontSize: 11 }}>{line}</div>;
        return <div key={i} style={{ margin: "2px 0" }}>{fmt(line)}</div>;
      })}
    </div>
  );
}

function fmt(text) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) return <strong key={i} style={{ color: GL }}>{p.slice(2, -2)}</strong>;
    if (p.startsWith("*") && p.endsWith("*")) return <em key={i}>{p.slice(1, -1)}</em>;
    if (p.startsWith("`") && p.endsWith("`")) return <code key={i} style={{ background: "#050d05", color: G, padding: "1px 4px", borderRadius: 3, fontSize: "0.88em", fontFamily: "monospace" }}>{p.slice(1, -1)}</code>;
    return p;
  });
}

export default function App() {
  const [tab, setTab] = useState("chat");
  const [msgs, setMsgs] = useState([{
    role: "assistant",
    content: `# ISEYC Civic Brain — Activated\n\n**Institutional AI Architect & Strategic Intelligence System**\n\nFully operational. Calibrated to ISEYC's mission and Nigeria's governance realities.\n\n- **Pilot zone:** Kaduna South — Phase 0 (structural setup)\n- **HQ:** Abuja, FCT\n- **Sequence:** Kaduna → Northwest → National\n- **Window:** 13 months to 2027 elections — time to build is NOW\n\nUse the quick actions or ask me anything directly.\n\n---\n*Empowering Youth, Shaping Communities — Every Street. Every Voice. Accountable Leadership.*`
  }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [debugMsg, setDebugMsg] = useState("");
  const endRef = useRef(null);
  const taRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, busy]);

  const send = async (content) => {
    if (!content.trim() || busy) return;
    const next = [...msgs, { role: "user", content: content.trim() }];
    setMsgs(next);
    setInput("");
    setDebugMsg("");
    if (taRef.current) taRef.current.style.height = "40px";
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: SYSTEM_PROMPT,
          messages: next.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      const raw = await res.text();
      console.log("Proxy status:", res.status);
      console.log("Proxy raw:", raw.slice(0, 400));

      let data;
      try { data = JSON.parse(raw); }
      catch { 
        setDebugMsg(`Parse error (status ${res.status}): ${raw.slice(0, 200)}`);
        setMsgs(prev => [...prev, { role: "assistant", content: `**Error:** Could not parse server response. Status: ${res.status}` }]);
        return;
      }

      if (!res.ok) {
        const errMsg = data?.error || data?.details?.error?.message || JSON.stringify(data);
        setDebugMsg(`API error ${res.status}: ${errMsg}`);
        setMsgs(prev => [...prev, { role: "assistant", content: `**API Error ${res.status}:** ${errMsg}` }]);
        return;
      }

      const reply = data?.content?.find(b => b.type === "text")?.text;
      if (reply) {
        setMsgs(prev => [...prev, { role: "assistant", content: reply }]);
      } else {
        setDebugMsg(`Unexpected response shape: ${JSON.stringify(data).slice(0, 300)}`);
        setMsgs(prev => [...prev, { role: "assistant", content: `**Unexpected response:** ${JSON.stringify(data).slice(0, 200)}` }]);
      }
    } catch (err) {
      setDebugMsg(`Fetch error: ${err.message}`);
      setMsgs(prev => [...prev, { role: "assistant", content: `**Network error:** ${err.message}` }]);
    } finally {
      setBusy(false);
    }
  };

  const onKey = e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } };
  const onInput = e => { const el = e.target; el.style.height = "auto"; el.style.height = Math.min(el.scrollHeight, 120) + "px"; setInput(el.value); };

  const TABS = [{ id: "chat", label: "Strategic Chat" }, { id: "dashboard", label: "Kaduna Dashboard" }, { id: "pillars", label: "7 Pillars" }];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: `linear-gradient(160deg,#122812 0%,${FD} 50%,#050d05 100%)`, fontFamily: "Georgia,serif", overflow: "hidden" }}>
      <style>{`*{box-sizing:border-box;margin:0;padding:0}::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:${G}40;border-radius:2px}@keyframes dp{0%,100%{opacity:.2;transform:scale(.7)}50%{opacity:1;transform:scale(1)}}textarea{outline:none;font-family:Georgia,serif}textarea::placeholder{color:${MU}}.qa:hover{background:${F}!important;border-color:${G}60!important}.act:hover{background:${G}20!important}`}</style>

      {/* HEADER */}
      <div style={{ background: `linear-gradient(90deg,${FD} 0%,${F} 50%,${FD} 100%)`, borderBottom: `2px solid ${G}`, height: 54, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Logo size={36} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: G }}>ISEYC Civic Brain</div>
            <div style={{ fontSize: 8, color: GL, letterSpacing: 2, textTransform: "uppercase" }}>Institutional AI Intelligence System</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 6px #22c55e" }} />
          <span style={{ fontSize: 8.5, color: MU, letterSpacing: 1, textTransform: "uppercase" }}>Operational · Kaduna</span>
        </div>
      </div>

      {/* TABS */}
      <div style={{ display: "flex", background: FD, borderBottom: `1px solid ${G}18`, padding: "0 12px", flexShrink: 0 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "9px 13px", fontSize: 11, fontWeight: tab === t.id ? 700 : 400, color: tab === t.id ? G : MU, background: "none", border: "none", borderBottom: tab === t.id ? `2px solid ${G}` : "2px solid transparent", cursor: "pointer" }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* CHAT */}
      {tab === "chat" && (
        <>
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 12px 0" }}>
            {msgs.map((m, i) => m.role === "user" ? (
              <div key={i} style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
                <div style={{ maxWidth: "78%", background: F, border: `1px solid ${G}40`, borderRadius: "14px 4px 14px 14px", padding: "9px 13px", color: CR, fontSize: 12, lineHeight: 1.6 }}>{m.content}</div>
              </div>
            ) : (
              <div key={i} style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "flex-start" }}>
                <div style={{ flexShrink: 0, marginTop: 2 }}><Logo size={26} /></div>
                <div style={{ flex: 1, background: `linear-gradient(135deg,#0f1f0f,#050d05)`, border: `1px solid ${G}25`, borderRadius: "4px 14px 14px 14px", padding: "11px 14px", position: "relative" }}>
                  <div style={{ position: "absolute", top: 6, right: 10, fontSize: 7.5, color: G, opacity: 0.5, letterSpacing: 1, textTransform: "uppercase" }}>Civic Brain</div>
                  <div style={{ marginTop: 2 }}><Md text={m.content} /></div>
                </div>
              </div>
            ))}
            {busy && (
              <div style={{ display: "flex", gap: 8, marginBottom: 14, alignItems: "flex-start" }}>
                <Logo size={26} />
                <div style={{ background: `linear-gradient(135deg,#0f1f0f,#050d05)`, border: `1px solid ${G}25`, borderRadius: "4px 14px 14px 14px" }}><Dots /></div>
              </div>
            )}
            {debugMsg && (
              <div style={{ background: "#1a0a0a", border: "1px solid #ef444430", borderRadius: 8, padding: "8px 12px", marginBottom: 12, fontSize: 10, color: "#ef4444", wordBreak: "break-all" }}>
                🔍 Debug: {debugMsg}
              </div>
            )}
            <div ref={endRef} />
          </div>

          {msgs.length <= 1 && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, padding: "8px 12px" }}>
              {QUICK_ACTIONS.map((a, i) => (
                <button key={i} className="qa" onClick={() => send(a.prompt)} style={{ background: `${F}55`, border: `1px solid ${G}25`, borderRadius: 8, padding: "8px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 7, transition: "all 0.2s" }}>
                  <span style={{ fontSize: 14 }}>{a.icon}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: CR }}>{a.label}</span>
                </button>
              ))}
            </div>
          )}

          <div style={{ padding: "8px 12px 12px", borderTop: `1px solid ${G}15`, background: FD, flexShrink: 0 }}>
            <div style={{ display: "flex", gap: 7, alignItems: "flex-end" }}>
              <textarea ref={taRef} value={input} onChange={onInput} onKeyDown={onKey} placeholder="Ask the Civic Brain — strategy, frameworks, accountability, scaling…" disabled={busy} rows={1}
                style={{ flex: 1, background: `${F}30`, border: `1px solid ${G}40`, borderRadius: 10, color: CR, fontSize: 12, padding: "9px 12px", resize: "none", lineHeight: 1.5, minHeight: 38, maxHeight: 120, overflowY: "auto" }} />
              <button onClick={() => send(input)} disabled={busy || !input.trim()}
                style={{ width: 38, height: 38, borderRadius: 10, background: busy ? `${F}60` : `linear-gradient(135deg,${G},${GL})`, border: "none", cursor: busy ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M22 2L11 13" stroke={busy ? MU : FD} strokeWidth="2.5" strokeLinecap="round" />
                  <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke={busy ? MU : FD} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
            <div style={{ fontSize: 8, color: MU, marginTop: 4, textAlign: "center", letterSpacing: 0.5 }}>ISEYC Civic Brain · Non-partisan · Institutional · Confidential</div>
          </div>
        </>
      )}

      {/* DASHBOARD */}
      {tab === "dashboard" && (
        <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 7, marginBottom: 10 }}>
            {[{ v: "3–5", l: "Pilot Wards", s: "Kaduna South" }, { v: "13", l: "Months to 2027", s: "Electoral window" }, { v: "7", l: "Pillars", s: "Deploying Jul 2026" }].map((s, i) => (
              <div key={i} style={{ background: "linear-gradient(135deg,#0f1f0f,#050d05)", border: `1px solid ${G}22`, borderRadius: 9, padding: 11, textAlign: "center" }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: G, fontFamily: "Georgia,serif" }}>{s.v}</div>
                <div style={{ fontSize: 10, color: CR, fontWeight: 600, marginTop: 1 }}>{s.l}</div>
                <div style={{ fontSize: 8, color: MU, marginTop: 1 }}>{s.s}</div>
              </div>
            ))}
          </div>

          {[{
            title: "🚀 National Scaling Sequence",
            content: ["Kaduna South Pilot (3–5 Wards)", "Kaduna State (All 3 Senatorial Zones)", "Northwest Zone (7 States)", "North Central + FCT Corridor", "National — All 36 States + FCT"].map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 8 }}>
                <div style={{ width: 20, height: 20, borderRadius: "50%", flexShrink: 0, background: i === 0 ? G : `${G}18`, border: `1px solid ${i === 0 ? G : G + "30"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: i === 0 ? FD : MU }}>{i + 1}</div>
                <span style={{ fontSize: 11, color: i === 0 ? CR : MU, fontWeight: i === 0 ? 600 : 400 }}>{s}</span>
                {i === 0 && <span style={{ fontSize: 8, background: `${G}18`, color: G, border: `1px solid ${G}40`, borderRadius: 10, padding: "1px 6px" }}>ACTIVE</span>}
              </div>
            ))
          }, {
            title: "📅 Kaduna Pilot Roadmap 2026",
            content: PHASES.map((p, i) => (
              <div key={i} style={{ display: "flex", gap: 9, marginBottom: 10 }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", flexShrink: 0, marginTop: 4, background: p.active ? "#22c55e" : `${G}30`, boxShadow: p.active ? "0 0 5px #22c55e" : "none" }} />
                <div><div style={{ fontSize: 11, fontWeight: 700, color: p.active ? CR : MU }}>{p.label}</div><div style={{ fontSize: 9, color: G }}>{p.date}</div><div style={{ fontSize: 10, color: MU }}>{p.desc}</div></div>
              </div>
            ))
          }, {
            title: "⚡ Priority Actions — This Week",
            content: PRIORITIES.map((p, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: i < PRIORITIES.length - 1 ? 7 : 0, paddingBottom: i < PRIORITIES.length - 1 ? 7 : 0, borderBottom: i < PRIORITIES.length - 1 ? `1px solid ${G}10` : "none" }}>
                <div style={{ display: "flex", gap: 6, flex: 1 }}><span style={{ color: G }}>▸</span><span style={{ fontSize: 11, color: CR }}>{p.task}</span></div>
                <span style={{ fontSize: 9, color: G, background: `${G}12`, borderRadius: 4, padding: "2px 5px", flexShrink: 0, marginLeft: 7 }}>{p.due}</span>
              </div>
            ))
          }].map((card, ci) => (
            <div key={ci} style={{ background: "linear-gradient(135deg,#0f1f0f,#050d05)", border: `1px solid ${G}22`, borderRadius: 9, padding: 13, marginBottom: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: G, letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>{card.title}</div>
              {card.content}
            </div>
          ))}

          <div style={{ textAlign: "center", padding: "4px 0 8px" }}>
            <div style={{ fontSize: 8.5, color: G, letterSpacing: 1.5, textTransform: "uppercase", fontStyle: "italic" }}>Empowering Youth, Shaping Communities</div>
            <div style={{ fontSize: 7.5, color: MU, letterSpacing: 1, marginTop: 2 }}>Every Street. Every Voice. Accountable Leadership.</div>
          </div>
        </div>
      )}

      {/* PILLARS */}
      {tab === "pillars" && (
        <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
          <p style={{ fontSize: 10, color: MU, marginBottom: 10 }}>Tap <strong style={{ color: G }}>Activate →</strong> for the full Kaduna deployment plan.</p>
          {PILLARS.map((p, i) => (
            <div key={i} style={{ background: "linear-gradient(135deg,#0f1f0f,#050d05)", border: `1px solid ${G}20`, borderRadius: 9, padding: 12, marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: CR, marginBottom: 3 }}><span style={{ color: G, marginRight: 5 }}>{i + 1}.</span>{p.name}</div>
                  <div style={{ fontSize: 10, color: MU, lineHeight: 1.5 }}>{p.desc}</div>
                </div>
                <button className="act" onClick={() => { setTab("chat"); send(`Give me the complete Kaduna pilot activation plan for Pillar ${i + 1}: ${p.name} — including the specific monthly activity, how to document it, what data to collect, and what the measurable output looks like after 3 months.`); }}
                  style={{ background: `${G}10`, border: `1px solid ${G}38`, borderRadius: 7, padding: "4px 8px", cursor: "pointer", color: G, fontSize: 9, fontWeight: 700, flexShrink: 0, marginLeft: 8, transition: "all 0.2s", whiteSpace: "nowrap" }}>Activate →</button>
              </div>
            </div>
          ))}
          <div style={{ background: `${G}10`, border: `1px solid ${G}32`, borderRadius: 9, padding: 12, textAlign: "center" }}>
            <div style={{ fontSize: 10, color: G, fontWeight: 700, marginBottom: 8 }}>4-TIER DELIVERY SYSTEM</div>
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", flexWrap: "wrap", gap: 3 }}>
              {["Street Rep", "Line Coord.", "Ward Coord.", "Central HQ"].map((t, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 3 }}>
                  <div style={{ fontSize: 10, color: i === 3 ? G : CR, padding: "3px 7px", background: `${F}60`, borderRadius: 4 }}>{t}</div>
                  {i < 3 && <span style={{ color: G, fontSize: 10 }}>→</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}