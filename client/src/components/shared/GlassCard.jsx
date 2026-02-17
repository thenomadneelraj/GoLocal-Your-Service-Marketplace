import { cn } from "@/lib/utils";

export default function GlassCard({ className, children }) {
  return (
    <div
      className={cn(
        `
        rounded-xl
        border border-border
        bg-card/60 backdrop-blur-xl
        shadow-lg hover:shadow-xl
        transition-all
        `,
        className
      )}
    >
      {children}
    </div>
  );
}
