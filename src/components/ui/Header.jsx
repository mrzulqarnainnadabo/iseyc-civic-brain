const MANDATE_URL = "https://2027-street-mandate.vercel.app";

/** Institutional header. Seal slot until founder supplies public/brand file. */
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
        borderBottom: "1px solid var(--iseyc-gold)",
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
          <div
            aria-hidden
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "var(--iseyc-white)",
              border: "1px solid var(--iseyc-gold)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              fontFamily: "var(--font-display)",
              fontSize: 11,
              fontWeight: 700,
              color: "var(--iseyc-forest)",
            }}
            title="ISEYC seal slot — replace with official public/brand file"
          >
            IS
          </div>
          <div style={{ minWidth: 0 }}>
            <div
              className="display"
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: "var(--iseyc-cream)",
                lineHeight: 1.2,
              }}
            >
              ISEYC Civic Brain
            </div>
            <div
              style={{
                fontSize: 10,
                color: "var(--iseyc-gold-soft)",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              Evidence tool · Duty over personality.
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
            fontSize: 12,
            fontWeight: 600,
            color: "var(--iseyc-forest-deep)",
            background: "var(--iseyc-cream)",
            border: "1px solid var(--iseyc-gold)",
            borderRadius: "var(--radius-sm)",
            textDecoration: "none",
          }}
        >
          Civic Mandate
        </a>
      </div>
      <nav
        aria-label="Primary"
        style={{
          display: "flex",
          gap: 0,
          padding: "0 8px",
          maxWidth: 960,
          width: "100%",
          margin: "0 auto",
          borderTop: "1px solid rgba(196,163,90,0.25)",
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
                minHeight: 44,
                padding: "0 16px",
                fontSize: 13,
                fontWeight: active ? 700 : 500,
                fontFamily: "var(--font-body)",
                color: active ? "var(--iseyc-gold)" : "rgba(247,243,233,0.7)",
                background: "transparent",
                border: "none",
                borderBottom: active ? "2px solid var(--iseyc-gold)" : "2px solid transparent",
                cursor: "pointer",
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
