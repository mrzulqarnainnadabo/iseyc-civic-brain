import { useEffect, useMemo, useState } from "react";

const MANDATE_HOME = "https://2027-street-mandate.vercel.app";

/** Client explorer over published-only Civic Mandate records via /api/public-records. */
export default function EvidenceExplorer({ onAsk }) {
  const [records, setRecords] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [duty, setDuty] = useState("all");
  const [state, setState] = useState("all");

  useEffect(() => {
    let alive = true;
    fetch("/api/public-records")
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data?.message || "Could not load published records.");
        if (!Array.isArray(data?.records)) throw new Error("Published records response incomplete.");
        if (!alive) return;
        setRecords(data.records);
        setStatus(data.records.length ? "ready" : "empty");
      })
      .catch((err) => {
        if (!alive) return;
        setStatus("error");
        setError(err?.message || "Could not load published records.");
      });
    return () => {
      alive = false;
    };
  }, []);

  const duties = useMemo(
    () => Array.from(new Set(records.map((r) => r.duty).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [records]
  );
  const states = useMemo(
    () => Array.from(new Set(records.map((r) => r.state).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [records]
  );

  const filtered = useMemo(() => {
    return records.filter((r) => {
      if (duty !== "all" && r.duty !== duty) return false;
      if (state !== "all" && r.state !== state) return false;
      return true;
    });
  }, [records, duty, state]);

  return (
    <section
      aria-labelledby="evidence-explorer-title"
      style={{ borderBottom: "1px solid var(--iseyc-border)", padding: "12px", background: "var(--iseyc-cream)" }}
    >
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--iseyc-gold)" }}>
          Evidence explorer
        </p>
        <h2 id="evidence-explorer-title" style={{ margin: "4px 0 0", fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, color: "var(--iseyc-forest)" }}>
          Published Civic Mandate records
        </h2>
        <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--iseyc-ink-secondary)", lineHeight: 1.4 }}>
          Pilot published records only. Not a national survey. Open a record or ask about a duty.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: "var(--iseyc-ink)" }}>
            Duty
            <select value={duty} onChange={(e) => setDuty(e.target.value)} style={{ display: "block", width: "100%", minHeight: 40, marginTop: 4, borderRadius: 6, border: "1px solid var(--iseyc-border)", padding: "6px 8px", fontSize: 13 }}>
              <option value="all">All</option>
              {duties.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </label>
          <label style={{ fontSize: 11, fontWeight: 600, color: "var(--iseyc-ink)" }}>
            State
            <select value={state} onChange={(e) => setState(e.target.value)} style={{ display: "block", width: "100%", minHeight: 40, marginTop: 4, borderRadius: 6, border: "1px solid var(--iseyc-border)", padding: "6px 8px", fontSize: 13 }}>
              <option value="all">All</option>
              {states.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
        </div>

        <p style={{ margin: "8px 0 0", fontSize: 11, color: "var(--iseyc-ink-muted)" }} aria-live="polite">
          {status === "loading" && "Loading published records…"}
          {status === "ready" && `${filtered.length} of ${records.length} published`}
          {status === "empty" && "No published records available."}
          {status === "error" && error}
        </p>

        {status === "ready" && filtered.length > 0 && (
          <ul style={{ listStyle: "none", margin: "10px 0 0", padding: 0, display: "grid", gap: 8, maxHeight: 220, overflowY: "auto" }}>
            {filtered.slice(0, 12).map((r) => (
              <li key={r.id} style={{ border: "1px solid var(--iseyc-border)", borderRadius: 8, background: "var(--iseyc-white)", padding: "10px 12px" }}>
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.45, color: "var(--iseyc-ink)" }}>“{r.sentence}”</p>
                <p style={{ margin: "6px 0 0", fontSize: 11, color: "var(--iseyc-ink-secondary)" }}>
                  {[r.duty, r.state, r.lga].filter(Boolean).join(" · ")}
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                  <a href={r.publicUrl || `${MANDATE_HOME}/mandate/${r.id}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, fontWeight: 600, color: "var(--iseyc-forest)" }}>
                    Open record
                  </a>
                  {typeof onAsk === "function" && (
                    <button
                      type="button"
                      onClick={() =>
                        onAsk(
                          `Using only published Civic Mandate evidence, what does the public record show about this demand: "${r.sentence}" (${r.state || "unknown state"}, ${r.duty || "unknown duty"})? Separate facts from unknowns. Do not invent official responses.`
                        )
                      }
                      style={{ border: "none", background: "transparent", padding: 0, fontSize: 12, fontWeight: 600, color: "var(--iseyc-forest)", cursor: "pointer", textDecoration: "underline" }}
                    >
                      Ask about this
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {status === "ready" && filtered.length > 12 && (
          <p style={{ margin: "8px 0 0", fontSize: 11, color: "var(--iseyc-ink-muted)" }}>
            Showing 12 of {filtered.length}. Narrow filters or open{" "}
            <a href={`${MANDATE_HOME}/explore`} target="_blank" rel="noopener noreferrer">full explorer</a>.
          </p>
        )}
      </div>
    </section>
  );
}
