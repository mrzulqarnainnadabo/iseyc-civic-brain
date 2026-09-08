import { COLORS } from "../data/civicBrain";
import Logo from "./Logo";

export default function BrandIdentity({ compact = false }) {
  const { gold: G, goldLight: GL, cream: CR, muted: MU } = COLORS;

  return (
    <div className={`brand-lockup ${compact ? "brand-lockup--compact" : ""}`}>
      <div className="brand-mark-shell" aria-hidden="true">
        <Logo size={compact ? 32 : 42} />
      </div>
      <div className="brand-copy">
        <div className="brand-kicker" style={{ color: GL }}>ISEYC · INSTITUTIONAL INTELLIGENCE</div>
        <div className="brand-name" style={{ color: G }}>Initiative for Sustainable Evolution for Youth and Community</div>
        {!compact && (
          <div className="brand-meta" style={{ color: MU }}>
            Youth-led · Non-partisan · Community-driven · Nigeria
          </div>
        )}
        {compact && <div className="brand-meta" style={{ color: MU }}>Empowering Youth, Shaping Communities</div>}
      </div>
      {!compact && (
        <div className="brand-seal" style={{ borderColor: `${G}55`, color: CR }}>
          <span className="brand-seal-dot" style={{ background: G }} />
          OFFICIAL SYSTEM
        </div>
      )}
    </div>
  );
}
