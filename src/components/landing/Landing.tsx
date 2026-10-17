import Link from "next/link";
import { LoginForm } from "@/app/login/LoginForm";
import { FAMILY_INVITE_LIMIT } from "@/lib/familyInvites";

/* Portada pública del Club. Modo «persuadir»: la caja de entrada vive en la cabecera y todo lo demás
   explica a un padre o una madre qué es un club familiar, para qué sirve y cómo se entra. */

const OBJETIVOS = [
  { title: "Que sepan explicar, no acertar", text: "Cada decisión lleva un porqué escrito. La liga puntúa lecciones, logros y argumentos; acertar por suerte no enseña nada y aquí no vale." },
  { title: "Aprender con dinero pequeño y real", text: "Importes de paga, entre 10 y 50 euros al mes, en valores de verdad con precios de verdad. Lo bastante pequeño para equivocarse; lo bastante real para que importe." },
  { title: "Hablar de dinero en casa", text: "Una cartera del mes es una excusa para sentarse a comparar un banco con un ETF mundial. Las conversaciones salen solas; el Club solo pone el tema." },
  { title: "Criterio antes que gurús", text: "Van a invertir igual: en cripto, con una app o siguiendo a alguien en redes. Mejor que antes sepan leer un PER, una tendencia y un riesgo, y preguntar por qué." },
];

const PASOS = [
  { n: 1, title: "El presidente publica la cartera del mes", text: "Una lección corta y dos, tres o cuatro opciones entre las que elegir: acciones, ETF, cripto, materias primas. Si no sabes qué proponer, el repositorio tiene propuestas de otras familias listas para usar." },
  { n: 2, title: "La familia recibe el aviso por WhatsApp", text: "Un mensaje personalizado para cada hijo con su nombre, su importe, el plazo y el enlace directo a la cartera. Tú solo pulsas enviar." },
  { n: 3, title: "Cada miembro investiga, decide y escribe su porqué", text: "La ficha de cada valor explica precio, PER, dividendo y una lectura técnica con sus bloques: qué mide cada uno y qué dice hoy. Sin porqué no hay decisión." },
  { n: 4, title: "Se compra en vuestro bróker y se anota en el Club", text: "El Club no mueve dinero: las compras las hace el adulto titular en su bróker y se registran aquí con fecha, precio y comisión. Cada apunte lleva su razón." },
  { n: 5, title: "La liga, los logros y, un mes después, el repaso", text: "Rentabilidad sobre lo aportado, veintisiete logros, seis niveles de academia. Y cuando la cartera se cierra, el repaso: qué eligió cada uno, cómo le fue y si su porqué sigue teniendo sentido." },
];

const DENTRO = [
  ["Cartera del mes", "Lección del presidente, opciones, plazo e importe por miembro. Historial con todas las carteras archivadas."],
  ["Academia por niveles", "Seis niveles, de la hucha al análisis técnico. Lecciones de menos de diez minutos con quiz; cada nivel abre el siguiente."],
  ["Ficha de cada valor", "Precio, rentabilidades, PER histórico, dividendos, noticias y la lectura del Club de −2 a +2 explicada bloque a bloque."],
  ["Diario de porqués", "Cada compra y cada venta con su razón escrita. Lo que la familia lee después y lo que de verdad hace mejor inversor."],
  ["Liga familiar", "Ranking por rentabilidad sobre lo aportado, puntos por lecciones y logros, estadísticas del club y mejor valor del mes."],
  ["Repaso de cada cartera", "Un mes después: las opciones de mejor a peor, qué eligió cada miembro, cuánto habría dado la mejor y su porqué entre comillas."],
  ["Comunicaciones por WhatsApp", "Avisos personalizados con enlace directo a la cartera. Quedan guardados con quién los recibió."],
  ["Repositorio de propuestas", "Carteras del mes compartidas entre familias. Usa una, adáptala o comparte la tuya y mira cuántas familias la usan."],
  ["Datos reales, fuentes públicas", "Yahoo Finance, SEC EDGAR, Banco Central Europeo, FRED, Finnhub y CoinGecko. Sin cuentas de pago."],
  ["Un presidente, varios roles", "El presidente publica, reparte la paga y aprueba entradas. Puede previsualizar lo que ve cada miembro."],
];

