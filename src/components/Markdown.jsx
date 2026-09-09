import { COLORS } from "../data/civicBrain";

function formatInline(text) {
  const { gold: G, goldLight: GL } = COLORS;
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index} style={{ color: GL }}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={index}>{part.slice(1, -1)}</em>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={index} style={{ background: "#050d05", color: G, padding: "1px 4px", borderRadius: 3, fontSize: "0.88em", fontFamily: "monospace" }}>{part.slice(1, -1)}</code>;
    }
    return part;
  });
}

export default function Markdown({ text }) {
  const { gold: G, goldLight: GL, cream: CR } = COLORS;

  return (
    <div style={{ color: CR, fontSize: 12, lineHeight: 1.7 }}>
      {text.split("\n").map((line, index) => {
        if (line.startsWith("# ")) return <div key={index} style={{ color: G, fontSize: 15, fontWeight: 700, fontFamily: "Georgia,serif", margin: "12px 0 4px" }}>{line.slice(2)}</div>;
        if (line.startsWith("## ")) return <div key={index} style={{ color: GL, fontSize: 13, fontWeight: 700, margin: "10px 0 3px", borderBottom: `1px solid ${G}30`, paddingBottom: 2 }}>{line.slice(3)}</div>;
        if (line.startsWith("### ")) return <div key={index} style={{ color: CR, fontSize: 11, fontWeight: 700, margin: "8px 0 2px", textTransform: "uppercase", letterSpacing: 0.7 }}>{line.slice(4)}</div>;
        if (line.startsWith("- ") || line.startsWith("* ")) return <div key={index} style={{ display: "flex", gap: 7, margin: "2px 0" }}><span style={{ color: G }}>▸</span><span>{formatInline(line.slice(2))}</span></div>;
        if (/^\d+\.\s/.test(line)) {
          const number = line.match(/^(\d+)/)[1];
          return <div key={index} style={{ display: "flex", gap: 7, margin: "2px 0" }}><span style={{ color: G, minWidth: 16, fontWeight: 700 }}>{number}.</span><span>{formatInline(line.replace(/^\d+\.\s/, ""))}</span></div>;
        }
        if (line.startsWith("---")) return <hr key={index} style={{ border: "none", borderTop: `1px solid ${G}30`, margin: "10px 0" }} />;
        if (!line.trim()) return <div key={index} style={{ height: 4 }} />;
        if (line.startsWith("|")) return <div key={index} style={{ color: GL, fontSize: 11 }}>{line}</div>;
        return <div key={index} style={{ margin: "2px 0" }}>{formatInline(line)}</div>;
      })}
    </div>
  );
}
