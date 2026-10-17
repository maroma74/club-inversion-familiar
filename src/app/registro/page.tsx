import type { Metadata } from "next";
import Link from "next/link";
import { checkJoinCode } from "@/lib/auth";
import { RegisterForm, type Preview } from "./RegisterForm";
import { familySignupAllowed } from "@/app/actions/auth";
import { clientIp, rateLimit } from "@/lib/ratelimit";
import { OBJETIVOS, PASOS } from "@/components/landing/Landing";
import { RotatingClaim } from "@/components/landing/RotatingClaim";
import { FAMILY_INVITE_LIMIT } from "@/lib/familyInvites";

export const metadata: Metadata = {
  title: "Crea el club de tu familia · Club de Inversión Familiar",
  description: "La paga que enseña a invertir: cada mes, una lección, una decisión y un porqué. Crea el club de tu familia con tu invitación.",
};

/** l***@dominio.com: suficiente para que el invitado sepa con qué email registrarse sin exponerlo a terceros. */
function maskEmail(email: string) {
  const [u, d] = email.split("@");
  return `${u.slice(0, 1)}***@${d ?? ""}`;
}

/**
 * Registro con presentación: quien llega con el enlace de una invitación (por WhatsApp o correo) ve, junto a la
 * tarjeta de alta, qué es el Club y por qué merece la pena, no solo un formulario.
 */
