/** Mientras una pantalla espera las cotizaciones en vivo, se muestra esto en vez de una página en blanco. */
export default function Loading() {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-5">
      <p className="m-0 text-sm text-neutral-700">Cargando datos y cotizaciones…</p>
      <div aria-hidden="true" className="flex flex-col gap-4 motion-safe:animate-pulse">
        <div className="h-9 w-64 max-w-full rounded-[10px]" style={{ background: "var(--color-neutral-300)" }} />
        <div className="h-4 w-96 max-w-full rounded-full" style={{ background: "var(--color-neutral-300)" }} />
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))" }}>
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-28 rounded-[12px]" style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-divider)" }} />
          ))}
        </div>
        <div className="h-64 rounded-[12px]" style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-divider)" }} />
      </div>
    </div>
  );
}
