const MANDATE_URL = "https://2027-street-mandate.vercel.app";

export default function Footer() {
  return (
    <footer
      role="contentinfo"
      style={{
        borderTop: "1px solid var(--iseyc-border)",
        background: "var(--iseyc-forest-deep)",
        color: "var(--iseyc-cream)",
        padding: "16px 14px",
        fontSize: 12,
      }}
    >
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <p style={{ margin: "0 0 8px", fontFamily: "var(--font-display)", fontWeight: 600 }}>
          ISEYC Civic Brain
        </p>
        <p style={{ margin: "0 0 10px", color: "rgba(247,243,233,0.75)", lineHeight: 1.45 }}>
          Explains published Civic Mandate records and recommends institutions for human review.
          Does not contact officials. Not a poll. Not an endorsement.
        </p>
        <p style={{ margin: "0 0 8px" }}>
          <a
            href={MANDATE_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--iseyc-gold-soft)" }}
          >
            Civic Mandate Nigeria
          </a>
          {" · "}
          <a href="https://www.iseyc.com.ng" target="_blank" rel="noopener noreferrer" style={{ color: "var(--iseyc-gold-soft)" }}>
            www.iseyc.com.ng
          </a>
        </p>
        <p style={{ margin: 0, color: "rgba(247,243,233,0.55)", fontSize: 11 }}>
          ISEYC | Strictly Non-Partisan | www.iseyc.com.ng
        </p>
      </div>
    </footer>
  );
}
