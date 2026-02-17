import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

const colorMap = {
  blue: {
    dot: "bg-blue-500",
    line: "bg-blue-500",
    label: "bg-blue-500/10 text-blue-400",
    hex: "#3b82f6",
  },
  green: {
    dot: "bg-green-500",
    line: "bg-green-500",
    label: "bg-green-500/10 text-green-400",
    hex: "#22c55e",
  },
  purple: {
    dot: "bg-purple-500",
    line: "bg-purple-500",
    label: "bg-purple-500/10 text-purple-400",
    hex: "#a855f7",
  },
  orange: {
    dot: "bg-orange-500",
    line: "bg-orange-500",
    label: "bg-orange-500/10 text-orange-400",
    hex: "#f97316",
  },
};

export default function TimelineSection({
  children,
  color = "blue",
  label,
  id,
}) {
  const ref = useRef(null);
  const [active, setActive] = useState(false);

  // ✅ Support both named color and hex
  const isHex = typeof color === "string" && color.startsWith("#");

  const colorConfig = !isHex ? colorMap[color] : null;

  const hex = isHex ? color : colorConfig?.hex || "#3b82f6";

  const dotClass = isHex ? "bg-white" : colorConfig?.dot || "bg-blue-500";

  const lineClass = isHex ? "bg-white" : colorConfig?.line || "bg-blue-500";

  const labelClass = isHex
    ? "bg-white/10 text-white"
    : colorConfig?.label || "bg-blue-500/10 text-blue-400";

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setActive(entry.isIntersecting),
      { threshold: 0.45 },
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      id={id}
      data-color={hex}
      className="
  relative py-20 scroll-mt-24
  hidden md:grid
  grid-cols-[3rem_6rem_minmax(0,1fr)]
  items-center
"
    >
      {/* TIMELINE DOT COLUMN */}
      <div className="relative flex justify-center pt-4">
        <span
          className={cn(
            "h-3 w-3 rounded-full z-20 transition-all duration-300",
            dotClass,
            active && "scale-125 shadow-lg",
          )}
        />
      </div>

      {/* CONNECTOR + LABEL */}
      <div className="relative flex items-center pt-5">
        <span className={cn("h-[2px] w-full", lineClass)} />

        {label && (
          <span
            className={cn(
              "absolute -top-7 left-1/2 -translate-x-1/2",
              "text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap",
              labelClass,
            )}
          >
            {label}
          </span>
        )}
      </div>

      {/* CONTENT */}
      <div
        className={cn(
          "relative pl-10 w-full",
          "transition-all duration-700 ease-out",
          active ? "opacity-100 translate-x-0" : "opacity-0 translate-x-6",
        )}
      >
        {children}
      </div>
    </section>
  );
}
