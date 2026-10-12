import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { logoutAction } from "@/app/actions/auth";
import { withdrawRequestAction } from "@/app/actions/invitations";

export default async function PendientePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.status === "ACTIVE") redirect("/inicio");
  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="card w-full max-w-md text-center">
        
        <h1 className="text-xl font-bold mb-1">Solicitud pendiente</h1>
        <p className="text-sm text-slate-600 mb-4">
          Hola, {user.name}. Tu solicitud para entrar en <b>{user.family.name}</b> está esperando la aprobación del presidente del club. Cuando la acepte, podrás entrar con tu email y contraseña.
        </p>
        <div className="flex justify-center gap-2">
          <form action={logoutAction}><button className="btn-secondary">Salir</button></form>
          <form action={withdrawRequestAction}><button className="btn-danger">Retirar solicitud</button></form>
        </div>
      </div>
    </main>
  );
}
