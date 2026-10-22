"use client";

import { useEffect, useRef, useState } from "react";
import { Markdown } from "@/components/Markdown";
import { TutorIAIcon } from "@/components/TutorIA";
import { COACH_MAX_MESSAGES, COACH_MAX_USER_CHARS, COACH_OPENING, hasSummary, parseCoachReply, type CoachPiece } from "@/lib/coachSummary";

type Msg = { role: "user" | "assistant"; content: string };
type Opt = { symbol: string; name: string; href: string };

const ANCHOR = "ayuda-decision";

/**
 * TutorIA («Ayuda para tomar la decisión»): conversación con el tutor de IA de la cartera del mes. La conversación se
 * guarda solo en este dispositivo, para poder salir a «Analizar» una opción y volver sin perderla.
 */
export function DecisionCoach({ portfolioId, userId, name, options, preview }: { portfolioId: string; userId: string; name: string; options: Opt[]; preview?: { amount: string; disabledForMembers: boolean } }) {
  // La prueba del presidente se guarda aparte, para no mezclarla con su propia ayuda de la cartera del mes
  const storeKey = `${preview ? "cartera-ayuda-prueba" : "cartera-ayuda"}:${portfolioId}:${userId}`;
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [streaming, setStreaming] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [wantStart, setWantStart] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const pending = streaming !== null;

  // Recupera la conversación de este dispositivo y abre la ayuda si se llega con #ayuda-decision.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storeKey);
      const saved = raw ? (JSON.parse(raw) as { messages?: Msg[] }) : null;
      if (saved?.messages?.length) {
        setMessages(saved.messages.filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string"));
        setOpen(true);
      }
    } catch {
      /* sin almacenamiento: la ayuda funciona igual, sin recordar la conversación */
    }
    setReady(true);
    const onHash = () => {
      if (window.location.hash !== `#${ANCHOR}`) return;
      setOpen(true);
      setWantStart(true);
    };
    onHash();
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [storeKey]);

  useEffect(() => {
    if (!ready) return;
    try {
      if (messages.length) window.localStorage.setItem(storeKey, JSON.stringify({ messages }));
      else window.localStorage.removeItem(storeKey);
    } catch {
      /* ignorar */
    }
  }, [ready, messages, storeKey]);

  // Baja hasta lo último que se ha escrito.
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, streaming, error]);

  useEffect(() => () => abortRef.current?.abort(), []);

  // Al abrir la ayuda desde el enlace de arriba, la conversación arranca sola si no había ninguna.
  useEffect(() => {
    if (!wantStart || !ready) return;
    setWantStart(false);
    if (!messages.length && streaming === null) void send(COACH_OPENING, []);
    // Solo debe reaccionar a la petición de arrancar; send y el estado se leen tal como están en ese momento.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantStart, ready]);

  async function send(text: string, history = messages) {
    const content = text.trim();
    if (!content || pending) return;
    const next: Msg[] = [...history, { role: "user", content }];
    setMessages(next);
    setInput("");
    setError(null);
    setStreaming("");
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    let acc = "";
    let failure: string | null = null;
    try {
      const res = await fetch("/api/cartera/ayuda", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ portfolioId, messages: next, preview: !!preview }), signal: ctrl.signal });
      if (!res.ok || !res.body) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "No se ha podido contactar con la ayuda. Inténtalo de nuevo.");
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (!line) continue;
          const ev = JSON.parse(line) as { t: string; v?: string };
          if (ev.t === "text") {
            acc += ev.v ?? "";
            setStreaming(acc);
          } else if (ev.t === "error") failure = ev.v ?? "Ha fallado la ayuda.";
        }
      }
    } catch (e) {
      if (ctrl.signal.aborted) return;
      failure = e instanceof Error ? e.message : "Ha fallado la ayuda.";
    } finally {
      if (abortRef.current === ctrl) abortRef.current = null;
    }
    setStreaming(null);
    if (acc.trim()) {
      setMessages([...next, { role: "assistant", content: acc }]);
    } else {
      // Sin respuesta: se deshace el último mensaje y vuelve a la caja para reintentarlo.
      setMessages(history);
      if (content !== COACH_OPENING) setInput(content);
    }
    if (failure) setError(failure);
    else window.requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
  }

  function start() {
    setOpen(true);
    if (!messages.length) void send(COACH_OPENING, []);
    window.requestAnimationFrame(() => sectionRef.current?.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }));
  }

  function restart() {
    if (!window.confirm("¿Borrar esta conversación y empezar otra?")) return;
    abortRef.current?.abort();
    setStreaming(null);
    setError(null);
    setMessages([]);
    void send(COACH_OPENING, []);
  }

  const tooLong = messages.length >= COACH_MAX_MESSAGES - 1;
  const symbols = options.map((o) => ({ symbol: o.symbol, href: o.href }));

  return (
    <section id={ANCHOR} ref={sectionRef} aria-labelledby="ayuda-decision-titulo" className="card card-roomy gap-4 scroll-mt-20">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1 basis-[320px]">
          <TutorIAIcon size={64} className="max-sm:w-12 max-sm:h-12" />
          <div className="min-w-0">
            <div className="card-kicker" style={{ textTransform: "none", letterSpacing: "0.02em" }}>TutorIA</div>
            {preview ? (
              <>
                <h2 id="ayuda-decision-titulo" className="m-0 mt-0.5 text-[22px]">Prueba TutorIA con esta cartera</h2>
                <p className="m-0 mt-1 text-sm text-neutral-700 max-w-[68ch] [text-wrap:pretty]">
                  Habla con él como si fueras un miembro con {preview.amount} para invertir, y mira cómo explica la lección y las opciones. Usa la cartera tal como está ahora: si cambias la lección o las opciones, la siguiente respuesta ya lo tiene en cuenta. Es solo una prueba: no se guarda ninguna decisión.
                  {preview.disabledForMembers && " Ahora mismo TutorIA está desactivado para los miembros de tu club; puedes probarlo igualmente."}
                </p>
              </>
            ) : (
              <>
                <h2 id="ayuda-decision-titulo" className="m-0 mt-0.5 text-[22px]">¿Te ayudo a decidir, {name}?</h2>
                <p className="m-0 mt-1 text-sm text-neutral-700 max-w-[64ch] [text-wrap:pretty]">
                  TutorIA es un tutor con inteligencia artificial que conoce la lección y las opciones de este mes. Te hará preguntas, te explicará lo que no entiendas y, cuando lo tengas claro, te preparará un resumen para tu porqué. La decisión es tuya.
                </p>
              </>
            )}
          </div>
        </div>
        {!open && <TutorIAButton onClick={start} disabled={!ready} label={preview ? "Probar TutorIA" : "TutorIA"} />}
      </div>

      {open && (
        <>
          <div ref={logRef} role="log" aria-live="polite" aria-label="Conversación con TutorIA" className="flex flex-col gap-3 max-h-[min(70vh,640px)] overflow-y-auto overscroll-contain rounded-[10px] border border-divider p-3" style={{ background: "var(--color-neutral-100)" }}>
            {messages.map((m, i) => <Bubble key={i} role={m.role} text={m.content} symbols={symbols} options={options} />)}
            {streaming !== null &&
              (streaming ? <Bubble role="assistant" text={streaming} symbols={symbols} options={options} /> : <p className="m-0 text-sm text-neutral-700" aria-busy="true">TutorIA está pensando…</p>)}
            {error && (
              <p role="alert" className="m-0 text-sm font-medium p-3 border border-divider rounded-[10px]" style={{ background: "var(--color-amber-100)", color: "var(--color-amber-700)" }}>
                {error}
                {!messages.length && <> <button type="button" className="btn-ghost" onClick={() => void send(COACH_OPENING, [])}>Reintentar</button></>}
              </p>
            )}
          </div>

          {!preview && !pending && messages.at(-1)?.role === "assistant" && hasSummary(messages.at(-1)!.content) && (
            <p className="m-0 text-sm flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="text-neutral-700">Pega cada texto en su casilla del paso 2, «Explica», de tu decisión.</span>
              <a href="#decidir" className="btn-secondary">Ir a mi decisión</a>
            </p>
          )}

          {tooLong ? (
            <p className="m-0 text-sm text-neutral-700">La conversación ya es muy larga. Copia lo que te sirva y empieza otra si lo necesitas.</p>
          ) : (
            <form
              className="flex flex-col gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void send(input);
              }}
            >
              <label htmlFor="ayuda-mensaje" className="text-sm">Tu respuesta</label>
              <textarea
                id="ayuda-mensaje"
                ref={inputRef}
                className="input"
                style={{ minHeight: 72 }}
                maxLength={COACH_MAX_USER_CHARS}
                value={input}
                disabled={!messages.length && pending}
                placeholder="Escribe aquí lo que piensas o lo que quieras preguntar"
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    void send(input);
                  }
                }}
              />
              <div className="flex flex-wrap items-center gap-3">
                <button type="submit" className="btn-primary" disabled={pending || !input.trim()}>{pending ? "Respondiendo…" : "Enviar"}</button>
                <span className="text-xs text-neutral-700">Enter para enviar · Mayúsculas + Enter para otra línea</span>
              </div>
            </form>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-700">
            <span className="max-w-[70ch] [text-wrap:pretty]">Lo escribe una IA (Claude) y puede equivocarse: comprueba los datos con «Analizar». La conversación se guarda solo en este dispositivo.</span>
            {messages.length > 0 && <button type="button" className="btn-ghost text-xs" onClick={restart} disabled={pending && !messages.length}>Empezar otra conversación</button>}
          </div>
        </>
      )}
    </section>
  );
}

