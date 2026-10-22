"use client";

import { useActionState, useState } from "react";
import { checkAiAction, saveCoachPromptAction, setAiModelAction, setInvitePackAction } from "@/app/actions/siteAdmin";
import { AI_MODELS } from "@/lib/aiModels";

/** Paquete de invitaciones, sin límite y administración de la web para un usuario. */
export function PackForm({ userId, pack, unlimited, siteAdmin, isMe }: { userId: string; pack: number; unlimited: boolean; siteAdmin: boolean; isMe: boolean }) {
  const [state, action, pending] = useActionState(setInvitePackAction, undefined);
  return (
    <form action={action} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
      <input type="hidden" name="userId" value={userId} />
      <label className="inline-flex items-center gap-1">
        <span className="text-neutral-700">Paquete</span>
        <input name="pack" type="number" min={0} max={1000} defaultValue={pack} className="input py-0.5 text-xs w-16" aria-label="Invitaciones del paquete" />
      </label>
      <label className="inline-flex items-center gap-1 cursor-pointer"><input type="checkbox" name="unlimited" defaultChecked={unlimited} /> Sin límite</label>
      <label className={`inline-flex items-center gap-1 ${isMe ? "opacity-60" : "cursor-pointer"}`} title={isMe ? "No puedes quitarte la administración a ti mismo" : undefined}>
        <input type="checkbox" name="siteAdmin" defaultChecked={siteAdmin} disabled={isMe} />{isMe && <input type="hidden" name="siteAdmin" value="on" />} Administra la web
      </label>
      <button className="btn-secondary py-0.5 text-xs" disabled={pending}>{pending ? "Guardando…" : "Guardar"}</button>
      {state?.error && <span role="alert" className="text-neutral-800">{state.error}</span>}
      {state?.ok && <span role="status" className="text-accent-700">{state.ok}</span>}
    </form>
  );
}

/** Botón para probar la conexión con Claude. */
export function AiCheckForm() {
  const [state, action, pending] = useActionState(checkAiAction, undefined);
  return (
    <form action={action} className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <button className="btn-secondary py-1 text-xs" disabled={pending}>{pending ? "Probando…" : "Probar la conexión"}</button>
      {state?.error && <span role="alert" className="text-sm text-neutral-800">{state.error}</span>}
      {state?.ok && <span role="status" className="text-sm text-accent-700">{state.ok}</span>}
    </form>
  );
}

/** Elección del modelo de Claude: una opción por modelo con para qué sirve y su precio. */
export function AiModelForm({ current }: { current: string }) {
  const [state, action, pending] = useActionState(setAiModelAction, undefined);
  return (
    <form action={action} className="flex flex-col gap-2">
      <fieldset className="m-0 p-0 border-0 grid gap-2 sm:grid-cols-2">
        <legend className="mb-1 text-sm font-medium">Modelo de Claude para los análisis</legend>
        {AI_MODELS.map((m) => (
          <label key={m.id} className="flex items-start gap-2 rounded-lg border border-neutral-300 p-3 cursor-pointer has-[:checked]:border-accent-600 has-[:checked]:bg-accent-100">
            <input type="radio" name="model" value={m.id} defaultChecked={m.id === current} className="mt-1" />
            <span className="flex flex-col gap-0.5 min-w-0">
              <span className="font-medium">{m.name}</span>
              <span className="text-sm text-neutral-700 [text-wrap:pretty]">{m.summary}</span>
              <span className="text-xs text-neutral-700">{m.price} por millón de tokens (entrada / salida)</span>
            </span>
          </label>
        ))}
      </fieldset>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <button className="btn-secondary py-1 text-xs" disabled={pending}>{pending ? "Guardando…" : "Guardar modelo"}</button>
        {state?.error && <span role="alert" className="text-sm text-neutral-800">{state.error}</span>}
        {state?.ok && <span role="status" className="text-sm text-accent-700">{state.ok}</span>}
      </div>
    </form>
  );
}

/** Caja para editar el prompt de TutorIA, con guardar y volver al de por defecto. */
export function CoachPromptForm({ text, custom, max }: { text: string; custom: boolean; max: number }) {
  const [state, action, pending] = useActionState(saveCoachPromptAction, undefined);
  // Controlado: si guardar falla, lo escrito sigue en la caja. Cuando cambia lo guardado (guardar o restaurar), se recarga.
  const [value, setValue] = useState(text);
  const [saved, setSaved] = useState(text);
  if (text !== saved) {
    setSaved(text);
    setValue(text);
  }
  const dirty = value.replace(/\r\n/g, "\n").trim() !== text.trim();
  return (
    <form action={action} className="flex flex-col gap-2">
      <label htmlFor="tutoria-prompt" className="text-sm font-medium">Prompt de TutorIA{custom ? "" : " (el de por defecto)"}</label>
      <textarea
        id="tutoria-prompt"
        name="prompt"
        className="input"
        value={value}
        maxLength={max}
        spellCheck={false}
        rows={18}
        onChange={(e) => setValue(e.target.value)}
        style={{ fontFamily: "var(--font-numeric)", fontSize: 13, lineHeight: 1.55, minHeight: 320 }}
      />
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <button className="btn-primary" name="intent" value="save" disabled={pending}>{pending ? "Guardando…" : "Guardar prompt"}</button>
        {dirty && !pending && <button type="button" className="btn-ghost" onClick={() => setValue(text)}>Descartar cambios</button>}
        {custom && (
          <button
            className="btn-ghost"
            name="intent"
            value="reset"
            disabled={pending}
            onClick={(e) => {
              if (!window.confirm("¿Volver al prompt de por defecto? Se perderá el que tienes guardado.")) e.preventDefault();
            }}
          >
            Volver al de por defecto
          </button>
        )}
        <span className="text-xs text-neutral-700">{dirty ? "Cambios sin guardar · " : ""}{value.length.toLocaleString("es-ES")} de {max.toLocaleString("es-ES")} caracteres</span>
      </div>
      {state?.error && <p role="alert" className="m-0 text-sm text-neutral-800">{state.error}</p>}
      {state?.ok && <p role="status" className="m-0 text-sm text-accent-700">{state.ok}</p>}
    </form>
  );
}
