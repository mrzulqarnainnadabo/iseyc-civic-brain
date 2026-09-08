import { COLORS, PHASES, PRIORITIES } from "../data/civicBrain";
import BrandIdentity from "./BrandIdentity";

const SCALING_SEQUENCE = [
  "Kaduna South Pilot (3–5 Wards)",
  "Kaduna State (All 3 Senatorial Zones)",
  "Northwest Zone (7 States)",
  "North Central + FCT Corridor",
  "National — All 36 States + FCT",
];

const SUMMARY_STATS = [
  { value: "3–5", label: "Pilot Wards", sublabel: "Kaduna South" },
  { value: "13", label: "Months to 2027", sublabel: "Strategic window" },
  { value: "7", label: "Pillars", sublabel: "Deployment framework" },
];

function Card({ title, children }) {
  const { gold: G } = COLORS;
  return <div className="section-card" style={{ background: "linear-gradient(135deg,#0f1f0f,#050d05)", border: `1px solid ${G}22`, borderRadius: 10, padding: 13, marginBottom: 10 }}>{children && <div style={{ fontSize: 10, fontWeight: 700, color: G, letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>{title}</div>}{children}</div>;
}

export default function DashboardView() {
  const { gold: G, goldLight: GL, cream: CR, muted: MU, forest: F } = COLORS;

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
      <div style={{ padding: "2px 2px 10px" }}><BrandIdentity compact /></div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 7, marginBottom: 10 }}>
        {SUMMARY_STATS.map((stat, index) => <div key={index} className="stat-card" style={{ background: "linear-gradient(135deg,#0f1f0f,#050d05)", border: `1px solid ${G}22`, borderRadius: 9, padding: 11, textAlign: "center" }}><div style={{ fontSize: 22, fontWeight: 700, color: G }}>{stat.value}</div><div style={{ fontSize: 9.5, color: CR, fontWeight: 700, marginTop: 1 }}>{stat.label}</div><div style={{ fontSize: 7.5, color: MU, marginTop: 2 }}>{stat.sublabel}</div></div>)}
      </div>

      <Card title="National Scaling Sequence">
        {SCALING_SEQUENCE.map((item, index) => <div key={index} style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 8 }}><div style={{ width: 21, height: 21, borderRadius: "50%", flexShrink: 0, background: index === 0 ? G : `${G}18`, border: `1px solid ${index === 0 ? G : `${G}30`}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: index === 0 ? "#0a150a" : MU }}>{index + 1}</div><span style={{ fontSize: 10.5, color: index === 0 ? CR : MU, fontWeight: index === 0 ? 700 : 400, flex: 1 }}>{item}</span>{index === 0 && <span className="live-indicator" style={{ padding: "3px 6px", fontSize: 6.5 }}><span className="live-dot" /> Active</span>}</div>)}
      </Card>

      <Card title="Kaduna Pilot Roadmap 2026">
        {PHASES.map((phase, index) => <div key={index} style={{ display: "flex", gap: 9, marginBottom: index < PHASES.length - 1 ? 10 : 0 }}><div style={{ width: 7, height: 7, borderRadius: "50%", flexShrink: 0, marginTop: 4, background: phase.active ? "#22c55e" : `${G}30`, boxShadow: phase.active ? "0 0 7px #22c55e" : "none" }} /><div style={{ flex: 1 }}><div style={{ fontSize: 10.5, fontWeight: 700, color: phase.active ? CR : MU }}>{phase.label}</div><div style={{ fontSize: 8.5, color: G }}>{phase.date}</div><div style={{ fontSize: 9.5, color: MU, marginTop: 1 }}>{phase.desc}</div></div></div>)}
      </Card>

      <Card title="Priority Actions">
        {PRIORITIES.map((priority, index) => <div key={index} style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: index < PRIORITIES.length - 1 ? 7 : 0, paddingBottom: index < PRIORITIES.length - 1 ? 7 : 0, borderBottom: index < PRIORITIES.length - 1 ? `1px solid ${G}10` : "none" }}><div style={{ display: "flex", gap: 6, flex: 1 }}><span style={{ color: G }}>▸</span><span style={{ fontSize: 10.5, color: CR }}>{priority.task}</span></div><span style={{ fontSize: 8, color: G, background: `${G}12`, borderRadius: 5, padding: "3px 6px", flexShrink: 0 }}>{priority.due}</span></div>)}
      </Card>

      <div style={{ textAlign: "center", padding: "5px 0 12px" }}><div style={{ fontSize: 8.5, color: G, letterSpacing: 1.5, textTransform: "uppercase", fontStyle: "italic" }}>Empowering Youth, Shaping Communities</div><div style={{ fontSize: 7.5, color: MU, letterSpacing: 1, marginTop: 3 }}>Every Street. Every Voice. Accountable Leadership.</div><div style={{ fontSize: 7, color: `${MU}99`, marginTop: 6 }}>ISEYC Civic Brain · Official Institutional System</div></div>
    </div>
  );
}
