/**
 * Guía para hacer el repaso en familia: cuatro pasos de conversación que separan el resultado del porqué.
 * Se usa en el asistente de puesta en marcha y en la página de repaso de cada cartera.
 */
const STEPS = [
  { title: "Mirad qué opción ha ido mejor", text: "Arriba del repaso están las opciones ordenadas desde la publicación. Es el dato, sin juicio: el mercado manda poco en un mes." },
  { title: "Leed en voz alta el porqué de cada uno", text: "Cada miembro lee lo que escribió al decidir. Sin interrumpir y sin reírse de nadie: el valor está en que lo explicó." },
  { title: "Preguntad si el porqué sigue en pie", text: "¿Lo que pensabas ha pasado? ¿Has aprendido algo que no sabías? Un buen porqué puede perder un mes y seguir siendo bueno." },
  { title: "Elegid el mejor porqué del mes", text: "No el que más ganó, sino el mejor argumentado. Y apuntad qué haríais distinto la próxima vez." },
];

export function FamilyReviewGuide({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex flex-col gap-3">
      <ol className="m-0 p-0 list-none grid gap-3" style={{ gridTemplateColumns: compact ? "1fr" : "repeat(auto-fit, minmax(min(100%, 230px), 1fr))" }}>
        {STEPS.map((s, i) => (
          <li key={s.title} className="flex gap-3">
            <span aria-hidden="true" className="setup-num shrink-0">{i + 1}</span>
            <div className="min-w-0">
              <div className="font-heading font-bold text-[15px] leading-snug">{s.title}</div>
              <p className="m-0 mt-1 text-sm text-neutral-700 [text-wrap:pretty]">{s.text}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="m-0 text-sm text-neutral-700 max-w-[72ch] [text-wrap:pretty]">Un mes es muy poco tiempo para juzgar una inversión. Volved a este repaso dentro de unos meses: veréis qué porqués aguantan y cuáles no. Acertar es suerte; explicar es aprender.</p>
    </div>
  );
}