const FAQ = [
  ["¿Cuánto cuesta?", "Nada. El Club de Inversión Familiar es gratuito y no vende datos ni productos financieros. Las comisiones que pagues serán las de vuestro bróker."],
  ["¿Hace falta un bróker?", "Sí, el que ya tenga la familia (o uno que abra el adulto titular). El Club no custodia dinero ni ejecuta órdenes: se compra fuera y se anota dentro, con su porqué."],
  ["¿Mis hijos menores pueden invertir?", "Deciden y argumentan ellos; compra el adulto titular de la cuenta. Es exactamente lo que queremos: que la decisión sea suya y la ejecución, vuestra."],
  ["¿Es asesoramiento financiero?", "No. Todo lo que muestra el Club (fichas, lecturas, puntuaciones) es material educativo para aprender a mirar, nunca una recomendación de comprar o vender. Invertir conlleva riesgo de pérdida."],
  ["¿Cómo se entra?", `Solo por invitación. Cada familia que ya tiene club puede invitar a ${FAMILY_INVITE_LIMIT} familias más. Si conoces a una, pídele una de sus ${FAMILY_INVITE_LIMIT}; si ya tienes el código, crea tu club en un minuto.`],
  ["¿Qué pasa con nuestros datos?", "Cada familia solo ve lo suyo. Las contraseñas van cifradas, las sesiones caducan, y lo único que se comparte entre familias son las propuestas que decidís compartir."],
];

