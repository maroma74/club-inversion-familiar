/**
 * Asistente de puesta en marcha del club: los siete pasos que llevan a un presidente nuevo desde «acabo de crear
 * el club» hasta «hemos hecho nuestro primer repaso». Cada paso se marca con datos reales, nunca con casillas.
 * Lógica pura (sin base de datos) para poder probarla.
 */

export type SetupPortfolio = {
  status: "DRAFT" | "PUBLISHED" | "CLOSED";
  deciders: number; // miembros con importe asignado (o que lo tendrán al publicar)
  decided: number;
  deadlinePassed: boolean;
  notified: boolean; // hay al menos un aviso preparado para esta cartera
};

export type SetupFacts = {
  allowanceConfirmed: boolean;
  members: number; // miembros activos además del presidente
  pendingInvites: number; // invitaciones de miembro pendientes
  portfolio: SetupPortfolio | null; // la cartera en la que se centra el asistente
  hasClosed: boolean; // la familia ya ha cerrado alguna cartera (= ha podido hacer un repaso)
};

export type SetupStepId = "club" | "hijos" | "cartera" | "publicar" | "avisar" | "deciden" | "repaso";

export type SetupStep = { id: SetupStepId; n: number; title: string; short: string; done: boolean };

export const SETUP_STEPS: { id: SetupStepId; title: string; short: string }[] = [
  { id: "club", title: "El club y la paga", short: "Paga" },
  { id: "hijos", title: "Invita a tus hijos", short: "Hijos" },
  { id: "cartera", title: "Elige la cartera del mes", short: "Cartera" },
  { id: "publicar", title: "Pon el plazo y publica", short: "Publicar" },
  { id: "avisar", title: "Avisa a tus hijos", short: "Avisar" },
  { id: "deciden", title: "Mientras deciden", short: "Deciden" },
  { id: "repaso", title: "El repaso en familia", short: "Repaso" },
];

export function setupSteps(f: SetupFacts): SetupStep[] {
  const p = f.portfolio;
  const live = !!p && p.status !== "DRAFT";
  const done: Record<SetupStepId, boolean> = {
    club: f.allowanceConfirmed,
    hijos: f.members > 0,
    cartera: !!p,
    publicar: live,
    avisar: live && (p!.notified || p!.status === "CLOSED"),
    deciden: live && (p!.status === "CLOSED" || p!.deadlinePassed || (p!.deciders > 0 && p!.decided >= p!.deciders)),
    repaso: f.hasClosed,
  };
  return SETUP_STEPS.map((s, i) => ({ ...s, n: i + 1, done: done[s.id] }));
}

export function setupProgress(steps: SetupStep[]) {
  const done = steps.filter((s) => s.done).length;
  const current = steps.find((s) => !s.done) ?? null;
  // Hecho el repaso, el club está en marcha aunque falte algún detalle anterior (p. ej. la paga sin «confirmar»)
  const complete = steps[steps.length - 1].done;
  return { done, total: steps.length, current, complete };
}

/** Paso que se abre: el pedido en la URL si existe; si no, el primero pendiente; si todo está hecho, el último. */
export function pickStep(steps: SetupStep[], requested: string | undefined): SetupStep {
  const asked = steps.find((s) => s.id === requested || String(s.n) === requested);
  return asked ?? steps.find((s) => !s.done) ?? steps[steps.length - 1];
}
