/** Persistent pilot honesty strip — required on public surfaces. */
export default function PilotNote() {
  return (
    <p
      className="pilot-note"
      role="note"
      style={{
        margin: 0,
        padding: "8px 12px",
        fontSize: 12,
        lineHeight: 1.45,
        color: "var(--iseyc-ink-secondary)",
        background: "var(--iseyc-surface-muted)",
        borderBottom: "1px solid var(--iseyc-border)",
        textAlign: "center",
      }}
    >
      Pilot data. Not representative of Nigeria. Published records only · Not a poll. Not an
      endorsement.
    </p>
  );
}
