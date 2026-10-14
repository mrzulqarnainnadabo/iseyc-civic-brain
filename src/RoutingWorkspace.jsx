import { useState } from "react";
import Card from "./components/ui/Card.jsx";

const field = {
  width: "100%",
  marginTop: 4,
  marginBottom: 0,
  minHeight: 44,
  padding: "10px 12px",
  fontSize: 14,
  fontFamily: "var(--font-body)",
  color: "var(--iseyc-ink)",
  background: "var(--iseyc-cream)",
  border: "1px solid var(--iseyc-border-strong)",
  borderRadius: "var(--radius-sm)",
};

const labelStyle = {
  fontSize: 12,
  fontWeight: 600,
  color: "var(--iseyc-ink-secondary)",
  display: "block",
};

export default function RoutingWorkspace() {
  const [routeForm, setRouteForm] = useState({
    mandateText: "",
    duty: "Health",
    state: "Kaduna",
    lga: "",
    roadClass: "unknown",
  });
  const [routeResult, setRouteResult] = useState(null);
  const [routeBusy, setRouteBusy] = useState(false);
  const [routeErr, setRouteErr] = useState("");

  const run = async () => {
    setRouteBusy(true);
    setRouteErr("");
    setRouteResult(null);
    try {
      const res = await fetch("/api/route-mandate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(routeForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || data?.error || "Routing failed");
      setRouteResult(data);
    } catch (e) {
      setRouteErr(e.message || "Routing failed");
    } finally {
      setRouteBusy(false);
    }
  };

  const r = routeResult?.routing;

  return (
    <div
      style={{
        flex: 1,
        overflowY: "auto",
        padding: "16px 12px",
        maxWidth: 720,
        width: "100%",
        margin: "0 auto",
      }}
    >
      <h1 className="display" style={{ fontSize: 18, margin: "0 0 8px" }}>
        Mandate routing
      </h1>
      <p style={{ fontSize: 13, color: "var(--iseyc-ink-secondary)", lineHeight: 1.55, margin: "0 0 16px" }}>
        Recommend a responsible institution from the pilot registry. Recommendations are not
        referrals. Nothing is sent externally. Human review is required.
      </p>

      <Card title="Demand details">
        <label style={labelStyle}>
          Demand text
          <textarea
            value={routeForm.mandateText}
            onChange={(e) => setRouteForm({ ...routeForm, mandateText: e.target.value })}
            rows={3}
            placeholder="Describe the public-service demand…"
            disabled={routeBusy}
            style={{ ...field, minHeight: 88, resize: "vertical", marginTop: 6 }}
          />
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
          <label style={labelStyle}>
            Duty
            <select
              value={routeForm.duty}
              onChange={(e) => setRouteForm({ ...routeForm, duty: e.target.value })}
              disabled={routeBusy}
              style={{ ...field, marginTop: 6 }}
            >
              {["Health", "Education", "Security", "Roads", "Water", "Electricity", "Sanitation", "Other"].map(
                (d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                )
              )}
            </select>
          </label>
          <label style={labelStyle}>
            State
            <input
              value={routeForm.state}
              onChange={(e) => setRouteForm({ ...routeForm, state: e.target.value })}
              disabled={routeBusy}
              style={{ ...field, marginTop: 6 }}
            />
          </label>
          <label style={labelStyle}>
            LGA (optional)
            <input
              value={routeForm.lga}
              onChange={(e) => setRouteForm({ ...routeForm, lga: e.target.value })}
              disabled={routeBusy}
              style={{ ...field, marginTop: 6 }}
            />
          </label>
          <label style={labelStyle}>
            Road class
            <select
              value={routeForm.roadClass}
              onChange={(e) => setRouteForm({ ...routeForm, roadClass: e.target.value })}
              disabled={routeBusy}
              style={{ ...field, marginTop: 6 }}
            >
              <option value="unknown">Unknown</option>
              <option value="federal">Federal</option>
              <option value="state">State</option>
              <option value="local">Local</option>
            </select>
          </label>
        </div>
        <button
          type="button"
          onClick={run}
          disabled={routeBusy || !routeForm.mandateText.trim()}
          style={{
            marginTop: 16,
            minHeight: 44,
            width: "100%",
            fontSize: 14,
            fontWeight: 700,
            fontFamily: "var(--font-body)",
            color: "var(--iseyc-cream)",
            background:
              routeBusy || !routeForm.mandateText.trim()
                ? "var(--iseyc-ink-muted)"
                : "var(--iseyc-forest)",
            border: "none",
            borderRadius: "var(--radius-sm)",
            cursor: routeBusy || !routeForm.mandateText.trim() ? "not-allowed" : "pointer",
          }}
        >
          {routeBusy ? "Working…" : "Get recommendation"}
        </button>
      </Card>

      {routeErr && (
        <div
          role="alert"
          style={{
            marginTop: 12,
            padding: "12px 14px",
            background: "var(--iseyc-danger-bg)",
            color: "var(--iseyc-danger-text)",
            border: "1px solid rgba(92,42,42,0.2)",
            borderRadius: "var(--radius-sm)",
            fontSize: 13,
          }}
        >
          {routeErr}
        </div>
      )}

      {r && (
        <Card title="Routing recommendation" style={{ marginTop: 16, borderColor: "var(--iseyc-gold)" }}>
          <div
            role="status"
            style={{
              marginBottom: 12,
              padding: "10px 12px",
              background: "var(--iseyc-surface-muted)",
              border: "1px solid var(--iseyc-border)",
              borderRadius: "var(--radius-sm)",
              fontSize: 13,
              fontWeight: 700,
              color: "var(--iseyc-forest)",
            }}
          >
            Human review required. Not sent to anyone.
          </div>

          {r.primary ? (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 12, color: "var(--iseyc-ink-muted)", marginBottom: 4 }}>
                Recommended institution
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, color: "var(--iseyc-forest)" }}>
                {r.primary.institutionalName}
              </div>
              <div className="mono" style={{ fontSize: 12, color: "var(--iseyc-ink-muted)", marginTop: 4 }}>
                Confidence: {r.primary.confidence}
                {r.primary.officeId ? ` · ${r.primary.officeId}` : ""}
              </div>
            </div>
          ) : (
            <p style={{ fontSize: 14, color: "var(--iseyc-ink-secondary)" }}>
              Unclear: needs human research. No confident primary office from the pilot registry.
            </p>
          )}

          {r.basis && (
            <p style={{ fontSize: 13, color: "var(--iseyc-ink-secondary)", lineHeight: 1.5 }}>
              <strong style={{ color: "var(--iseyc-ink)" }}>Basis: </strong>
              {typeof r.basis === "string" ? r.basis : JSON.stringify(r.basis)}
            </p>
          )}

          {r.additional?.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>May also share responsibility</div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
                {r.additional.map((a) => (
                  <li key={a.officeId} style={{ marginBottom: 4 }}>
                    {a.institutionalName}{" "}
                    <span className="mono" style={{ color: "var(--iseyc-ink-muted)" }}>
                      ({a.confidence})
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {r.suggestedNextAction && (
            <p style={{ marginTop: 12, fontSize: 13, lineHeight: 1.5 }}>{r.suggestedNextAction}</p>
          )}

          <p
            className="mono"
            style={{
              marginTop: 14,
              paddingTop: 10,
              borderTop: "1px solid var(--iseyc-border)",
              fontSize: 11,
              color: "var(--iseyc-ink-muted)",
            }}
          >
            External delivery: disabled · Stage: {routeResult.case?.stage || "recommendation"}
          </p>

          {r.operatorReview?.checklist?.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Operator checklist</div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "var(--iseyc-ink-secondary)" }}>
                {r.operatorReview.checklist.map((item, i) => (
                  <li key={i} style={{ marginBottom: 4 }}>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {routeResult.referralBriefDraft && (
            <details style={{ marginTop: 14 }}>
              <summary style={{ fontSize: 13, fontWeight: 600, cursor: "pointer", color: "var(--iseyc-forest)" }}>
                Referral brief draft (not sent)
              </summary>
              <pre
                className="mono"
                style={{
                  marginTop: 8,
                  fontSize: 11,
                  whiteSpace: "pre-wrap",
                  lineHeight: 1.45,
                  maxHeight: 240,
                  overflow: "auto",
                  padding: 12,
                  background: "var(--iseyc-surface-muted)",
                  borderRadius: "var(--radius-sm)",
                }}
              >
                {routeResult.referralBriefDraft}
              </pre>
            </details>
          )}
        </Card>
      )}
    </div>
  );
}