function Bubble({ role, text, symbols, options = [] }: { role: "user" | "assistant"; text: string; symbols?: { symbol: string; href: string }[]; options?: Opt[] }) {
  if (role === "user") {
    return (
      <div className="self-end max-w-[85%] rounded-[12px] rounded-br-[4px] px-3 py-2 text-[15px] whitespace-pre-wrap [overflow-wrap:anywhere]" style={{ background: "var(--color-accent-100)", color: "var(--color-accent-900)" }}>
        <span className="sr-only">Tú: </span>
        {text}
      </div>
    );
  }
  const pieces = parseCoachReply(text);
  return (
    <div className="self-start max-w-[94%] flex items-start gap-2 min-w-0">
      <TutorIAIcon size={30} className="mt-1" />
      <div className="flex flex-col gap-2 min-w-0">
      {pieces.map((p, i) =>
        p.type === "text" ? (
          <div key={i} className="rounded-[12px] rounded-bl-[4px] border border-divider bg-[var(--color-surface,#fff)] px-3 py-2 text-[15px] [overflow-wrap:anywhere]">
            {i === 0 && <span className="sr-only">TutorIA: </span>}
            <Markdown text={p.text} auto={false} symbols={symbols} className="md-chat" />
          </div>
        ) : (
          <SummaryPiece key={i} piece={p} options={options} />
        ),
      )}
      </div>
    </div>
  );
}

