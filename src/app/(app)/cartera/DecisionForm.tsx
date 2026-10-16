"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { submitDecisionAction } from "@/app/actions/monthly";
import { eur } from "@/lib/format";

type Opt = { id: string; symbol: string; name: string; kind: string; note: string | null; price: number | null; href: string; signal: string | null };
type Step = 1 | 2 | 3;
type Draft = { step: Step; picked: string[]; amounts: Record<string, string>; whys: Record<string, string>; exits: Record<string, string>; argument: string; manual: boolean };

const MIN_WHY = 10;
const MIN_ARGUMENT = 20;
const STEPS = ["Elige y reparte", "Explica", "Revisa y envía"];

const kindLabel = (k: string) => (k === "ETF" ? "ETF" : k === "CRYPTO" ? "cripto" : k === "COMMODITY" ? "materia prima" : "acción");
const num = (s: string | undefined) => {
  const n = Number((s ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};
const round2 = (n: number) => Math.round(n * 100) / 100;

export function DecisionForm({ portfolioId, userId, options, allocation, minChoices, maxChoices }: { portfolioId: string; userId: string; options: Opt[]; allocation: number; minChoices: number; maxChoices: number }) {
  const [state, action, pending] = useActionState(submitDecisionAction, undefined);
  const [step, setStep] = useState<Step>(1);
  const [picked, setPicked] = useState<string[]>([]);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [whys, setWhys] = useState<Record<string, string>>({});
  const [exits, setExits] = useState<Record<string, string>>({});
  const [argument, setArgument] = useState("");
  const [manual, setManual] = useState(false);
  const [ready, setReady] = useState(false);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const single = maxChoices === 1;
  const draftKey = `cartera-borrador:${portfolioId}:${userId}`;

  // Recupera el borrador de este dispositivo (si existe) al abrir la pantalla.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(draftKey);
      if (raw) {
        const d = JSON.parse(raw) as Partial<Draft>;
        const valid = (d.picked ?? []).filter((id) => options.some((o) => o.id === id)).slice(0, maxChoices);
        setPicked(valid);
        setAmounts(d.amounts ?? {});
        setWhys(d.whys ?? {});
        setExits(d.exits ?? {});
        setArgument(d.argument ?? "");
        setManual(!!d.manual);
        setStep(valid.length >= minChoices && (d.step === 2 || d.step === 3) ? d.step : 1);
      }
    } catch {
      /* sin almacenamiento: el formulario funciona igual, sin borrador */
    }
    setReady(true);
  }, [draftKey, options, maxChoices, minChoices]);

  // Guarda el borrador en cada cambio, para que un fallo, una recarga o cerrar la pestaña no pierdan lo escrito.
  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(draftKey, JSON.stringify({ step, picked, amounts, whys, exits, argument, manual } satisfies Draft));
    } catch {
      /* ignorar */
    }
  }, [ready, draftKey, step, picked, amounts, whys, exits, argument, manual]);

  useEffect(() => {
    if (state?.ok) {
      try {
        window.localStorage.removeItem(draftKey);
      } catch {
        /* ignorar */
      }
    }
  }, [state, draftKey]);

  // Al fallar el envío, el aviso recibe el foco para que se anuncie y se vea.
  useEffect(() => {
    if (state?.error) errorRef.current?.focus();
  }, [state]);

  function equalSplit(ids: string[]) {
    const share = ids.length ? Math.floor((allocation / ids.length) * 100) / 100 : 0;
    const a: Record<string, string> = {};
    ids.forEach((x, i) => (a[x] = String(i === ids.length - 1 ? round2(allocation - share * (ids.length - 1)) : share)));
    return a;
  }

  function toggle(id: string) {
    let next: string[];
    if (single) next = [id];
    else if (picked.includes(id)) next = picked.filter((x) => x !== id);
    else if (picked.length >= maxChoices) return;
    else next = [...picked, id];
    setPicked(next);
    // Reparto a partes iguales mientras no hayas tocado ningún importe; después se respeta lo que escribiste.
    setAmounts(manual ? Object.fromEntries(next.map((x) => [x, amounts[x] ?? ""])) : equalSplit(next));
  }

  const total = round2(picked.reduce((s, id) => s + num(amounts[id]), 0));
  const remaining = round2(allocation - total);
  const over = remaining < -0.01;
  const pickedOpts = options.filter((o) => picked.includes(o.id));

  const step1Problem =
    picked.length < minChoices
      ? single
        ? "Elige una opción para continuar."
        : `Elige al menos ${minChoices} ${minChoices === 1 ? "opción" : "opciones"} para continuar.`
      : pickedOpts.find((o) => num(amounts[o.id]) <= 0)
        ? `Indica cuánto pones en ${pickedOpts.find((o) => num(amounts[o.id]) <= 0)!.symbol}.`
        : over
          ? `Te pasas ${eur(-remaining)} de tu importe: baja algún importe.`
          : null;
  const shortWhy = pickedOpts.find((o) => (whys[o.id] ?? "").trim().length < MIN_WHY);
  const step2Problem = shortWhy
    ? `Cuenta por qué eliges ${shortWhy.symbol}: faltan ${MIN_WHY - (whys[shortWhy.id] ?? "").trim().length} letras.`
    : argument.trim().length < MIN_ARGUMENT
      ? `Falta tu idea general: faltan ${MIN_ARGUMENT - argument.trim().length} letras.`
      : null;

  function go(to: Step) {
    setStep(to);
    topRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }

  return (
    <form
      action={action}
      className="flex flex-col gap-5"
      onKeyDown={(e) => {
        // Enter dentro de un campo no debe enviar la cartera antes de la revisión.
        if (e.key === "Enter" && (e.target as HTMLElement).tagName === "INPUT") e.preventDefault();
      }}
    >
      <input type="hidden" name="portfolioId" value={portfolioId} />
      <input type="hidden" name="argument" value={argument} />
      {pickedOpts.map((o) => (
        <span key={o.id} hidden>
          <input type="hidden" name={`pick_${o.id}`} value="on" />
          <input type="hidden" name={`amount_${o.id}`} value={String(num(amounts[o.id]))} />
          <input type="hidden" name={`why_${o.id}`} value={whys[o.id] ?? ""} />
          <input type="hidden" name={`exit_${o.id}`} value={exits[o.id] ?? ""} />
        </span>
      ))}

      <div ref={topRef} className="scroll-mt-20 flex flex-col gap-2">
        <h3 className="m-0">Tu decisión</h3>
        <ol aria-label="Pasos de tu decisión" className="m-0 p-0 list-none flex flex-wrap gap-2 text-sm">
          {STEPS.map((label, i) => {
            const n = (i + 1) as Step;
            return (
              <li key={label} aria-current={step === n ? "step" : undefined} className={`tag ${step === n ? "tag-ink" : n < step ? "tag-accent" : "tag-neutral"}`} style={{ fontSize: 14, padding: "4px 12px" }}>
                {n}. {label}
              </li>
            );
          })}
        </ol>
        <p className="m-0 text-sm text-neutral-700">Tu borrador se guarda solo en este dispositivo: puedes salir a investigar y volver.</p>
      </div>

      {step === 1 && (
        <fieldset className="m-0 p-0 border-0 min-w-0 flex flex-col gap-3">
          <legend className="p-0 mb-1 text-base">
            {single ? "Elige una opción" : `Elige entre ${minChoices} y ${maxChoices} opciones`} y decide cuánto pones en cada una. Tienes <b>{eur(allocation)}</b>.
          </legend>
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 300px), 1fr))" }}>
            {options.map((o) => {
              const on = picked.includes(o.id);
              const full = !single && !on && picked.length >= maxChoices;
              return (
                <div key={o.id} className="card card-snug gap-2" style={{ borderColor: on ? "var(--color-accent)" : "var(--color-divider)", opacity: full ? 0.6 : 1 }}>
                  <label className={`flex items-start gap-3 ${full ? "cursor-not-allowed" : "cursor-pointer"}`}>
                    <input type={single ? "radio" : "checkbox"} name={single ? "eleccion" : undefined} checked={on} disabled={full} onChange={() => toggle(o.id)} className="mt-1" />
                    <span className="min-w-0">
                      <span className="font-heading text-lg">{o.symbol}</span> <span className="tag tag-neutral ml-1">{kindLabel(o.kind)}</span>
                      {on && <span className="tag tag-accent ml-1">Elegida</span>}
                      <span className="block text-sm text-neutral-700">{o.name}{o.price !== null ? ` · ${eur(o.price)}` : ""}</span>
                    </span>
                  </label>
                  {o.signal && <div className="text-sm text-neutral-700">{o.signal}</div>}
                  {o.note && <div className="text-sm [text-wrap:pretty]">{o.note}</div>}
                  <div>
                    <a href={o.href} target="_blank" rel="noreferrer" className="btn-ghost">Analizar {o.symbol}</a>
                  </div>
                  {on && (
                    <div className="field border-t border-divider pt-2">
                      <label htmlFor={`importe-${o.id}`}>Importe en € para {o.symbol}</label>
                      <input
                        id={`importe-${o.id}`}
                        inputMode="decimal"
                        autoComplete="off"
                        className="input"
                        value={amounts[o.id] ?? ""}
                        onChange={(e) => {
                          setManual(true);
                          setAmounts((a) => ({ ...a, [o.id]: e.target.value }));
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {picked.length > 1 && (
            <div>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setManual(false);
                  setAmounts(equalSplit(picked));
                }}
              >
                Repartir a partes iguales
              </button>
            </div>
          )}
          {!single && picked.length >= maxChoices && <p className="m-0 text-sm text-neutral-700">Ya has elegido el máximo ({maxChoices}). Quita una para elegir otra.</p>}
        </fieldset>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-4">
          <p className="m-0 text-base text-neutral-700">No hay respuestas buenas ni malas: lo que importa es que expliques lo que has pensado. Después podrás revisarlo.</p>
          {pickedOpts.map((o) => {
            const len = (whys[o.id] ?? "").trim().length;
            return (
              <div key={o.id} className="card card-snug gap-3">
                <div className="font-heading text-lg">{o.symbol} · <span className="text-base font-medium">{eur(num(amounts[o.id]))}</span></div>
                {o.note && <div className="text-sm text-neutral-700">Para investigar: {o.note}</div>}
                <div className="field">
                  <label htmlFor={`why-${o.id}`}>¿Por qué eliges {o.symbol}?</label>
                  <textarea
                    id={`why-${o.id}`}
                    className="input"
                    style={{ minHeight: 90 }}
                    aria-describedby={`why-ayuda-${o.id}`}
                    value={whys[o.id] ?? ""}
                    onChange={(e) => setWhys((w) => ({ ...w, [o.id]: e.target.value }))}
                  />
                  <div id={`why-ayuda-${o.id}`} className="text-sm text-neutral-700 mt-1">Ejemplo: «Me gusta porque vende cosas que todo el mundo usa y paga dividendo cada año.» {len < MIN_WHY ? `Mínimo ${MIN_WHY} letras (llevas ${len}).` : "Listo."}</div>
                </div>
                <div className="field">
                  <label htmlFor={`exit-${o.id}`}>¿Qué te haría vender? (opcional)</label>
                  <input id={`exit-${o.id}`} className="input" value={exits[o.id] ?? ""} onChange={(e) => setExits((x) => ({ ...x, [o.id]: e.target.value }))} />
                  <div className="text-sm text-neutral-700 mt-1">Un precio, un dato o un plazo. Ejemplo: «Si baja un 20 %» o «dentro de un año».</div>
                </div>
              </div>
            );
          })}
          <div className="field">
            <label htmlFor="argumento">Tu idea general: ¿qué has aprendido de la lección y cómo la aplicas?</label>
            <textarea id="argumento" className="input" style={{ minHeight: 100 }} aria-describedby="argumento-ayuda" value={argument} onChange={(e) => setArgument(e.target.value)} />
            <div id="argumento-ayuda" className="text-sm text-neutral-700 mt-1">{argument.trim().length < MIN_ARGUMENT ? `Mínimo ${MIN_ARGUMENT} letras (llevas ${argument.trim().length}).` : "Listo."}</div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-col gap-4">
          <p className="m-0 text-base text-neutral-700">Revisa tu cartera antes de enviarla. Puedes volver atrás para cambiar lo que quieras.</p>
          <div className="flex flex-col gap-3">
            {pickedOpts.map((o) => (
              <div key={o.id} className="card card-snug gap-1.5">
                <div className="flex justify-between items-baseline gap-2 flex-wrap">
                  <div className="font-heading text-lg">{o.symbol} <span className="text-base font-medium text-neutral-700">{o.name}</span></div>
                  <b className="tabular-nums">{eur(num(amounts[o.id]))}</b>
                </div>
                <div className="text-base [text-wrap:pretty]">“{(whys[o.id] ?? "").trim()}”</div>
                {(exits[o.id] ?? "").trim() && <div className="text-sm text-neutral-700">Vendería si: {exits[o.id].trim()}</div>}
              </div>
            ))}
            <div className="card card-snug gap-1.5">
              <div className="card-kicker">Tu idea general</div>
              <div className="text-base [text-wrap:pretty]">“{argument.trim()}”</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-secondary" onClick={() => go(1)}>Cambiar importes</button>
            <button type="button" className="btn-secondary" onClick={() => go(2)}>Cambiar mis explicaciones</button>
          </div>
          <p className="m-0 text-base [text-wrap:pretty]">
            Repartido <b>{eur(total)}</b> de <b>{eur(allocation)}</b>.{" "}
            {remaining > 0.01 ? `Los ${eur(remaining)} que no repartas se quedan como efectivo.` : "Has repartido todo tu importe."}
          </p>
          <p className="m-0 text-base [text-wrap:pretty]">
            Cuando la envíes <b>no podrás cambiarla</b>. Se anotará en tu cartera y en tu diario con el precio de ese momento.
          </p>
        </div>
      )}

      {state?.error && (
        <p ref={errorRef} tabIndex={-1} role="alert" className="m-0 text-base font-medium p-3 border border-divider rounded-[10px]" style={{ background: "var(--color-amber-100)", color: "var(--color-amber-700)" }}>
          {state.error} <span className="font-normal">Tus respuestas siguen aquí: puedes volver a intentarlo.</span>
        </p>
      )}
      {state?.ok && <p role="status" className="m-0 text-base text-accent-700">{state.ok}</p>}

      <div className="sticky bottom-3 z-10 card card-snug gap-2" style={{ boxShadow: "var(--shadow-md)" }}>
        {step === 1 && (
          <>
            <div aria-live="polite" className="text-sm flex flex-wrap items-center gap-x-2 gap-y-1">
              <span>Repartido <b className="tabular-nums">{eur(total)}</b> de <b className="tabular-nums">{eur(allocation)}</b></span>
              {over ? (
                <span className="tag tag-gold">Te pasas {eur(-remaining)}</span>
              ) : remaining > 0.01 ? (
                <span>· Faltan <b className="tabular-nums">{eur(remaining)}</b></span>
              ) : picked.length > 0 ? (
                <span className="tag tag-accent">Todo repartido</span>
              ) : null}
            </div>
            <div className="bar" role="progressbar" aria-label="Importe repartido" aria-valuemin={0} aria-valuemax={allocation} aria-valuenow={Math.min(Math.max(total, 0), allocation)} aria-valuetext={`${eur(total)} de ${eur(allocation)}`}>
              <span style={{ width: `${allocation > 0 ? Math.min(100, Math.max(0, (total / allocation) * 100)) : 0}%` }} />
            </div>
          </>
        )}
        <div className="flex flex-wrap items-center gap-3">
          {step > 1 && (
            <button type="button" className="btn-secondary" onClick={() => go((step - 1) as Step)}>Atrás</button>
          )}
          {step === 1 && (
            <button type="button" className="btn-primary" disabled={!!step1Problem} onClick={() => go(2)}>Siguiente: explica tus elecciones</button>
          )}
          {step === 2 && (
            <button type="button" className="btn-primary" disabled={!!step2Problem} onClick={() => go(3)}>Siguiente: revisar</button>
          )}
          {step === 3 && (
            <button type="submit" className="btn-primary" disabled={pending || !!step1Problem || !!step2Problem}>{pending ? "Registrando tu cartera…" : "Enviar mi cartera"}</button>
          )}
          {step === 1 && step1Problem && <span className="text-sm text-neutral-700">{step1Problem}</span>}
          {step === 2 && step2Problem && <span className="text-sm text-neutral-700">{step2Problem}</span>}
        </div>
      </div>
    </form>
  );
}
