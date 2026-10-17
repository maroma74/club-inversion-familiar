"use client";

import { useEffect } from "react";

/**
 * Pantalla de error de la app (cualquier excepción no controlada en una página). No enseña detalles
 * técnicos: el `digest` sirve para localizar el error en los registros de Cloud Run.
 */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Error no controlado en la interfaz", { digest: error.digest, message: error.message });
  }, [error]);

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="card w-full max-w-md gap-3" style={{ padding: 24 }}>
        <div className="card-kicker text-[11px]">Algo ha fallado</div>
        <h1 className="m-0">No hemos podido cargar esta página</h1>
        <p className="m-0 text-neutral-700">Suele ser algo pasajero, por ejemplo que el proveedor de cotizaciones no responda. Tus datos están a salvo.</p>
        <div className="flex flex-wrap gap-2 mt-1">
          <button type="button" className="btn-primary" onClick={reset}>Volver a intentarlo</button>
          <a href="/inicio" className="btn-secondary">Ir al inicio</a>
        </div>
        {error.digest && <p className="m-0 text-xs text-neutral-600">Referencia del error: <code>{error.digest}</code></p>}
      </div>
    </main>
  );
}
