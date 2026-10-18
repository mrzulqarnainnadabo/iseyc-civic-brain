const MANDATE_URL = "https://2027-street-mandate.vercel.app";

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
            src="/iseyc-logo.svg"
            alt=""
            width={32}
            height={24}
            style={{ width: 32, height: 24, objectFit: "contain", background: "var(--iseyc-cream)", borderRadius: 3 }}
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
          Explains published Civic Mandate records and recommends institutions for human review.
          Does not contact officials. Not a poll. Not an endorsement.
        </p>
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
