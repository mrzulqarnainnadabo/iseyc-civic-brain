import { useEffect, useState } from "react";

const MANDATE_URL = "https://2027-street-mandate.vercel.app";
const OBSERVATORY_URL = "https://iseyc-civic-intelligence-observatory.vercel.app";

const QUESTIONS = [
  {
    label: "What do citizens report?",
    prompt: "Summarise the published Civic Mandate records. Separate what citizens reported from what is independently verified. Show geographic and duty coverage, and state what the record cannot tell us.",
  },
  {
    label: "What does the evidence say about health?",
    prompt: "Explain the strongest available official evidence about Nigeria's health system. Distinguish source facts, reference periods, national estimates and local unknowns. Do not infer Kaduna or facility conditions from national data.",
  },
  {
    label: "Who is responsible?",
    prompt: "Explain which institution may have responsibility for a documented public-service issue. Show the legal or administrative basis, jurisdiction uncertainty and what a human reviewer must confirm before any referral.",
  },
  {
    label: "What remains unknown?",
    prompt: "Identify the important evidence gaps in the current public record for Nigeria. Separate missing data from evidence of absence, and recommend the next verifiable source to check.",
  },
];

function count(value) {
  return typeof value === "number" && Number.isFinite(value) ? new Intl.NumberFormat("en-NG").format(value) : "—";
}

function statusLabel(status) {
  return ({
    ready: "Connected",
    partial: "Partial",
    empty: "No records",
    unavailable: "Unavailable",
    invalid: "Invalid response",
    incomplete: "Incomplete",
    skipped: "Not requested",
  })[status] || "Checking";
}

function Metric({ label, value, note, status }) {
  return (
    <article className="brain-metric">
      <span className="brain-metric__label">{label}</span>
      <strong className="brain-metric__value">{value}</strong>
      <span className="brain-metric__note">{note}</span>
      {status ? <span className={"brain-status brain-status--" + status}>{statusLabel(status)}</span> : null}
    </article>
  );
}

