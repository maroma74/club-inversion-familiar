import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { NewProposalForm } from "../forms";

/** Alta de una propuesta en el catálogo sin pasar por una cartera: lección, opciones y reglas, lista para que cualquier familia la use. */
export default async function NuevaPropuestaPage() {
  const admin = await requireAdmin();
  return (
    <div className="flex flex-col gap-6 max-w-[900px]">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="card-kicker text-[11px]">Repositorio de propuestas</div>
          <h1 className="mt-1 mb-1">Nueva propuesta para el catálogo</h1>
          <p className="m-0 text-neutral-700 max-w-[66ch] [text-wrap:pretty]">Una propuesta es una lección más una lista de valores entre los que elegir. Queda en el catálogo para cualquier mes y cualquier familia (firmada como {admin.family.name} o anónima); cuando la uses en un mes, quedará marcada como usada. Recuerda la normativa del club: texto neutro, sin meses, periodos ni enlaces.</p>
        </div>
        <Link href="/cartera/repositorio" className="btn-ghost">← Repositorio</Link>
      </header>
      <section className="card blueprint gap-3" style={{ padding: 24 }}>
        <NewProposalForm familyName={admin.family.name} />
      </section>
    </div>
  );
}
