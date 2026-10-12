import { eur } from "@/lib/format";

export function Kpi({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "good" | "bad" | "neutral" }) {
  const color = tone === "good" ? "var(--color-accent-700)" : "var(--color-text)";
  return (
    <div className="card blueprint gap-1" style={{ padding: "16px 18px" }}>
      <div className="text-[11px] tracking-[0.08em] uppercase text-neutral-700">{label}</div>
      <div className="figure text-[26px]" style={{ color }}>{value}</div>
      {hint && <div className="text-xs text-neutral-700">{hint}</div>}
    </div>
  );
}

export function Money({ n, signed = false }: { n: number; signed?: boolean }) {
  const color = signed ? (n > 0 ? "var(--color-accent-700)" : "var(--color-text)") : undefined;
  return <span className="tabular-nums" style={{ color }}>{signed && n > 0 ? "+" : ""}{eur(n)}</span>;
}

export function Empty({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="card blueprint text-center py-12">
      <div className="font-heading text-[20px]">{title}</div>
      {children && <div className="text-sm text-neutral-700 mt-2">{children}</div>}
    </div>
  );
}

export function PageHeader({ kicker, title, subtitle, children }: { kicker?: string; title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 mb-7">
      <div>
        {kicker && <div className="card-kicker text-[11px]">{kicker}</div>}
        <h1 className="mt-1 mb-1">{title}</h1>
        {subtitle && <p className="m-0 text-neutral-700 max-w-[64ch] [text-wrap:pretty]">{subtitle}</p>}
      </div>
      {children}
    </header>
  );
}

export function Severity({ s }: { s: "alta" | "media" | "baja" }) {
  const cls = s === "alta" ? "tag-ink" : s === "media" ? "tag-accent" : "tag-neutral";
  return <span className={`tag ${cls}`}>{s === "alta" ? "Prioridad alta" : s === "media" ? "Prioridad media" : "Sugerencia"}</span>;
}
