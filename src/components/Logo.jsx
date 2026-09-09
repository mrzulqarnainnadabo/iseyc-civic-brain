import { COLORS } from "../data/civicBrain";

export default function Logo({ size = 32 }) {
  const { forestDark: FD, gold: G, goldLight: GL } = COLORS;

  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-label="ISEYC">
      <circle cx="20" cy="20" r="19" fill={FD} stroke={G} strokeWidth="1.5" />
      <circle cx="20" cy="20" r="13" fill="none" stroke={G} strokeWidth="0.5" opacity="0.5" />
      <text x="20" y="23" textAnchor="middle" fill={G} fontSize="10" fontWeight="800" fontFamily="Georgia,serif">IS</text>
      <text x="20" y="30" textAnchor="middle" fill={GL} fontSize="4.5" fontFamily="Georgia,serif" letterSpacing="1">EYIC</text>
    </svg>
  );
}
