"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { removeAvatarAction, uploadAvatarAction } from "@/app/actions/profile";
import { Avatar } from "@/components/Avatar";

const OUT = 256; // lado de la imagen que se sube
const PREVIEW = 176;

/** Dibuja en `ctx` el cuadrado de la imagen que queda tras aplicar zoom y desplazamiento (0..1). */
function drawCrop(ctx: CanvasRenderingContext2D, img: ImageBitmap, size: number, zoom: number, ox: number, oy: number) {
  const side = Math.min(img.width, img.height) / zoom;
  const sx = (img.width - side) * ox;
  const sy = (img.height - side) * oy;
  ctx.clearRect(0, 0, size, size);
  ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}

export function AvatarForm({ id, name, updatedAt }: { id: string; name: string; updatedAt: string | null }) {
  const [state, action, pending] = useActionState(uploadAvatarAction, undefined);
  const [img, setImg] = useState<ImageBitmap | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [ox, setOx] = useState(0.5);
  const [oy, setOy] = useState(0.5);
  const preview = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = preview.current;
    if (!c || !img) return;
    const ctx = c.getContext("2d");
    if (ctx) drawCrop(ctx, img, PREVIEW, zoom, ox, oy);
  }, [img, zoom, ox, oy]);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setError(null);
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return setError("Usa una foto JPG, PNG o WebP.");
    if (file.size > 12 * 1024 * 1024) return setError("La foto pesa demasiado (máximo 12 MB).");
    try {
      // imageOrientation: respeta la rotación que guarda el móvil en la foto
      setImg(await createImageBitmap(file, { imageOrientation: "from-image" }));
      setZoom(1);
      setOx(0.5);
      setOy(0.5);
    } catch {
      setError("No se ha podido leer esa foto. Prueba con otra.");
    }
  }

  async function render(): Promise<Blob | null> {
    if (!img) return null;
    const canvas = document.createElement("canvas");
    canvas.width = OUT;
    canvas.height = OUT;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    drawCrop(ctx, img, OUT, zoom, ox, oy);
    // WebP si el navegador lo sabe; si devuelve otro formato, JPEG (pesa mucho menos que PNG)
    const webp = await toBlob(canvas, "image/webp", 0.86);
    if (webp && webp.type === "image/webp") return webp;
    return toBlob(canvas, "image/jpeg", 0.88);
  }

  return (
    <div className="flex flex-col sm:flex-row gap-6 items-start">
      <div className="flex flex-col items-center gap-2">
        {img ? (
          <canvas ref={preview} width={PREVIEW} height={PREVIEW} className="rounded-full border border-divider" style={{ width: PREVIEW, height: PREVIEW }} aria-label="Vista previa de tu foto" />
        ) : (
          <Avatar id={id} name={name} updatedAt={updatedAt} size={PREVIEW} />
        )}
        <span className="text-xs text-neutral-700">{img ? "Así se verá" : updatedAt ? "Tu foto actual" : "Todavía no tienes foto"}</span>
      </div>

      <div className="flex-1 min-w-0 w-full">
        <form
          action={async (fd) => {
            const blob = await render();
            if (!blob) return setError("Elige primero una foto.");
            fd.set("photo", blob, blob.type === "image/webp" ? "foto.webp" : "foto.jpg");
            action(fd);
          }}
          className="space-y-3"
        >
          <div>
            <label className="label" htmlFor="foto">Elige una foto</label>
            <input id="foto" type="file" accept="image/jpeg,image/png,image/webp" onChange={onPick} className="input" />
            <p className="text-xs text-neutral-700 mt-1">Se recorta en cuadrado y se reduce en tu dispositivo antes de subirla. Solo la ven los miembros de tu familia.</p>
          </div>

          {img && (
            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <label className="label" htmlFor="zoom">Acercar</label>
                <input id="zoom" type="range" min={1} max={3} step={0.05} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="w-full" />
              </div>
              <div>
                <label className="label" htmlFor="ox">Mover a los lados</label>
                <input id="ox" type="range" min={0} max={1} step={0.01} value={ox} onChange={(e) => setOx(Number(e.target.value))} className="w-full" disabled={img.width === img.height && zoom === 1} />
              </div>
              <div>
                <label className="label" htmlFor="oy">Mover arriba y abajo</label>
                <input id="oy" type="range" min={0} max={1} step={0.01} value={oy} onChange={(e) => setOy(Number(e.target.value))} className="w-full" disabled={img.width === img.height && zoom === 1} />
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button className="btn-primary" disabled={pending || !img}>{pending ? "Guardando…" : "Guardar foto"}</button>
            {error && <p className="text-xs text-red-600 m-0">{error}</p>}
            {!error && state?.error && <p className="text-xs text-red-600 m-0">{state.error}</p>}
            {!error && state?.ok && !pending && <p className="text-xs text-green-600 m-0">{state.ok}</p>}
          </div>
        </form>

        {updatedAt && (
          <form action={removeAvatarAction} className="mt-4">
            <button className="btn-ghost text-xs">Quitar mi foto</button>
          </form>
        )}
      </div>
    </div>
  );
}
