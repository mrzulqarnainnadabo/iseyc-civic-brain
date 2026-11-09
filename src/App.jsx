import { useState } from "react";
import "./styles/tokens.css";
import Header from "./components/ui/Header.jsx";
import Footer from "./components/ui/Footer.jsx";
import PilotNote from "./components/ui/PilotNote.jsx";
import EvidenceWorkspace from "./components/EvidenceWorkspace.jsx";
import RoutingWorkspace from "./RoutingWorkspace.jsx";
import IntelligenceOverview from "./components/IntelligenceOverview.jsx";
import "./styles/intelligence.css";

/** Civic Brain shell — evidence tool chrome (not a chatbot demo). */
export default function App() {
  const [tab, setTab] = useState("overview");
  const [initialPrompt, setInitialPrompt] = useState("");
  const changeTab = (next) => { setTab(next); if (next !== "evidence") setInitialPrompt(""); };
  const askFromOverview = (prompt) => { setInitialPrompt(prompt); setTab("evidence"); };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100%",
        background: "var(--iseyc-cream)",
      }}
    >
      <Header tab={tab} onTab={changeTab} />
      <PilotNote />
      <main
        id="main"
        role="main"
        style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}
      >
        {tab === "overview" && <IntelligenceOverview onAsk={askFromOverview} onRouting={() => setTab("routing")} />}
        {tab === "evidence" && <EvidenceWorkspace initialPrompt={initialPrompt} />}
        {tab === "routing" && <RoutingWorkspace />}
      </main>
      <Footer />
    </div>
  );
}
