"use client";

import { useActionState, useState } from "react";
import { chooseProposalAction, inviteChildAction, prepareNoticesAction, publishSetupAction, saveClubAction } from "@/app/actions/setup";

type State = { error?: string; ok?: string } | undefined;

function Msg({ state }: { state: State }) {
  if (!state) return null;
  if (state.error) return <p role="alert" className="m-0 text-sm" style={{ color: "var(--color-amber-700)" }}>{state.error}</p>;
  if (state.ok) return <p role="status" className="m-0 text-sm text-accent-700">{state.ok}</p>;
  return null;
}

const eur = (n: number) => n.toLocaleString("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: n % 1 ? 2 : 0 });

/** Paso 1: nombre del club y paga mensual, con importes sugeridos. */
export function ClubForm({ name, amount, people, confirmed }: { name: string; amount: number; people: number; confirmed: boolean }) {
  const [state, action, pending] = useActionState(saveClubAction, undefined);
  // Sin confirmar, la paga por defecto (100 €) es alta para empezar: se propone 20 €
  const [value, setValue] = useState(confirmed ? String(amount) : "20");
  const n = Number(value.replace(",", "."));
  return (
    <form action={action} className="flex flex-col gap-5">
      <div className="field max-w-[420px]">
        <label htmlFor="club-name">Nombre de la familia</label>
        <input id="club-name" name="name" defaultValue={name} required minLength={2} maxLength={60} className="input" autoComplete="off" />
      </div>
      <fieldset className="m-0 p-0 border-0 flex flex-col gap-2">
        <legend className="label">Paga mensual por persona</legend>
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Importes sugeridos">
          {[10, 20, 30, 50].map((v) => (
            <button key={v} type="button" className={`setup-chip ${Number(value) === v ? "is-on" : ""}`} aria-pressed={Number(value) === v} onClick={() => setValue(String(v))}>{v} €</button>
          ))}
          <span className="inline-flex items-center gap-2">
            <label htmlFor="club-amount" className="sr-only">Otro importe en euros</label>
            <input id="club-amount" name="amount" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} className="input tabular-nums" style={{ width: 110 }} required />
            <span className="text-sm text-neutral-700">€ al mes</span>
          </span>
        </div>
        <p className="m-0 text-sm text-neutral-700">{Number.isFinite(n) && n > 0 ? <>Con {people} {people === 1 ? "persona" : "personas"} en el club, son <b className="tabular-nums text-ink">{eur(n * people)}</b> al mes en total. Tú también recibes paga y decides: es la mejor forma de dar ejemplo.</> : "Escribe un importe en euros."}</p>
      </fieldset>
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn-primary" disabled={pending}>{pending ? "Guardando…" : confirmed ? "Guardar cambios" : "Guardar y seguir"}</button>
        <Msg state={state} />
      </div>
    </form>
  );
}

/** Paso 2: invitar a un hijo o hija con nombre y móvil (y email si se quiere). */
export function InviteChildForm() {
  const [state, action, pending] = useActionState(inviteChildAction, undefined);
  return (
    <form action={action} className="grid gap-3 items-end" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 190px), 1fr))" }}>
      <div className="field">
        <label htmlFor="inv-name">Nombre</label>
        <input id="inv-name" name="name" required minLength={2} maxLength={80} className="input" placeholder="Lucía" autoComplete="off" />
      </div>
      <div className="field">
        <label htmlFor="inv-phone">Móvil <span className="text-neutral-600">(recomendado)</span></label>
        <input id="inv-phone" name="phone" type="tel" maxLength={30} className="input" placeholder="+34 612 345 678" autoComplete="off" />
      </div>
      <div className="field">
        <label htmlFor="inv-email">Email <span className="text-neutral-600">(opcional)</span></label>
        <input id="inv-email" name="email" type="email" className="input" placeholder="lucia@ejemplo.com" autoComplete="off" />
      </div>
      <div className="flex flex-col gap-1.5" style={{ gridColumn: "1 / -1" }}>
        <div><button className="btn-primary" disabled={pending}>{pending ? "Creando…" : "Crear su invitación"}</button></div>
        <Msg state={state} />
      </div>
    </form>
  );
}

/** Paso 3: usar una propuesta del repositorio para la cartera del mes. */
export function ChooseProposalButton({ proposalId, month, primary }: { proposalId: string; month: string; primary: boolean }) {
  const [state, action, pending] = useActionState(chooseProposalAction, undefined);
  return (
    <form action={action} className="flex flex-col gap-1.5">
      <input type="hidden" name="proposalId" value={proposalId} />
      <input type="hidden" name="month" value={month} />
      <button className={primary ? "btn-primary" : "btn-secondary"} disabled={pending}>{pending ? "Preparando…" : "Usar esta propuesta"}</button>
      <Msg state={state} />
    </form>
  );
}

const addDays = (ymd: string, n: number) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};

/** Paso 4: plazo (con atajos) y publicación, que reparte la paga. */
export function PublishSetupForm({ portfolioId, today }: { portfolioId: string; today: string }) {
  const [state, action, pending] = useActionState(publishSetupAction, undefined);
  const [date, setDate] = useState(addDays(today, 7));
  return (
    <form action={action} className="flex flex-col gap-4" onSubmit={(e) => { if (!confirm("Al publicar, cada miembro recibe su paga y puede empezar a decidir. ¿Publicamos?")) e.preventDefault(); }}>
      <input type="hidden" name="id" value={portfolioId} />
      <div className="flex flex-wrap items-end gap-2">
        <div className="field">
          <label htmlFor="setup-deadline">Pueden decidir hasta el</label>
          <input id="setup-deadline" name="deadline" type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} className="input" style={{ width: "auto" }} required />
        </div>
        <button type="button" className={`setup-chip ${date === addDays(today, 7) ? "is-on" : ""}`} aria-pressed={date === addDays(today, 7)} onClick={() => setDate(addDays(today, 7))}>Una semana</button>
        <button type="button" className={`setup-chip ${date === addDays(today, 14) ? "is-on" : ""}`} aria-pressed={date === addDays(today, 14)} onClick={() => setDate(addDays(today, 14))}>Dos semanas</button>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn-primary" disabled={pending}>{pending ? "Publicando…" : "Publicar y repartir la paga"}</button>
        <Msg state={state} />
      </div>
    </form>
  );
}

/** Paso 5: preparar los mensajes personalizados de WhatsApp para cada miembro. */
export function PrepareNoticesButton({ portfolioId }: { portfolioId: string }) {
  const [state, action, pending] = useActionState(prepareNoticesAction, undefined);
  return (
    <form action={action} className="flex flex-wrap items-center gap-3">
      <input type="hidden" name="portfolioId" value={portfolioId} />
      <button className="btn-primary" disabled={pending}>{pending ? "Preparando…" : "Preparar los mensajes"}</button>
      <Msg state={state?.error ? state : undefined} />
    </form>
  );
}
