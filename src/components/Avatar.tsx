import { firstName } from "@/lib/names";

/**
 * Foto de perfil redonda; sin foto, la inicial del nombre sobre el verde de la marca.
 * `updatedAt` (fecha de subida) va en la URL para que el navegador renueve la imagen al cambiarla.
 */
export function Avatar({ id, name, updatedAt, size = 36, className = "" }: { id: string; name: string; updatedAt?: Date | string | null; size?: number; className?: string }) {
  const style = { width: size, height: size };
  if (updatedAt) {
    const v = new Date(updatedAt).getTime();
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={`/api/avatar/${id}?v=${v}`} alt="" width={size} height={size} className={`avatar ${className}`} style={style} loading="lazy" />;
  }
  const initial = (firstName(name)[0] ?? "?").toUpperCase();
  return (
    <span aria-hidden="true" className={`avatar avatar-initial ${className}`} style={{ ...style, fontSize: Math.round(size * 0.44) }}>
      {initial}
    </span>
  );
}
