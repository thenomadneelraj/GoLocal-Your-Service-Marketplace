export default function ChartWrapper({ title, children, height = 300 }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
      <h3 className="text-lg font-semibold text-foreground mb-4">{title}</h3>
      <div style={{ width: "100%", height }}>
        {children}
      </div>
    </div>
  );
}
