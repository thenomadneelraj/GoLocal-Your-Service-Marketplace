export default function SectionPage({ title, description }) {
  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-border/80 bg-card/95 p-8 shadow-[0_24px_60px_-28px_rgba(15,23,42,0.45)]">
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-r from-primary/20 via-primary/5 to-transparent" />
      <div className="relative space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/80">
          Workspace
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
        <p className="max-w-2xl text-sm leading-7 text-muted-foreground">{description}</p>
      </div>
    </section>
  );
}
