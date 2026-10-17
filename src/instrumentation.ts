import { secretProblem } from "./lib/secretPolicy";

/**
 * Se ejecuta una vez al arrancar el servidor. En producción comprueba el secreto de sesión en ese momento:
 * si falta o es un valor de ejemplo, el proceso falla al iniciar (y Cloud Run no enruta tráfico a esa revisión)
 * en vez de dejar a todo el mundo «sin sesión» hasta el primer intento de entrar.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.NODE_ENV !== "production") return;
  const problem = secretProblem(process.env.AUTH_SECRET);
  if (problem) throw new Error(problem);
}
