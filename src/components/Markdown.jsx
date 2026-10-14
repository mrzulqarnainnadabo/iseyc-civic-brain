/** Minimal markdown for model replies — no decorative flourishes. */
export default function Markdown({ text }) {
  if (!text) return null;
  return (
    <div style={{ color: "var(--iseyc-ink)", fontSize: 14, lineHeight: 1.65 }}>
      {text.split("\n").map((line, i) => {
        if (line.startsWith("# "))
          return (
            <div key={i} className="display" style={{ fontSize: 17, fontWeight: 700, margin: "12px 0 6px" }}>
              {line.slice(2)}
            </div>
          );
        if (line.startsWith("## "))
          return (
            <div
              key={i}
              className="display"
              style={{
                fontSize: 15,
                fontWeight: 600,
                margin: "10px 0 4px",
                borderBottom: "1px solid var(--iseyc-border)",
                paddingBottom: 2,
              }}
            >
              {line.slice(3)}
            </div>
          );
        if (line.startsWith("### "))
          return (
            <div
              key={i}
              style={{
                fontSize: 12,
                fontWeight: 700,
                margin: "8px 0 2px",
                textTransform: "uppercase",
                letterSpacing: 0.4,
                color: "var(--iseyc-ink-secondary)",
              }}
            >
              {line.slice(4)}
            </div>
          );
        if (line.startsWith("- ") || line.startsWith("* "))
          return (
            <div key={i} style={{ display: "flex", gap: 8, margin: "3px 0" }}>
              <span style={{ color: "var(--iseyc-gold)" }} aria-hidden>
                ·
              </span>
              <span>{fmt(line.slice(2))}</span>
            </div>
          );
        if (/^\d+\.\s/.test(line)) {
          const n = line.match(/^(\d+)/)[1];
          return (
            <div key={i} style={{ display: "flex", gap: 8, margin: "3px 0" }}>
              <span className="mono" style={{ color: "var(--iseyc-forest-mid)", minWidth: 18, fontWeight: 600 }}>
                {n}.
              </span>
              <span>{fmt(line.replace(/^\d+\.\s/, ""))}</span>
            </div>
          );
        }
        if (line.startsWith("---"))
          return <hr key={i} style={{ border: "none", borderTop: "1px solid var(--iseyc-border)", margin: "12px 0" }} />;
        if (!line.trim()) return <div key={i} style={{ height: 6 }} />;
        return (
          <div key={i} style={{ margin: "3px 0" }}>
            {fmt(line)}
          </div>
        );
      })}
    </div>
  );
}

function fmt(text) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**"))
      return (
        <strong key={i} style={{ color: "var(--iseyc-forest)" }}>
          {p.slice(2, -2)}
        </strong>
      );
    if (p.startsWith("*") && p.endsWith("*")) return <em key={i}>{p.slice(1, -1)}</em>;
    if (p.startsWith("`") && p.endsWith("`"))
      return (
        <code
          key={i}
          className="mono"
          style={{
            background: "var(--iseyc-surface-muted)",
            padding: "1px 5px",
            borderRadius: 3,
            fontSize: "0.9em",
          }}
        >
          {p.slice(1, -1)}
        </code>
      );
    return p;
  });
}
