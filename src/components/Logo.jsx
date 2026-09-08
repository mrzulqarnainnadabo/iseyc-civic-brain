import { COLORS } from "../data/civicBrain";

export default function Logo({ size = 32 }) {
  const { forest: F, forestDark: FD, gold: G, goldLight: GL } = COLORS;

  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" role="img" aria-label="ISEYC official mark">
      <circle cx="20" cy="20" r="19" fill={F} stroke={G} strokeWidth="1.4" />
      <circle cx="20" cy="20" r="15" fill="#F5F1E8" stroke={GL} strokeWidth="0.7" />
      <path d="M11.5 27.5C14.7 24.9 17.3 23.7 20 23.7C22.7 23.7 25.3 24.9 28.5 27.5" stroke="#263B9A" strokeWidth="2" strokeLinecap="round" />
      <path d="M20 24V12.5M20 16.2C16.9 14.1 14.6 14.4 13.2 15.2M20 17.8C23.1 15.7 25.4 16 26.8 16.8M20 20C17.4 18.2 15.8 18.4 14.7 19.1M20 21C22.6 19.2 24.2 19.4 25.3 20.1" stroke={F} strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="20" cy="9.4" r="2.5" fill={GL} stroke={G} strokeWidth=".8" />
      <text x="20" y="32.8" textAnchor="middle" fill={F} fontSize="5.4" fontWeight="800" fontFamily="Arial,sans-serif">ISEYC</text>
      <path d="M20 27.5C18.7 29.3 17.7 30.3 16.3 31.2M20 27.5C21.3 29.3 22.3 30.3 23.7 31.2" stroke={F} strokeWidth=".8" strokeLinecap="round" opacity=".7" />
      <circle cx="20" cy="20" r="18.3" stroke={FD} strokeWidth=".35" opacity=".5" />
    </svg>
  );
}
