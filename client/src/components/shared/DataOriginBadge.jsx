export default function DataOriginBadge({
  origin = "real",
  liveLabel = "Live",
  sampleLabel = "Sample Data",
  className = "",
}) {
  const isMock = origin === "mock";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${
        isMock
          ? "border-amber-400/40 bg-amber-400/10 text-amber-700 dark:text-amber-300"
          : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
      } ${className}`.trim()}
    >
      {isMock ? sampleLabel : liveLabel}
    </span>
  );
}
