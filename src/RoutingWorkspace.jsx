import { useState } from "react";

const G = "#C9A84C";
const GL = "#E2C068";
const CR = "#F5F1E8";
const F = "#1A3C1A";
const FD = "#0a150a";
const MU = "#6B7280";

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

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
      <div style={{ fontSize: 12, color: G, fontWeight: 700, marginBottom: 6 }}>Mandate Routing</div>
      <p style={{ fontSize: 11, color: MU, lineHeight: 1.55, marginBottom: 12 }}>
        Recommend a responsible institution from the pilot registry. Recommendations are not referrals.
        Nothing is sent externally. Human review is required.
      </p>
      <label style={{ fontSize: 10, color: GL }}>Demand text</label>
      <textarea
        value={routeForm.mandateText}
        onChange={(e) => setRouteForm({ ...routeForm, mandateText: e.target.value })}
        rows={3}
        placeholder="Describe the public-service demand…"
        style={{
          width: "100%",
          marginTop: 4,
          marginBottom: 8,
          background: `${F}30`,
          border: `1px solid ${G}40`,
          borderRadius: 8,
          color: CR,
          fontSize: 12,
          padding: 8,
          fontFamily: "Georgia,serif",
        }}
      />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
        <div>
          <label style={{ fontSize: 10, color: GL }}>Duty</label>
          <select
            value={routeForm.duty}
            onChange={(e) => setRouteForm({ ...routeForm, duty: e.target.value })}
            style={{ width: "100%", marginTop: 4, background: F, color: CR, border: `1px solid ${G}40`, borderRadius: 6, padding: 6, fontSize: 11 }}
          >
            {["Health", "Education", "Security", "Roads & Transport", "Water", "Power", "Jobs & Economy", "Agriculture", "Other"].map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 10, color: GL }}>State</label>
          <input
            value={routeForm.state}
            onChange={(e) => setRouteForm({ ...routeForm, state: e.target.value })}
            style={{ width: "100%", marginTop: 4, background: `${F}30`, border: `1px solid ${G}40`, borderRadius: 6, color: CR, fontSize: 11, padding: 6 }}
          />
        </div>
        <div>
          <label style={{ fontSize: 10, color: GL }}>LGA (optional)</label>
          <input
            value={routeForm.lga}
            onChange={(e) => setRouteForm({ ...routeForm, lga: e.target.value })}
            style={{ width: "100%", marginTop: 4, background: `${F}30`, border: `1px solid ${G}40`, borderRadius: 6, color: CR, fontSize: 11, padding: 6 }}
          />
        </div>
        <div>
          <label style={{ fontSize: 10, color: GL }}>Road class</label>
          <select
            value={routeForm.roadClass}
            onChange={(e) => setRouteForm({ ...routeForm, roadClass: e.target.value })}
            style={{ width: "100%", marginTop: 4, background: F, color: CR, border: `1px solid ${G}40`, borderRadius: 6, padding: 6, fontSize: 11 }}
          >
            <option value="unknown">Unknown</option>
            <option value="local">Local</option>
            <option value="state">State</option>
            <option value="federal">Federal</option>
          </select>
        </div>
      </div>
      <button
        disabled={routeBusy}
        onClick={run}
        style={{
          width: "100%",
          padding: "10px 12px",
          borderRadius: 8,
          border: "none",
          background: `linear-gradient(135deg,${G},${GL})`,
          color: FD,
          fontWeight: 700,
          fontSize: 12,
          cursor: routeBusy ? "wait" : "pointer",
          marginBottom: 12,
        }}
      >
        {routeBusy ? "Routing…" : "Generate routing recommendation"}
      </button>
      {routeErr && <div style={{ color: "#ef4444", fontSize: 11, marginBottom: 8 }}>{routeErr}</div>}
      {routeResult?.routing && (
        <div style={{ background: `linear-gradient(135deg,#0f1f0f,#050d05)`, border: `1px solid ${G}30`, borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 10, color: G, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>
            Status · {routeResult.routing.status}
          </div>
          {routeResult.routing.primary ? (
            <>
              <div style={{ fontSize: 13, fontWeight: 700, color: CR, marginBottom: 4 }}>
                {routeResult.routing.primary.institutionalName}
              </div>
              <div style={{ fontSize: 11, color: MU, lineHeight: 1.5, marginBottom: 8 }}>
                {routeResult.routing.primary.reason}
              </div>
              <div style={{ fontSize: 10, color: GL }}>Confidence: {routeResult.routing.primary.confidence}</div>
            </>
          ) : (
            <div style={{ fontSize: 12, color: CR }}>No primary institution — needs review or more information.</div>
          )}
          {routeResult.routing.missingInformation?.length > 0 && (
            <div style={{ marginTop: 10, fontSize: 11, color: MU }}>
              <strong style={{ color: GL }}>Missing:</strong> {routeResult.routing.missingInformation.join("; ")}
            </div>
          )}
          {routeResult.routing.additional?.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 10, color: G, marginBottom: 4 }}>Other institutions that may share responsibility</div>
              {routeResult.routing.additional.map((a) => (
                <div key={a.officeId} style={{ fontSize: 11, color: CR, marginBottom: 4 }}>
                  • {a.institutionalName} <span style={{ color: MU }}>({a.confidence})</span>
                </div>
              ))}
            </div>
          )}
          <div style={{ marginTop: 12, fontSize: 11, color: GL, lineHeight: 1.5 }}>
            {routeResult.routing.suggestedNextAction}
          </div>
          <div style={{ marginTop: 10, fontSize: 10, color: MU, borderTop: `1px solid ${G}22`, paddingTop: 8 }}>
            External delivery: disabled · Human review: required · Case stage: {routeResult.case?.stage}
          </div>
        </div>
      )}
    </div>
  );
}
