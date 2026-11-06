/** Safe, compact Markdown renderer for server-authored Civic Brain replies. */
import { Fragment } from "react";

function safeHref(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function inline(text) {
  const token = /(\[[^\]]+\]\(https:\/\/[^\s)]+\)|\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  return text.split(token).map((part, index) => {
    const link = part.match(/^\[([^\]]+)\]\((https:\/\/[^\s)]+)\)$/);
    if (link) {
      const href = safeHref(link[2]);
      return href ? <a key={index} href={href} target="_blank" rel="noopener noreferrer" style={{ color: "var(--iseyc-forest)", textDecoration: "underline", textUnderlineOffset: 3 }}>{link[1]}</a> : link[1];
    }
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={index} style={{ color: "var(--iseyc-forest)" }}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*")) return <em key={index}>{part.slice(1, -1)}</em>;
    if (part.startsWith("`") && part.endsWith("`")) return <code key={index} className="mono" style={{ background: "var(--iseyc-surface-muted)", padding: "1px 5px", borderRadius: 3, fontSize: "0.9em" }}>{part.slice(1, -1)}</code>;
    return <Fragment key={index}>{part}</Fragment>;
  });
}

export default function Markdown({ text }) {
  if (!text) return null;
  const lines = String(text).replace(/\r\n?/g, "\n").split("\n");
  const blocks = [];
  let paragraph = [];
  let list = [];
  let code = [];
  let inCode = false;
  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push(<p key={`p-${blocks.length}`} style={{ margin: "4px 0" }}>{inline(paragraph.join(" "))}</p>);
      paragraph = [];
    }
  };
  const flushList = () => {
    if (list.length) {
      const ordered = list[0].ordered;
      const items = list;
      blocks.push(ordered
        ? <ol key={`ol-${blocks.length}`} style={{ margin: "6px 0", paddingLeft: 22 }}>{items.map((item, i) => <li key={i} style={{ margin: "3px 0" }}>{inline(item.text)}</li>)}</ol>
        : <ul key={`ul-${blocks.length}`} style={{ margin: "6px 0", paddingLeft: 22, listStyle: "disc" }}>{items.map((item, i) => <li key={i} style={{ margin: "3px 0" }}>{inline(item.text)}</li>)}</ul>);
      list = [];
    }
  };

  lines.forEach((line) => {
    if (line.trim().startsWith("```")) {
      flushParagraph(); flushList();
      if (inCode) {
        blocks.push(<pre key={`code-${blocks.length}`} className="mono" style={{ overflowX: "auto", whiteSpace: "pre", padding: 12, borderRadius: 6, background: "var(--iseyc-surface-muted)", fontSize: 12 }}><code>{code.join("\n")}</code></pre>);
        code = [];
      }
      inCode = !inCode;
      return;
    }
    if (inCode) { code.push(line); return; }
    if (!line.trim()) { flushParagraph(); flushList(); return; }
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      flushParagraph(); flushList();
      const level = heading[1].length;
      const style = level === 1
        ? { fontSize: 17, fontWeight: 700, margin: "12px 0 6px" }
        : level === 2
          ? { fontSize: 15, fontWeight: 600, margin: "10px 0 4px", borderBottom: "1px solid var(--iseyc-border)", paddingBottom: 2 }
          : { fontSize: 12, fontWeight: 700, margin: "8px 0 2px", textTransform: "uppercase", letterSpacing: 0.4, color: "var(--iseyc-ink-secondary)" };
      blocks.push(<div key={`h-${blocks.length}`} className="display" style={style}>{inline(heading[2])}</div>);
      return;
    }
    if (/^---+$/.test(line.trim())) { flushParagraph(); flushList(); blocks.push(<hr key={`hr-${blocks.length}`} style={{ border: 0, borderTop: "1px solid var(--iseyc-border)", margin: "12px 0" }} />); return; }
    const item = line.match(/^\s*(?:[-*])\s+(.+)$/);
    const numbered = line.match(/^\s*\d+\.\s+(.+)$/);
    if (item || numbered) {
      flushParagraph();
      const next = { ordered: Boolean(numbered), text: (item || numbered)[1] };
      if (list.length && list[0].ordered !== next.ordered) flushList();
      list.push(next);
      return;
    }
    if (line.startsWith("> ")) {
      flushParagraph(); flushList();
      blocks.push(<blockquote key={`q-${blocks.length}`} style={{ margin: "8px 0", padding: "4px 0 4px 12px", borderLeft: "3px solid var(--iseyc-gold)", color: "var(--iseyc-ink-secondary)" }}>{inline(line.slice(2))}</blockquote>);
      return;
    }
    flushList();
    paragraph.push(line.trim());
  });
  if (inCode) blocks.push(<pre key={`code-${blocks.length}`} className="mono" style={{ overflowX: "auto", whiteSpace: "pre", padding: 12, borderRadius: 6, background: "var(--iseyc-surface-muted)", fontSize: 12 }}><code>{code.join("\n")}</code></pre>);
  flushParagraph(); flushList();

  return <div style={{ color: "var(--iseyc-ink)", fontSize: 14, lineHeight: 1.65 }}>{blocks}</div>;
}
