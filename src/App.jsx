import { useState } from "react";
import ChatView from "./components/ChatView";
import DashboardView from "./components/DashboardView";
import PillarsView from "./components/PillarsView";
import BrandIdentity from "./components/BrandIdentity";
import { COLORS, INITIAL_MESSAGE, SYSTEM_PROMPT, TABS } from "./data/civicBrain";
import { friendlyError, requestChat } from "./services/chatApi";
import "./brand.css";

export default function App() {
  const { gold: G, goldLight: GL, forest: F, forestDark: FD, muted: MU } = COLORS;
  const [tab, setTab] = useState("chat");
  const [messages, setMessages] = useState([{ role: "assistant", content: INITIAL_MESSAGE }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [debugMessage, setDebugMessage] = useState("");

  const send = async content => {
    if (!content.trim() || busy) return;

    const nextMessages = [...messages, { role: "user", content: content.trim() }];
    setMessages(nextMessages);
    setInput("");
    setDebugMessage("");
    setBusy(true);

    try {
      const result = await requestChat({
        system: SYSTEM_PROMPT,
        messages: nextMessages.map(message => ({ role: message.role, content: message.content })),
      });
      setMessages(previous => [...previous, { role: "assistant", content: result.reply }]);
    } catch (error) {
      const status = error.status;
      const errMsg = error.message;
      setDebugMessage(error.debug || `Fetch error: ${errMsg}`);

      const content = error.debug?.startsWith("Parse error")
        ? `**Error:** Could not parse server response. Status: ${status || "unknown"}`
        : error.debug?.startsWith("Unexpected response shape")
          ? `**Unexpected response:** ${errMsg}`
          : error.debug?.startsWith("API error")
            ? friendlyError(errMsg, status)
            : `**Network error:** ${errMsg}`;

      setMessages(previous => [...previous, { role: "assistant", content }]);
    } finally {
      setBusy(false);
    }
  };

  const handleKeyDown = event => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      send(input);
    }
  };

  const activatePillar = (index, pillar) => {
    setTab("chat");
    send(`Give me the complete Kaduna pilot activation plan for Pillar ${index + 1}: ${pillar.name} — including the specific monthly activity, how to document it, what data to collect, and what the measurable output looks like after 3 months.`);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh", minHeight: "100vh", background: `radial-gradient(circle at 80% -10%,${F} 0%,transparent 34%),linear-gradient(160deg,#122812 0%,${FD} 50%,#050d05 100%)`, fontFamily: "Georgia,serif", overflow: "hidden" }}>
      <style>{`*{box-sizing:border-box;margin:0;padding:0}::-webkit-scrollbar{width:3px;height:3px}::-webkit-scrollbar-thumb{background:${G}40;border-radius:2px}textarea{outline:none;font-family:Georgia,serif}textarea::placeholder{color:${MU}}button{font-family:Georgia,serif}.qa:hover{background:${F}!important;border-color:${G}60!important}.act:hover{background:${G}20!important}`}</style>

      <header style={{ background: `linear-gradient(90deg,${FD} 0%,${F} 50%,${FD} 100%)`, borderBottom: `1px solid ${G}55`, padding: "8px 14px", flexShrink: 0, boxShadow: "0 8px 24px rgba(0,0,0,.16)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <BrandIdentity compact />
          <div className="live-indicator" style={{ marginLeft: "auto" }}><span className="live-dot" /> Live system</div>
        </div>
      </header>

      <div style={{ padding: "8px 12px 0", background: FD, flexShrink: 0 }}>
        <div className="brand-hero">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, position: "relative", zIndex: 1 }}>
            <div>
              <div className="brand-kicker" style={{ color: GL }}>Official ISEYC Digital Command Centre</div>
              <div className="brand-hero-title" style={{ color: "#F5F1E8" }}>Civic Brain</div>
              <div className="brand-hero-subtitle" style={{ color: MU }}>Strategic intelligence · grassroots systems · accountable leadership</div>
            </div>
            <div style={{ fontSize: 28, opacity: .9 }} aria-hidden="true">✦</div>
          </div>
          <div className="brand-chip-row" style={{ position: "relative", zIndex: 1 }}>
            {['Youth-led', 'Non-partisan', 'Evidence-led', 'Community-first'].map(chip => <span key={chip} className="brand-chip" style={{ color: GL }}>{chip}</span>)}
          </div>
        </div>
      </div>

      <nav className="nav-scroll" style={{ display: "flex", background: FD, borderBottom: `1px solid ${G}18`, padding: "0 12px", flexShrink: 0 }}>
        {TABS.map(item => (
          <button key={item.id} className="nav-button" onClick={() => setTab(item.id)} style={{ padding: "10px 13px", fontSize: 10.5, fontWeight: tab === item.id ? 700 : 400, color: tab === item.id ? G : MU, background: "none", border: "none", borderBottom: tab === item.id ? `2px solid ${G}` : "2px solid transparent", cursor: "pointer" }}>
            {item.label}
          </button>
        ))}
      </nav>

      {tab === "chat" && <ChatView messages={messages} busy={busy} debugMessage={debugMessage} input={input} onInput={setInput} onKeyDown={handleKeyDown} onSend={send} />}
      {tab === "dashboard" && <DashboardView />}
      {tab === "pillars" && <PillarsView onActivate={activatePillar} />}
    </div>
  );
}
