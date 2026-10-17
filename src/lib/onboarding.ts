/**
 * Primeros pasos: una lista corta y personal de lo que conviene hacer al empezar, marcada con datos reales
 * (no con casillas que el usuario tenga que tachar). El presidente tiene sus pasos de puesta en marcha además
 * de los de cualquier miembro.
 */

export type OnboardingFacts = {
  isAdmin: boolean;
  hasProfile: boolean; // foto o móvil en el perfil
  lessonsPassed: number;
  journalEntries: number;
  decisions: number; // decisiones de cartera del mes enviadas
  trades: number;
  // Solo para el presidente
  otherMembers: number; // miembros activos además de él
  pendingMemberInvites: number;
  contributions: number; // aportaciones registradas en la familia (la paga ya se ha repartido alguna vez)
  publishedPortfolios: number;
  communications: number;
  familyInvites: number; // invitaciones a otras familias creadas por el club
};

export type OnboardingStep = { id: string; title: string; text: string; href: string; cta: string; done: boolean; who: "presidente" | "todos" };

export function onboardingSteps(f: OnboardingFacts): OnboardingStep[] {
  const president: OnboardingStep[] = [
    { id: "invite-family", who: "presidente", title: "Invita a tu familia", text: "Crea una invitación personal para cada hijo o hija y mándasela por WhatsApp o correo. Cada uno entra con su cuenta.", href: "/invitaciones", cta: "Ir a Invitaciones", done: f.otherMembers > 0 },
    { id: "allowance", who: "presidente", title: "Fija la paga y repártela", text: "Decide cuánto invierte cada miembro al mes (10–50 € es lo habitual). Se reparte sola al publicar la cartera del mes o a mano desde Familia.", href: "/familia#paga", cta: "Ir a la paga", done: f.contributions > 0 },
    { id: "portfolio", who: "presidente", title: "Publica tu primera cartera del mes", text: "Elige una propuesta del repositorio o crea la tuya: una lección corta y dos, tres o cuatro opciones. Al publicarla, los miembros pueden decidir.", href: "/cartera/gestion", cta: "Preparar la cartera", done: f.publishedPortfolios > 0 },
    { id: "notify", who: "presidente", title: "Avisa a la familia por WhatsApp", text: "Desde Comunicaciones sale un mensaje personalizado para cada miembro con su importe, el plazo y el enlace directo a la cartera.", href: "/comunicaciones", cta: "Enviar el aviso", done: f.communications > 0 },
    { id: "other-family", who: "presidente", title: "Invita a otra familia", text: "Tienes cinco invitaciones para otras familias. Quien la use funda su propio club y lo preside.", href: "/invitar", cta: "Invitar a una familia", done: f.familyInvites > 0 },
  ];
  const everyone: OnboardingStep[] = [
    { id: "profile", who: "todos", title: "Completa tu perfil", text: "Pon tu foto y tu móvil: el móvil sirve para recibir el aviso de la cartera del mes por WhatsApp.", href: "/perfil", cta: "Ir a mi perfil", done: f.hasProfile },
    { id: "lesson", who: "todos", title: "Haz tu primera lección", text: "Diez minutos y un quiz. La Academia tiene seis niveles, del ahorro al análisis técnico, y cada lección suma puntos.", href: "/academia", cta: "Ir a la Academia", done: f.lessonsPassed > 0 },
    { id: "decide", who: "todos", title: "Decide en la cartera del mes", text: "Lee la lección, mira la ficha de cada opción, reparte tu importe y explica por qué eliges lo que eliges.", href: "/cartera", cta: "Ir a la cartera del mes", done: f.decisions > 0 || f.trades > 0 },
    { id: "why", who: "todos", title: "Escribe tu primer porqué", text: "Cada compra lleva su razón en el diario. Es lo que la familia lee después y lo que de verdad hace mejor inversor.", href: "/inicio", cta: "Escribir en el diario", done: f.journalEntries > 0 },
  ];
  return f.isAdmin ? [...president, ...everyone.filter((s) => s.id !== "decide" || f.publishedPortfolios > 0)] : everyone;
}

export function onboardingProgress(steps: OnboardingStep[]) {
  const done = steps.filter((s) => s.done).length;
  return { done, total: steps.length, complete: done === steps.length, next: steps.find((s) => !s.done) ?? null };
}
