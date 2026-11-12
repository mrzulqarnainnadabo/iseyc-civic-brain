import { useMemo } from "react";

function safeHref(value) {
  try { const url = new URL(value); return url.protocol === "https:" ? url.toString() : null; }
  catch { return null; }
}

function Pill({ children }) {
  return <span style={{ display: "inline-flex", alignItems: "center", borderRadius: 999, padding: "3px 8px", background: "var(--iseyc-surface-muted)", color: "var(--iseyc-forest)", fontSize: 10, fontWeight: 700, letterSpacing: ".03em" }}>{children}</span>;
}

export default function CivicBriefCard({ brief }) {
  const sources = useMemo(() => new Map((brief?.sources || []).map((source) => [source.id, source])), [brief]);
  if (!brief) return null;
  const findings = Array.isArray(brief.findings) ? brief.findings.slice(0, 8) : [];
  const responsibilities = Array.isArray(brief.institutionalResponsibilities) ? brief.institutionalResponsibilities.slice(0, 5) : [];
  const gaps = Array.isArray(brief.evidenceGaps) ? brief.evidenceGaps : [];
  const recommendations = Array.isArray(brief.recommendations) ? brief.recommendations : [];
  const official = Array.isArray(brief.officialEvidence) ? brief.officialEvidence : [];
  const reports = Array.isArray(brief.communityReports) ? brief.communityReports : [];

  return (
    <section aria-label="Structured Evidence brief" style={{ border: "1px solid var(--iseyc-border-strong)", borderTop: "3px solid var(--iseyc-gold)", borderRadius: 8, background: "var(--iseyc-white)", overflow: "hidden" }}>
      <div style={{ padding: "12px 14px", background: "var(--iseyc-forest-deep)", color: "var(--iseyc-cream)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <div><div style={{ color: "var(--iseyc-gold-soft)", fontSize: 9, fontWeight: 800, letterSpacing: ".14em", textTransform: "uppercase" }}>ISEYC · Evidence intelligence</div><h2 className="display" style={{ margin: "3px 0 0", color: "var(--iseyc-cream)", fontSize: 19 }}>Civic Brief</h2></div>
        <Pill>Draft · Human review</Pill>
      </div>
      <div style={{ padding: 14 }}>
        <p style={{ margin: "0 0 5px", color: "var(--iseyc-gold)", fontSize: 9, fontWeight: 800, letterSpacing: ".12em", textTransform: "uppercase" }}>Executive summary</p>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: "var(--iseyc-forest)", fontWeight: 600 }}>{brief.executiveSummary}</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 8, marginTop: 12 }}>
          <div style={{ borderRadius: 6, background: "var(--iseyc-surface-muted)", padding: 10 }}><p style={{ margin: 0, fontSize: 9, color: "var(--iseyc-ink-muted)", textTransform: "uppercase", fontWeight: 700 }}>Geographic scope</p><p style={{ margin: "4px 0 0", fontSize: 12, fontWeight: 700, color: "var(--iseyc-forest)" }}>{brief.geographicScope}</p></div>
          <div style={{ borderRadius: 6, background: "var(--iseyc-surface-muted)", padding: 10 }}><p style={{ margin: 0, fontSize: 9, color: "var(--iseyc-ink-muted)", textTransform: "uppercase", fontWeight: 700 }}>Evidence retrieved</p><p style={{ margin: "4px 0 0", fontSize: 12, fontWeight: 700, color: "var(--iseyc-forest)" }}>{reports.length} community reports · {official.length} official sources</p></div>
        </div>
        <div style={{ marginTop: 14 }}><h3 className="display" style={{ margin: "0 0 8px", fontSize: 15 }}>Findings</h3>
          {findings.length ? <div style={{ display: "grid", gap: 7 }}>{findings.map((finding, index) => <div key={index} style={{ border: "1px solid var(--iseyc-border)", borderRadius: 6, padding: 10 }}><div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}><Pill>{finding.classification || "UNCLASSIFIED"}</Pill>{(finding.citations || []).map((id) => { const source = sources.get(id); const href = safeHref(source?.sourceUrl); return source ? (href ? <a key={id} href={href} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: "var(--iseyc-forest)", fontWeight: 700, textDecoration: "underline" }}>{source.title}</a> : <span key={id} style={{ fontSize: 10, color: "var(--iseyc-ink-muted)" }}>{source.title}</span>) : null; })}</div><p style={{ margin: "7px 0 0", fontSize: 13, lineHeight: 1.55 }}>{finding.text}</p></div>)}</div> : <p style={{ fontSize: 12, color: "var(--iseyc-ink-muted)" }}>No findings were validated for this brief.</p>}
        </div>
        <div style={{ marginTop: 14 }}><h3 className="display" style={{ margin: "0 0 8px", fontSize: 15 }}>Institutional responsibilities</h3>
          {responsibilities.length ? <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, lineHeight: 1.6 }}>{responsibilities.map((item, index) => <li key={index} style={{ marginBottom: 5 }}>{item.institution || item.office || item.name || item.responsibility || "Potential responsible institution"} <span style={{ color: "var(--iseyc-ink-muted)" }}>· Human review required</span></li>)}</ul> : <p style={{ fontSize: 12, color: "var(--iseyc-ink-muted)" }}>No institutional responsibility could be safely identified from the retrieved evidence.</p>}
        </div>
        <details style={{ marginTop: 14, borderTop: "1px solid var(--iseyc-border)", paddingTop: 10 }}>
          <summary style={{ cursor: "pointer", fontSize: 12, fontWeight: 700, color: "var(--iseyc-forest)" }}>Evidence gaps, next steps & source register</summary>
          <div style={{ marginTop: 10 }}>
            <h4 style={{ margin: "8px 0 4px", fontSize: 11, color: "var(--iseyc-forest)" }}>What remains unknown</h4>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 11, lineHeight: 1.55 }}>{gaps.map((item, index) => <li key={index}>{typeof item === "string" ? item : item?.text || JSON.stringify(item)}</li>)}</ul>
            <h4 style={{ margin: "10px 0 4px", fontSize: 11, color: "var(--iseyc-forest)" }}>Recommended next steps</h4>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 11, lineHeight: 1.55 }}>{recommendations.map((item, index) => <li key={index}>{typeof item === "string" ? item : item?.text || JSON.stringify(item)}</li>)}</ul>
            <h4 style={{ margin: "10px 0 4px", fontSize: 11, color: "var(--iseyc-forest)" }}>Source register</h4>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 11, lineHeight: 1.55 }}>{(brief.sources || []).map((source) => { const href = safeHref(source.sourceUrl); return <li key={source.id}>{href ? <a href={href} target="_blank" rel="noopener noreferrer">{source.title}</a> : source.title} · {source.publisher} · {source.referenceDate || "date not stated"} · {source.geoCoverage || "geography not stated"}</li>; })}</ul>
            <p style={{ margin: "10px 0 0", fontSize: 10, lineHeight: 1.5, color: "var(--iseyc-ink-muted)" }}>{brief.limitations}</p>
          </div>
        </details>
        <p style={{ margin: "12px 0 0", padding: "9px 10px", borderRadius: 6, background: "var(--iseyc-surface-muted)", fontSize: 10, lineHeight: 1.5, color: "var(--iseyc-ink-secondary)" }}>Structural validation is not independent verification. This brief does not establish delivery, referral, response or resolution.</p>
      </div>
    </section>
  );
}
