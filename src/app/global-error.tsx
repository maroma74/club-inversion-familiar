"use client";

/** Último recurso: error dentro del propio layout raíz. Debe pintar su propio <html> y <body>. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="es">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0, minHeight: "100vh", display: "grid", placeItems: "center", background: "#f8fafc", color: "#0e2138" }}>
        <main style={{ maxWidth: 440, padding: 24 }}>
          <h1 style={{ fontSize: 24, margin: "0 0 8px" }}>Algo ha fallado</h1>
          <p style={{ margin: "0 0 16px", color: "#475569" }}>No hemos podido cargar el Club de Inversión Familiar. Vuelve a intentarlo en un momento.</p>
          <button type="button" onClick={reset} style={{ padding: "10px 18px", borderRadius: 999, border: 0, background: "#047857", color: "#fff", fontWeight: 700, cursor: "pointer" }}>Volver a intentarlo</button>
          {error.digest && <p style={{ marginTop: 16, fontSize: 12, color: "#64748b" }}>Referencia del error: {error.digest}</p>}
        </main>
      </body>
    </html>
  );
}
