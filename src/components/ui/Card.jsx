export default function Card({ title, children, as: Tag = "section", style }) {
  return (
    <Tag
      style={{
        background: "var(--iseyc-surface)",
        border: "1px solid var(--iseyc-border)",
        borderRadius: "var(--radius-md)",
        padding: "14px 16px",
        ...style,
      }}
    >
      {title ? (
        <h2
          className="display"
          style={{ margin: "0 0 10px", fontSize: 15, fontWeight: 600 }}
        >
          {title}
        </h2>
      ) : null}
      {children}
    </Tag>
  );
}
