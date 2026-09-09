import { useState } from "react";
import ChatView from "./components/ChatView";
import DashboardView from "./components/DashboardView";
import PillarsView from "./components/PillarsView";
import Logo from "./components/Logo";
import { COLORS, INITIAL_MESSAGE, SYSTEM_PROMPT, TABS } from "./data/civicBrain";
import { friendlyError, requestChat } from "./services/chatApi";

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
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: `linear-gradient(160deg,#122812 0%,${FD} 50%,#050d05 100%)`, fontFamily: "Georgia,serif", overflow: "hidden" }}>
      <style>{`*{box-sizing:border-box;margin:0;padding:0}::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:${G}40;border-radius:2px}@keyframes dp{0%,100%{opacity:.2;transform:scale(.7)}50%{opacity:1;transform:scale(1)}}textarea{outline:none;font-family:Georgia,serif}textarea::placeholder{color:${MU}}.qa:hover{background:${F}!important;border-color:${G}60!important}.act:hover{background:${G}20!important}`}</style>

      <header style={{ background: `linear-gradient(90deg,${FD} 0%,${F} 50%,${FD} 100%)`, borderBottom: `2px solid ${G}`, height: 54, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", flexShrink: 0 }}>
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
      </header>

      <nav style={{ display: "flex", background: FD, borderBottom: `1px solid ${G}18`, padding: "0 12px", flexShrink: 0 }}>
        {TABS.map(item => (
          <button key={item.id} onClick={() => setTab(item.id)} style={{ padding: "9px 13px", fontSize: 11, fontWeight: tab === item.id ? 700 : 400, color: tab === item.id ? G : MU, background: "none", border: "none", borderBottom: tab === item.id ? `2px solid ${G}` : "2px solid transparent", cursor: "pointer" }}>
            {item.label}
          </button>
        ))}
      </nav>

      {tab === "chat" && (
        <ChatView
          messages={messages}
          busy={busy}
          debugMessage={debugMessage}
          input={input}
          onInput={setInput}
          onKeyDown={handleKeyDown}
          onSend={send}
        />
      )}
      {tab === "dashboard" && <DashboardView />}
      {tab === "pillars" && <PillarsView onActivate={activatePillar} />}
    </div>
  );
}
