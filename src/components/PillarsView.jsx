import { COLORS, PILLARS } from "../data/civicBrain";

export default function PillarsView({ onActivate }) {
  const { gold: G, cream: CR, muted: MU, forest: F } = COLORS;

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
      <p style={{ fontSize: 10, color: MU, marginBottom: 10 }}>Tap <strong style={{ color: G }}>Activate →</strong> for the full Kaduna deployment plan.</p>
      {PILLARS.map((pillar, index) => (
        <div key={index} style={{ background: "linear-gradient(135deg,#0f1f0f,#050d05)", border: `1px solid ${G}20`, borderRadius: 9, padding: 12, marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: CR, marginBottom: 3 }}><span style={{ color: G, marginRight: 5 }}>{index + 1}.</span>{pillar.name}</div>
              <div style={{ fontSize: 10, color: MU, lineHeight: 1.5 }}>{pillar.desc}</div>
            </div>
            <button className="act" onClick={() => onActivate(index, pillar)}
              style={{ background: `${G}10`, border: `1px solid ${G}38`, borderRadius: 7, padding: "4px 8px", cursor: "pointer", color: G, fontSize: 9, fontWeight: 700, flexShrink: 0, marginLeft: 8, transition: "all 0.2s", whiteSpace: "nowrap" }}>Activate →</button>
          </div>
        </div>
      ))}
      <div style={{ background: `${G}10`, border: `1px solid ${G}32`, borderRadius: 9, padding: 12, textAlign: "center" }}>
        <div style={{ fontSize: 10, color: G, fontWeight: 700, marginBottom: 8 }}>4-TIER DELIVERY SYSTEM</div>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", flexWrap: "wrap", gap: 3 }}>
          {["Street Rep", "Line Coord.", "Ward Coord.", "Central HQ"].map((label, index) => (
            <div key={index} style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <div style={{ fontSize: 10, color: index === 3 ? G : CR, padding: "3px 7px", background: `${F}60`, borderRadius: 4 }}>{label}</div>
              {index < 3 && <span style={{ color: G, fontSize: 10 }}>→</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
