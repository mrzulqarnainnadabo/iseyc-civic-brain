const MANDATE_URL = "https://2027-street-mandate.vercel.app";
const OBSERVATORY_URL = "https://iseyc-civic-intelligence-observatory.vercel.app";
const DEPARTMENTS = [
  ["Education & Capacity Building", "education"],
  ["Health & Well-being", "health"],
  ["Software & Technology", "software-technology"],
  ["Civic Department", "civic"],
];

export default function Footer() {
  const linkStyle = { color: "var(--iseyc-gold-soft)", textDecoration: "underline", textUnderlineOffset: 3 };
  return (
    <footer role="contentinfo" style={{
      borderTop: "2px solid var(--iseyc-gold)", background: "var(--iseyc-forest-deep)",
      color: "var(--iseyc-cream)", padding: "18px 14px", fontSize: 12,
    }}>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <img src="/iseyc-seal.svg" alt="ISEYC official seal" width={34} height={34}
            style={{ width: 34, height: 34, objectFit: "contain", background: "#fff", borderRadius: "50%", border: "1px solid var(--iseyc-gold)" }} />
          <div>
            <p style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14 }}>ISEYC Civic Brain</p>
            <p style={{ margin: 0, fontSize: 10, color: "var(--iseyc-gold-soft)" }}>Initiative for Sustainable Evolution for Youth and Community</p>
          </div>
        </div>
        <p style={{ margin: "0 0 12px", color: "rgba(247,243,233,0.78)", lineHeight: 1.45 }}>
          Explains published Civic Mandate records, reviewed community observations and official-source evidence.
          Institutional routing is for human review only. Does not contact officials. Not a poll. Not an endorsement.
          Publication is not independent verification.
        </p>
        <div style={{ borderTop: "1px solid rgba(247,243,233,.14)", paddingTop: 12, marginTop: 12 }}>
          <p style={{ margin: "0 0 8px", color: "var(--iseyc-gold)", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em" }}>ISEYC digital systems</p>
          <nav aria-label="ISEYC products" style={{ display: "flex", flexWrap: "wrap", gap: "8px 16px" }}>
            <a href={MANDATE_URL} target="_blank" rel="noopener noreferrer" style={linkStyle}>Civic Mandate Nigeria</a>
            <span aria-current="page" style={{ color: "#fff" }}>Civic Brain</span>
            <a href={OBSERVATORY_URL} target="_blank" rel="noopener noreferrer" style={linkStyle}>Civic Intelligence Observatory</a>
          </nav>
        </div>
        <div style={{ marginTop: 12 }}>
          <p style={{ margin: "0 0 8px", color: "var(--iseyc-gold)", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em" }}>Institutional departments</p>
          <nav aria-label="ISEYC departments" style={{ display: "flex", flexWrap: "wrap", gap: "8px 16px" }}>
            {DEPARTMENTS.map(([label, id]) => <a key={id} href={OBSERVATORY_URL + "/#/departments/" + id}
              target="_blank" rel="noopener noreferrer" style={linkStyle}>{label}</a>)}
          </nav>
        </div>
        <nav aria-label="Methodology and charter" style={{ display: "flex", flexWrap: "wrap", gap: "8px 16px", marginTop: 14 }}>
          <a href={MANDATE_URL + "/methodology"} target="_blank" rel="noopener noreferrer" style={linkStyle}>Methodology</a>
          <a href={MANDATE_URL + "/about"} target="_blank" rel="noopener noreferrer" style={linkStyle}>Non-partisan charter</a>
          <a href="https://www.iseyc.com.ng" target="_blank" rel="noopener noreferrer" style={linkStyle}>ISEYC website</a>
          <a href="mailto:iseycglobal@gmail.com" style={linkStyle}>Contact</a>
        </nav>
        <p style={{ margin: "14px 0 0", color: "rgba(247,243,233,0.5)", fontSize: 11 }}>
          
        </p>
      </div>
    </footer>
  );
}