export function Landing() {
  return (
    <div className="lp">
      <a href="#entrar" className="skip-link">Ir a la caja de entrada</a>
      <header className="lp-nav">
        <div className="lp-wrap lp-nav-in">
          <Link href="/" className="lp-logo" aria-label="Club de Inversión Familiar">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="Club de Inversión Familiar" width={206} height={60} />
          </Link>
          <nav className="lp-links" aria-label="Secciones">
            <a href="#objetivos">Objetivos</a>
            <a href="#como-funciona">Cómo funciona</a>
            <a href="#dentro">Qué hay dentro</a>
            <a href="#cinco-familias">Las cinco familias</a>
            <a href="#preguntas">Preguntas</a>
          </nav>
          <a href="#entrar" className="btn-primary lp-nav-cta">Entrar</a>
        </div>
      </header>

      <section className="lp-hero" aria-labelledby="hero-title">
        <svg className="lp-hero-chart" viewBox="0 0 1200 420" preserveAspectRatio="none" aria-hidden="true" focusable="false">
          <path className="lp-hero-line" d="M0 380 L120 352 L240 368 L360 300 L480 318 L600 236 L720 262 L840 170 L960 196 L1080 92 L1200 110" fill="none" stroke="url(#lpGrad)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          <defs><linearGradient id="lpGrad" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stopColor="#0e8a63" /><stop offset=".6" stopColor="#10b981" /><stop offset="1" stopColor="#e5a016" /></linearGradient></defs>
        </svg>
        <div className="lp-wrap lp-hero-in">
          <div className="lp-hero-copy">
            <h1 id="hero-title" className="lp-display">La paga que enseña a invertir.</h1>
            <p className="lp-lede">Un club de inversión para tu familia. Cada mes, una lección, una decisión y un porqué. Tú presides; tus hijos deciden con su paga, en valores de verdad y con precios de verdad.</p>
            <ul className="lp-proof" aria-label="En resumen">
              <li>Importes de 10 a 50 € al mes</li>
              <li>Precios y datos de mercado reales</li>
              <li>Sin bróker propio: se compra en el vuestro</li>
              <li>Solo por invitación</li>
            </ul>
            <div className="lp-hero-actions">
              <Link href="/registro" className="btn-primary lp-btn-lg">Tengo una invitación</Link>
              <a href="#como-funciona" className="lp-link-light">Ver cómo funciona</a>
            </div>
          </div>
          <div id="entrar" className="card lp-login" aria-labelledby="entrar-title">
            <h2 id="entrar-title" className="lp-login-title">Entrar en tu club</h2>
            <p className="lp-login-sub">Miembros y presidentes entran por aquí.</p>
            <LoginForm compact />
          </div>
        </div>
      </section>

      <section id="objetivos" className="lp-section" aria-labelledby="objetivos-title">
        <div className="lp-wrap">
          <h2 id="objetivos-title" className="lp-h2">Para qué existe un club familiar</h2>
          <p className="lp-sub">No es un bróker para adolescentes ni un juego de bolsa con dinero de mentira. Es un método para que una familia aprenda a invertir junta, con cuatro objetivos.</p>
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

      <section id="como-funciona" className="lp-section lp-section-alt" aria-labelledby="como-title">
        <div className="lp-wrap">
          <h2 id="como-title" className="lp-h2">Cómo funciona un mes en el Club</h2>
          <p className="lp-sub">Cinco pasos que se repiten cada mes. Al presidente le cuestan diez minutos; a cada miembro, una decisión bien pensada.</p>
          <ol className="lp-pasos">
            {PASOS.map((p) => (
              <li key={p.n} className="lp-paso">
                <div className="lp-paso-num" aria-hidden="true">{p.n}</div>
                <div className="lp-paso-body">
                  <h3>{p.title}</h3>
                  <p>{p.text}</p>
                </div>
                <div className="lp-paso-mock">{MOCKS[p.n - 1]}</div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="dentro" className="lp-section" aria-labelledby="dentro-title">
        <div className="lp-wrap">
          <h2 id="dentro-title" className="lp-h2">Qué hay dentro</h2>
          <p className="lp-sub">Todo lo que necesita una familia para aprender a invertir, y nada de lo que necesita un bróker.</p>
          <dl className="lp-dentro">
            {DENTRO.map(([t, d]) => (
              <div key={t} className="lp-dentro-item"><dt>{t}</dt><dd>{d}</dd></div>
            ))}
          </dl>
        </div>
      </section>

      <section id="cinco-familias" className="lp-section lp-section-navy" aria-labelledby="cinco-title">
        <div className="lp-wrap lp-cinco">
          <div className="lp-cinco-copy">
            <h2 id="cinco-title" className="lp-h2">Solo se entra por invitación. Cada familia puede invitar a cinco.</h2>
            <p>No hay registro abierto. Un club nace cuando otra familia le da una de sus cinco invitaciones, y a su vez recibe cinco para seguir la cadena. Así el Club crece de familia en familia, con la confianza de quien te invitó, y nunca más deprisa de lo que una familia puede acompañar.</p>
            <p>Una invitación usada ocupa su hueco para siempre. Por eso se piensan: se dan a familias con hijos adolescentes o veinteañeros que de verdad quieran sentarse a aprender.</p>
            <div className="lp-cinco-actions">
              <Link href="/registro" className="btn-primary lp-btn-lg">Tengo un código: crear mi club</Link>
              <span className="lp-cinco-note">¿No lo tienes? Pregunta a una familia que ya esté dentro.</span>
            </div>
          </div>
          <figure className="lp-tree" aria-label="Una familia invita a cinco; cada una de ellas, a cinco más: 1, 5, 25.">
            <svg viewBox="0 0 520 300" role="img" aria-hidden="true" focusable="false">
              <g className="lp-tree-lines" stroke="rgba(248,250,252,0.28)" strokeWidth="1.5" fill="none">
                {[60, 160, 260, 360, 460].map((x) => <path key={x} d={`M260 60 C260 110, ${x} 100, ${x} 150`} />)}
                {[60, 160, 260, 360, 460].flatMap((x) => [-28, -14, 0, 14, 28].map((dx) => <path key={`${x}-${dx}`} d={`M${x} 150 C${x} 190, ${x + dx} 190, ${x + dx} 240`} />))}
              </g>
              <circle cx="260" cy="60" r="20" fill="#e5a016" />
              {[60, 160, 260, 360, 460].map((x) => <circle key={x} cx={x} cy="150" r="13" fill="#10b981" />)}
              {[60, 160, 260, 360, 460].flatMap((x) => [-28, -14, 0, 14, 28].map((dx) => <circle key={`${x}-${dx}`} cx={x + dx} cy="240" r="5" fill="#34d399" />))}
              <text x="500" y="66" textAnchor="end" className="lp-tree-label">1 familia</text>
              <text x="500" y="186" textAnchor="end" className="lp-tree-label">5 clubes</text>
              <text x="500" y="276" textAnchor="end" className="lp-tree-label">25 clubes</text>
            </svg>
            <figcaption>Tu familia, sus cinco invitaciones y las cinco de cada una. Nadie se salta la cadena.</figcaption>
          </figure>
        </div>
      </section>

      <section id="preguntas" className="lp-section" aria-labelledby="faq-title">
        <div className="lp-wrap lp-faq-wrap">
          <h2 id="faq-title" className="lp-h2">Preguntas de padres y madres</h2>
          <div className="lp-faq">
            {FAQ.map(([q, a]) => (
              <details key={q}><summary>{q}</summary><p>{a}</p></details>
            ))}
          </div>
        </div>
      </section>

      <section className="lp-section lp-section-alt lp-final" aria-labelledby="final-title">
        <div className="lp-wrap">
          <h2 id="final-title" className="lp-display lp-display-sm">Tu hijo va a invertir igual. Mejor que aprenda contigo.</h2>
          <div className="lp-hero-actions">
            <a href="#entrar" className="btn-primary lp-btn-lg">Entrar en mi club</a>
            <Link href="/registro" className="btn-secondary lp-btn-lg">Tengo una invitación</Link>
          </div>
        </div>
      </section>

      <footer className="lp-footer">
        <div className="lp-wrap lp-footer-in">
          <p>Club de Inversión Familiar. Material educativo: nada de lo que muestra es asesoramiento financiero ni una recomendación de comprar o vender. Invertir conlleva riesgo de pérdida.</p>
          <p><Link href="/login">Entrar</Link> · <Link href="/registro">Crear mi club con una invitación</Link></p>
        </div>
      </footer>
    </div>
  );
}

/* Maquetas de la interfaz real, a escala, para que el padre vea lo que verá su familia. Datos inventados. */
const MOCKS: React.ReactNode[] = [
  <div key="cartera" className="lp-mock">
    <div className="lp-mock-kicker">Cartera de octubre · abierta · hasta el 25/10</div>
    <div className="lp-mock-title">Banca española frente a un ETF mundial</div>
    <div className="lp-mock-opts"><span>SAN.MC</span><span>BBVA.MC</span><span>VWCE.DE</span></div>
    <div className="lp-mock-quote">Idea clave: diversificar es la única ventaja gratis que da el mercado.</div>
  </div>,
  <div key="wa" className="lp-mock lp-mock-wa">
    <div className="lp-wa-bubble">
      <b>¡Hola, Jorge!</b> La cartera de octubre ya está lista: <b>Banca española frente a un ETF mundial</b>.<br />Tienes <span className="tabular-nums">50,00 €</span> para invertir entre 3 opciones, hasta el 25/10.<br />Entra aquí y decide: clubdeinversionfamiliar.com/cartera
      <span className="lp-wa-time">19:42</span>
    </div>
  </div>,
  <div key="porque" className="lp-mock">
    <div className="lp-mock-kicker">Decisión de Lucía · 50,00 € · VWCE.DE</div>
    <blockquote className="lp-mock-why">«Prefiero el mundo entero a un banco: el ETF tiene 3.600 empresas y un TER del 0,22 %. Si la banca sube, el ETF también la lleva dentro.»</blockquote>
    <div className="lp-mock-read"><span>Lectura del Club</span><i /><span>neutral</span></div>
  </div>,
  <div key="ops" className="lp-mock">
    <div className="lp-mock-kicker">Operaciones de Lucía</div>
    <table className="lp-mock-table"><tbody>
      <tr><td>06/10</td><td>Compra</td><td>VWCE.DE</td><td className="tabular-nums">0,2952 × 169,40 €</td><td className="tabular-nums">−50,00 €</td></tr>
      <tr><td>05/09</td><td>Compra</td><td>GOOGL</td><td className="tabular-nums">0,2914 × 171,60 €</td><td className="tabular-nums">−50,00 €</td></tr>
      <tr><td>17/08</td><td>Compra</td><td>AAPL</td><td className="tabular-nums">0,5 × 228,30 $</td><td className="tabular-nums">−98,17 €</td></tr>
    </tbody></table>
  </div>,
  <div key="liga" className="lp-mock">
    <div className="lp-mock-kicker">Liga de inversión familiar · octubre</div>
    <ol className="lp-mock-liga">
      <li><span className="lp-mock-pos">1.º</span><span>Hugo</span><span className="tag tag-gold">Líder</span><span className="tabular-nums lp-mock-pct">+31,17 %</span></li>
      <li><span className="lp-mock-pos">2.º</span><span>Lucía</span><span /><span className="tabular-nums lp-mock-pct">+28,87 %</span></li>
      <li><span className="lp-mock-pos">3.º</span><span>Carla</span><span /><span className="tabular-nums lp-mock-pct">+17,12 %</span></li>
      <li><span className="lp-mock-pos">5.º</span><span>Marta <small>presidenta</small></span><span /><span className="tabular-nums lp-mock-pct">+6,27 %</span></li>
    </ol>
  </div>,
];