export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ codigo?: string | string[] }> }) {
  const { codigo } = await searchParams;
  const code = (Array.isArray(codigo) ? codigo[0] : codigo)?.trim().toUpperCase().slice(0, 20) ?? "";
  // Comprobar códigos sin estar registrado es público: se limita por conexión para que no se puedan probar a ciegas.
  const allowed = code ? (await rateLimit(`join-preview:${await clientIp()}`, 30, 15 * 60 * 1000)).ok : false;
  const check = code ? (allowed ? await checkJoinCode(code) : { kind: "invalid" as const, reason: "Demasiados intentos" }) : null;
  const allowCreate = await familySignupAllowed();
  const preview: Preview | null = check
    ? check.kind === "invalid"
      ? { error: "Código de invitación no válido, usado o caducado. Pide uno nuevo al presidente del club." }
      : check.kind === "newFamily"
        ? { familyName: "", invitingFamily: check.invitingFamily, name: check.name ? check.name.split(" ")[0] : null, email: check.email ? maskEmail(check.email) : null, role: "ADMIN", personal: true, newFamily: true }
        : check.kind === "invitation"
          ? { familyName: check.familyName, name: check.name ? check.name.split(" ")[0] : null, email: check.email ? maskEmail(check.email) : null, role: check.role, personal: true }
          : { familyName: check.familyName, name: null, email: null, role: "MEMBER", personal: false, approval: check.joinMode === "CODE_APPROVAL" }
    : null;
  const ok = preview && !("error" in preview) ? preview : null;
  const newFamily = Boolean(ok?.newFamily);
  const joining = Boolean(ok && !ok.newFamily);

  const title = newFamily ? "La paga que enseña a invertir. Ahora, en tu casa." : joining ? `Tu familia ya tiene club. Te falta entrar.` : "La paga que enseña a invertir.";
  const lede = newFamily
    ? `${ok?.invitingFamily} te ha dado una de sus ${FAMILY_INVITE_LIMIT} invitaciones. Con ella fundas el club de inversión de tu familia: cada mes una lección, una decisión y un porqué, con la paga de tus hijos y en valores de verdad. Tú presides; ellos deciden.`
    : joining
      ? `${ok?.familyName} usa el Club para aprender a invertir en familia: cada mes una lección, una decisión y un porqué, con tu paga y en valores de verdad. Entra con tu código y verás la cartera del mes, la liga y la academia.`
      : "Un club de inversión para tu familia: cada mes, una lección, una decisión y un porqué. Tú presides; tus hijos deciden con su paga.";

  return (
    <div className="lp">
      <a href="#registro" className="skip-link">Ir al formulario de alta</a>
      <header className="lp-nav">
        <div className="lp-wrap lp-nav-in">
          <Link href="/" className="lp-logo" aria-label="Portada del Club de Inversión Familiar">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="Club de Inversión Familiar" width={206} height={60} />
          </Link>
          <nav className="lp-links" aria-label="Secciones">
            <a href="#que-es">Qué es</a>
            <a href="#primer-mes">Tu primer mes</a>
            <Link href="/">Portada completa</Link>
          </nav>
          <Link href="/login" className="btn-secondary lp-nav-cta">Entrar</Link>
        </div>
      </header>

      <section className="lp-hero" aria-labelledby="hero-title">
        <svg className="lp-hero-chart" viewBox="0 0 1200 420" preserveAspectRatio="none" aria-hidden="true" focusable="false">
          <path className="lp-hero-line" d="M0 380 L120 352 L240 368 L360 300 L480 318 L600 236 L720 262 L840 170 L960 196 L1080 92 L1200 110" fill="none" stroke="url(#lpGradR)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          <defs><linearGradient id="lpGradR" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stopColor="#0e8a63" /><stop offset=".6" stopColor="#10b981" /><stop offset="1" stopColor="#e5a016" /></linearGradient></defs>
        </svg>
        <div className="lp-wrap lp-hero-in">
          <div className="lp-hero-copy">
            <h1 id="hero-title" className="lp-display lp-display-md">{title}</h1>
            <p className="lp-lede">{lede}</p>
            <ul className="lp-proof" aria-label="En resumen">
              <li>Gratis, sin productos financieros</li>
              <li>Importes de paga: 10 a 50 € al mes</li>
              <li>Datos de mercado reales</li>
              <li>Se compra en vuestro bróker; aquí se aprende</li>
              {newFamily && <li>Tú presides y recibes {FAMILY_INVITE_LIMIT} invitaciones</li>}
            </ul>
            <blockquote className="lp-hero-quote">
              <p>«<RotatingClaim />»</p>
            </blockquote>
          </div>
          <RegisterForm initialCode={code} allowCreate={allowCreate} preview={preview} />
        </div>
      </section>

      <section id="que-es" className="lp-section" aria-labelledby="que-es-title">
        <div className="lp-wrap">
          <h2 id="que-es-title" className="lp-h2">Para qué existe un club familiar</h2>
          <p className="lp-sub">No es un bróker para adolescentes ni un juego con dinero de mentira. Es un método para que una familia aprenda a invertir junta.</p>
          <div className="lp-objetivos">
            {OBJETIVOS.map((o) => (
              <article key={o.title} className="lp-objetivo">
                <h3>{o.title}</h3>
                <p>{o.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="primer-mes" className="lp-section lp-section-alt" aria-labelledby="primer-mes-title">
        <div className="lp-wrap">
          <h2 id="primer-mes-title" className="lp-h2">{newFamily ? "Tu primer mes como presidente" : "Cómo funciona un mes en el Club"}</h2>
          <p className="lp-sub">{newFamily ? "Diez minutos al mes para ti; una decisión bien pensada para cada miembro. Si no sabes qué proponer, hay propuestas de otras familias listas para usar." : "Cinco pasos que se repiten cada mes."}</p>
          <ol className="lp-pasos lp-pasos-compact">
            {PASOS.map((p) => (
              <li key={p.n} className="lp-paso">
                <div className="lp-paso-num" aria-hidden="true">{p.n}</div>
                <div className="lp-paso-body">
                  <h3>{p.title}</h3>
                  <p>{p.text}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="lp-hero-actions" style={{ marginTop: 36 }}>
            <a href="#registro" className="btn-primary lp-btn-lg">{newFamily ? "Crear el club de mi familia" : joining ? "Entrar en mi club" : "Usar mi invitación"}</a>
            <Link href="/" className="btn-secondary lp-btn-lg">Ver la portada completa</Link>
          </div>
        </div>
      </section>

      <footer className="lp-footer">
        <div className="lp-wrap lp-footer-in">
          <p>Club de Inversión Familiar. Material educativo: nada de lo que muestra es asesoramiento financiero ni una recomendación de comprar o vender. Invertir conlleva riesgo de pérdida.</p>
          <p><Link href="/">Portada</Link> · <Link href="/login">Entrar</Link></p>
        </div>
      </footer>
    </div>
  );
}
