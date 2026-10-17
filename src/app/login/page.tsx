import Link from "next/link";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="card w-full max-w-sm">
        <Link href="/" className="inline-block rounded-xl mb-4 self-start" style={{ background: "#0e2138", padding: "10px 16px" }} aria-label="Portada del Club de Inversión Familiar">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="Club de Inversión Familiar" className="w-60" />
        </Link>
        <h1 className="mb-1">Entrar</h1>
        <p className="text-sm text-slate-500 mb-6">Aprende, invierte y crece en familia.</p>
        <LoginForm />
        <p className="text-xs text-slate-500 mt-2 text-center"><Link href="/" className="text-slate-500">¿Qué es el Club? Ver la portada</Link></p>
      </div>
    </main>
  );
}
