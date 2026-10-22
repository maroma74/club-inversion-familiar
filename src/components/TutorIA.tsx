/** El búho de TutorIA, el tutor con IA de la cartera del mes. Decorativo: el nombre siempre va escrito al lado. */
export function TutorIAIcon({ size = 32, className = "" }: { size?: number; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element -- imagen fija y pequeña de /public, sin necesidad de optimizarla
  return <img src={size > 48 ? "/tutoria.webp" : "/tutoria-96.webp"} width={size} height={size} alt="" aria-hidden="true" className={`shrink-0 select-none ${className}`} draggable={false} />;
}
