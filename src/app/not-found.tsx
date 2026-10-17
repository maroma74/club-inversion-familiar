import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="card w-full max-w-md gap-3" style={{ padding: 24 }}>
        <div className="card-kicker text-[11px]">Página no encontrada</div>
        <h1 className="m-0">Esta página no existe</h1>
        <p className="m-0 text-neutral-700">Puede que el enlace esté mal escrito o que lo que buscabas se haya retirado.</p>
        <div className="mt-1"><Link href="/inicio" className="btn-primary">Ir al inicio</Link></div>
      </div>
    </main>
  );
}