export default function IntelligenceOverview({ onAsk, onRouting }) {
  const [data, setData] = useState(null);
  const [state, setState] = useState("loading");
  const [refreshedAt, setRefreshedAt] = useState(null);

  async function refresh() {
    setState("loading");
    try {
      const response = await fetch("/api/intelligence-overview", { headers: { Accept: "application/json" } });
      const body = await response.json();
      if (!response.ok || body?.contractVersion !== "1.0.0" || !body.coverage) throw new Error("Overview unavailable");
      setData(body);
      setRefreshedAt(body.generatedAt || new Date().toISOString());
      setState("ready");
    } catch {
      setState("error");
      setData(null);
    }
  }

  useEffect(() => { refresh(); }, []);

  const c = data?.coverage || {};
  const records = c.publishedCommunityRecords || {};
  const observations = c.communityObservations || {};
  const inec = c.officialElectoralEvidence || {};
  const indicators = c.nationalIndicators || {};
  const nationalEvidence = c.nationalEvidence || {};
  const budgetCoverage = nationalEvidence.stateBudgetCoverage || {};
  const snapshot = c.mandateSnapshot || {};

  return (
    <div className="brain-overview">
      <section className="brain-hero">
        <div className="brain-hero__copy">
          <span className="brain-kicker">ISEYC · Intelligence systems</span>
          <div className="brain-hero__status"><span className={state === "ready" ? "brain-live-dot" : "brain-live-dot brain-live-dot--muted"} />{state === "ready" ? "Evidence systems checked" : state === "loading" ? "Checking connected evidence" : "Overview temporarily unavailable"}</div>
          <h1>Understand the issue.<br/><em>Interrogate the evidence.</em></h1>
          <p>Civic Brain connects published community concerns with public evidence, explains what can and cannot be concluded, and identifies the institution that may hold responsibility.</p>
          <div className="brain-hero__actions">
            <button type="button" className="brain-button brain-button--gold" onClick={() => onAsk(QUESTIONS[0].prompt)}>Open evidence desk <span aria-hidden="true">↗</span></button>
            <button type="button" className="brain-button brain-button--outline" onClick={onRouting}>Institutional routing</button>
          </div>
        </div>
        <div className="brain-hero__seal" aria-label="ISEYC Civic Brain">
          <img src="/iseyc-seal.svg" alt="" width="62" height="62"/>
          <span>ISEYC</span>
          <strong>Evidence<br/>before<br/>conclusion</strong>
          <small>National evidence and analysis</small>
        </div>
      </section>

      <section className="brain-metrics" aria-label="Connected evidence coverage">
        <Metric label="Published civic records" value={count(records.total)} note={records.fallback ? "Legacy feed fallback in use" : "Human-reviewed public submissions"} status={records.status}/>
        <Metric label="Community observations" value={count(observations.total)} note="Published reports · not prevalence" status={observations.status}/>
        <Metric label="INEC evidence datasets" value={count(inec.datasets?.length)} note="Official-source transcriptions" status={inec.status}/>
        <Metric label="National evidence" value={count(nationalEvidence.observationCount)} note={count(indicators.count) + " indicators · " + count(budgetCoverage.officialPortalsLocated) + "/36 portals · " + count(budgetCoverage.agora2025Coverage) + "-state 2025 data"} status={nationalEvidence.status}/>
      </section>

      <section className="brain-section">
        <div className="brain-section__heading"><div><span className="brain-kicker brain-kicker--dark">Intelligence workflow</span><h2>From public signal to accountable understanding</h2></div><span className="brain-section__meta">{refreshedAt ? "Checked " + new Date(refreshedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Live status"}</span></div>
        <div className="brain-pipeline">
          <article><span>01</span><strong>Listen</strong><p>Published demands and community observations.</p></article>
          <article><span>02</span><strong>Verify context</strong><p>Compare source, date, geography and evidence quality.</p></article>
          <article><span>03</span><strong>Explain</strong><p>Separate established facts, claims and unknowns.</p></article>
          <article><span>04</span><strong>Route responsibly</strong><p>Identify the competent institution for human review.</p></article>
        </div>
      </section>

      <section className="brain-lower">
        <div className="brain-question-panel">
          <div className="brain-section__heading"><div><span className="brain-kicker brain-kicker--dark">Ask the intelligence desk</span><h2>Start with a better question</h2></div></div>
          <div className="brain-question-grid">
            {QUESTIONS.map((question) => <button key={question.label} type="button" onClick={() => onAsk(question.prompt)}><span>{question.label}</span><b aria-hidden="true">↗</b></button>)}
          </div>
        </div>
        <aside className="brain-source-panel">
          <span className="brain-kicker">Connected systems</span>
          <h2>One evidence infrastructure</h2>
          <a href={MANDATE_URL} target="_blank" rel="noopener noreferrer"><span>01</span><strong>Civic Mandate Nigeria</strong><small>Citizen experience & published concerns ↗</small></a>
          <a href={OBSERVATORY_URL} target="_blank" rel="noopener noreferrer"><span>02</span><strong>Intelligence Observatory</strong><small>National data & evidence exploration ↗</small></a>
          <button type="button" onClick={onRouting}><span>03</span><strong>Institutional routing</strong><small>Responsibility mapping & human review ↗</small></button>
        </aside>
      </section>

      <section className="brain-department-strip">
        <div><span className="brain-kicker brain-kicker--dark">Department intelligence</span><h2>Explore evidence by responsibility</h2></div>
        <div className="brain-department-links">
          <a href={OBSERVATORY_URL + "/#/departments/education"} target="_blank" rel="noopener noreferrer">Education & Capacity <span>↗</span></a>
          <a href={OBSERVATORY_URL + "/#/departments/health"} target="_blank" rel="noopener noreferrer">Health & Well-being <span>↗</span></a>
          <a href={OBSERVATORY_URL + "/#/departments/software-technology"} target="_blank" rel="noopener noreferrer">Software & Technology <span>↗</span></a>
          <a href={OBSERVATORY_URL + "/#/departments/civic"} target="_blank" rel="noopener noreferrer">Civic Department <span>↗</span></a>
        </div>
      </section>

      <section className="brain-boundary">
        <strong>Evidence discipline</strong>
        <p>Published does not mean verified. A national statistic does not prove a local condition. A routing recommendation does not mean an institution was contacted or an issue was resolved.</p>
        <a href={OBSERVATORY_URL + "/#/methodology"} target="_blank" rel="noopener noreferrer">Review evidence methodology ↗</a>
      </section>
    </div>
  );
}
