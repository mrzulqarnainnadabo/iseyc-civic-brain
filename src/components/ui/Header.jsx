const MANDATE_URL = "https://2027-street-mandate.vercel.app";

/** Official ISEYC seal + institutional header. */
export default function Header({ tab, onTab }) {
  const tabs = [
    { id: "evidence", label: "Evidence" },
    { id: "routing", label: "Routing" },
  ];

  return (
    <header
      role="banner"
      style={{
        background: "var(--iseyc-forest-deep)",
        borderBottom: "2px solid var(--iseyc-gold)",
        minHeight: "var(--header-h)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "10px 14px",
          maxWidth: 960,
          width: "100%",
          margin: "0 auto",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <img
            src="/iseyc-logo.svg"
            alt="ISEYC logo; official seal asset pending"
            width={44}
            height={44}
            style={{
              width: 44,
              height: 44,
              objectFit: "contain",
              flexShrink: 0,
              borderRadius: "50%",
              background: "#fff",
              border: "1px solid var(--iseyc-gold)",
            }}
          />
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 10,
                color: "var(--iseyc-gold)",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                fontWeight: 700,
              }}
            >
              ISEYC
            </div>
            <div
              className="display"
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: "var(--iseyc-cream)",
                lineHeight: 1.15,
              }}
            >
              Civic Brain
            </div>
            <div
              style={{
                fontSize: 10,
                color: "rgba(247,243,233,0.72)",
                lineHeight: 1.3,
              }}
            >
              Reading companion for Civic Mandate Nigeria
            </div>
          </div>
        </div>
        <a
          href={MANDATE_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            flexShrink: 0,
            minHeight: 44,
            display: "inline-flex",
            alignItems: "center",
            padding: "0 12px",
            borderRadius: "var(--radius-md)",
            border: "1px solid rgba(196,163,90,0.45)",
            color: "var(--iseyc-gold-soft)",
            textDecoration: "none",
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          Mandate →
        </a>
      </div>

      <nav
        aria-label="Civic Brain modes"
        style={{
          display: "flex",
          gap: 0,
          maxWidth: 960,
          width: "100%",
          margin: "0 auto",
          padding: "0 14px",
          borderTop: "1px solid rgba(247,243,233,0.12)",
        }}
      >
        {tabs.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onTab(t.id)}
              aria-current={active ? "page" : undefined}
              style={{
                flex: 1,
                minHeight: 44,
                border: "none",
                background: "transparent",
                color: active ? "var(--iseyc-gold)" : "rgba(247,243,233,0.7)",
                fontWeight: active ? 700 : 500,
                fontSize: 13,
                cursor: "pointer",
                borderBottom: active ? "2px solid var(--iseyc-gold)" : "2px solid transparent",
                fontFamily: "var(--font-body)",
              }}
            >
              {t.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
