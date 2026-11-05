const MANDATE_URL = "https://2027-street-mandate.vercel.app";\nconst OBSERVATORY_URL = "https://iseyc-civic-intelligence-observator.vercel.app";

export default function Footer() {
  return (
    <footer
      role="contentinfo"
      style={{
        borderTop: "2px solid var(--iseyc-gold)",
        background: "var(--iseyc-forest-deep)",
        color: "var(--iseyc-cream)",
        padding: "18px 14px",
        fontSize: 12,
      }}
    >
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <img
            src="/iseyc-seal.svg"
            alt="ISEYC official seal"
            width={34}
            height={34}
            style={{ width: 34, height: 34, objectFit: "contain", background: "#fff", borderRadius: "50%", border: "1px solid var(--iseyc-gold)" }}
          />
          <div>
            <p style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14 }}>
              ISEYC Civic Brain
            </p>
            <p style={{ margin: 0, fontSize: 10, color: "var(--iseyc-gold-soft)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
              Strictly non-partisan
            </p>
          </div>
        </div>
        <p style={{ margin: "0 0 10px", color: "rgba(247,243,233,0.78)", lineHeight: 1.45 }}>
          Explains published Civic Mandate records, reviewed community observations and official-source evidence.
          Institutional routing is for human review only. Does not contact officials. Not a poll. Not an endorsement.
        </p>
        <nav aria-label="ISEYC products and methodology" style={{ display: "flex", flexWrap: "wrap", gap: "8px 16px", margin: "0 0 12px" }}>
          <a href={MANDATE_URL} target="_blank" rel="noopener noreferrer" style={{ color: "var(--iseyc-gold-soft)" }}>Civic Mandate</a>
          <a href="https://iseyc-civic-brain.vercel.app" aria-current="page" style={{ color: "var(--iseyc-gold)" }}>Civic Brain</a>
          <a href={OBSERVATORY_URL} target="_blank" rel="noopener noreferrer" style={{ color: "var(--iseyc-gold-soft)" }}>Observatory</a>
          <a href={`${MANDATE_URL}/methodology`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--iseyc-gold-soft)" }}>Methodology</a>
          <a href={`${MANDATE_URL}/about`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--iseyc-gold-soft)" }}>Non-partisan charter</a>
        </nav>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 16px", margin: "0 0 12px" }}>
          {[
            ["Education & Capacity Building", "education"],
            ["Health & Well-being", "health"],
            ["Software & Technology", "software-technology"],
            ["Civic Department", "civic"],
          ].map(([label, department]) => (
            <a key={department} href={`${OBSERVATORY_URL}/#/departments/${department}`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--iseyc-gold-soft)" }}>{label}</a>
          ))}
        </div>
        <p style={{ margin: "0 0 8px" }}>
          <a href={MANDATE_URL} target="_blank" rel="noopener noreferrer" style={{ color: "var(--iseyc-gold-soft)" }}>
            Civic Mandate Nigeria
          </a>
          {" · "}
          <a href="https://www.iseyc.com.ng" target="_blank" rel="noopener noreferrer" style={{ color: "var(--iseyc-gold-soft)" }}>
            www.iseyc.com.ng
          </a>
          {" · "}
          <a href="mailto:iseycglobal@gmail.com" style={{ color: "var(--iseyc-gold-soft)" }}>
            iseycglobal@gmail.com
          </a>
        </p>
        <p style={{ margin: 0, color: "rgba(247,243,233,0.5)", fontSize: 11 }}>
          Empowering Youth, Shaping Communities — Every Street. Every Voice. Accountable Leadership.
        </p>
      </div>
    </footer>
  );
}
