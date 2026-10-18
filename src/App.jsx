import { useState } from "react";
import "./styles/tokens.css";
import Header from "./components/ui/Header.jsx";
import Footer from "./components/ui/Footer.jsx";
import PilotNote from "./components/ui/PilotNote.jsx";
import EvidenceWorkspace from "./components/EvidenceWorkspace.jsx";
import RoutingWorkspace from "./RoutingWorkspace.jsx";

/** Civic Brain shell — evidence tool chrome (not a chatbot demo). */
export default function App() {
  const [tab, setTab] = useState("evidence");

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100%",
        background: "var(--iseyc-cream)",
      }}
    >
      <Header tab={tab} onTab={setTab} />
      <PilotNote />
      <main
        id="main"
        role="main"
        style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}
      >
        {tab === "evidence" && <EvidenceWorkspace />}
        {tab === "routing" && <RoutingWorkspace />}
      </main>
      <Footer />
    </div>
  );
}