function SummaryPiece({ piece, options }: { piece: Exclude<CoachPiece, { type: "text" }>; options: Opt[] }) {
  const [copied, setCopied] = useState(false);
  const opt = "symbol" in piece ? options.find((o) => o.symbol.toUpperCase() === piece.symbol.toUpperCase()) : null;
  // Los mismos nombres que las casillas del formulario de decisión, para saber dónde pegar cada texto
  const label = piece.type === "porque" ? `¿Por qué eliges ${opt?.symbol ?? piece.symbol}?` : piece.type === "vender" ? `¿Qué te haría vender ${opt?.symbol ?? piece.symbol}? (opcional)` : piece.type === "resumen" ? "Tu justificación, lista para copiar" : "Tu idea general";

  async function copy() {
    try {
      await navigator.clipboard.writeText(piece.text);
    } catch {
      // Sin acceso al portapapeles: se copia con una caja de texto temporal
      const t = document.createElement("textarea");
      t.value = piece.text;
      document.body.appendChild(t);
      t.select();
      document.execCommand("copy");
      t.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div className="rounded-[12px] border-2 px-3 py-2 flex flex-col gap-1.5" style={{ borderColor: "var(--color-accent-600)", background: "var(--color-surface, #fff)" }}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="card-kicker">{label}</span>
        {piece.done && (
          <button type="button" className="btn-secondary py-1 text-xs" onClick={copy} aria-label={`Copiar: ${label}`}>
            {copied ? "Copiado" : "Copiar"}
          </button>
        )}
      </div>
      <p className="m-0 text-[15px] [text-wrap:pretty] whitespace-pre-wrap">{piece.text}</p>
      <span className="sr-only" role="status">{copied ? "Texto copiado" : ""}</span>
    </div>
  );
}

/** Botón de TutorIA: el búho y el nombre. */
export function TutorIAButton({ onClick, disabled, label = "TutorIA" }: { onClick: () => void; disabled?: boolean; label?: string }) {
  return (
    <button type="button" className="btn-secondary" style={{ paddingBlock: 4, paddingLeft: 5 }} onClick={onClick} disabled={disabled} aria-label={`${label}: ayuda para tomar la decisión`}>
      <TutorIAIcon size={32} />
      {label}
    </button>
  );
}
