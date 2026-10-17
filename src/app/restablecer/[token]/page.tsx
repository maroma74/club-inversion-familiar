import Link from "next/link";
import { resetLinkStatus } from "@/app/actions/password";
import { ResetForm } from "./ResetForm";

export default async function RestablecerPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const status = await resetLinkStatus(token);
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="card w-full max-w-sm gap-3" style={{ padding: 24 }}>
        <div className="card-kicker text-[11px]">Club de Inversión Familiar</div>
        {status.ok ? (
          <>
            <h1 className="m-0">Nueva contraseña</h1>
            <p className="m-0 text-sm text-neutral-700">Hola, {status.name}. Elige una contraseña nueva de al menos 10 caracteres. Al guardarla se cerrarán tus sesiones anteriores.</p>
            <ResetForm token={token} />
          </>
        ) : (
          <>
            <h1 className="m-0">Enlace no válido</h1>
            <p className="m-0 text-sm text-neutral-700">Este enlace ya se ha usado, ha caducado (duran una hora) o no es correcto. Pide al presidente del club que te genere otro.</p>
            <div><Link href="/login" className="btn-secondary">Ir a entrar</Link></div>
          </>
        )}
      </div>
    </main>
  );
}
