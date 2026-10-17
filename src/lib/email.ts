import "server-only";
import { logError } from "./log";

/**
 * Envío de correo con la API HTTP de Resend (https://resend.com), sin SDK.
 * Variables: RESEND_API_KEY (obligatoria para enviar) y EMAIL_FROM (remitente, dominio verificado en Resend).
 * Sin clave, en desarrollo el correo se escribe en la consola del servidor; en producción se devuelve un error claro.
 */

export type EmailMessage = { to: string; subject: string; text: string; html: string };
export type SendResult = { sent: true; id: string | null } | { sent: false; error: string };

const DEFAULT_FROM = "Club de Inversión Familiar <club@clubdeinversionfamiliar.com>";

export function emailConfigured() {
  return Boolean(process.env.RESEND_API_KEY);
}

export async function sendEmail(message: EmailMessage): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`\n[email] Para: ${message.to}\n[email] Asunto: ${message.subject}\n${message.text}\n`);
      return { sent: true, id: null };
    }
    return { sent: false, error: "El envío de correo no está configurado (falta RESEND_API_KEY)" };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.EMAIL_FROM || DEFAULT_FROM, to: [message.to], subject: message.subject, text: message.text, html: message.html }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      const body = await res.text();
      let detail = body.slice(0, 200);
      try {
        const j = JSON.parse(body) as { message?: string };
        if (j.message) detail = j.message;
      } catch {}
      logError("email.send", new Error(detail), { status: res.status });
      return { sent: false, error: `Resend ha rechazado el envío (${res.status}): ${detail}` };
    }
    const data = (await res.json().catch(() => ({}))) as { id?: string };
    return { sent: true, id: data.id ?? null };
  } catch (e) {
    logError("email.send", e);
    return { sent: false, error: `No se pudo contactar con Resend: ${e instanceof Error ? e.message : String(e)}` };
  }
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);

/** Correo de invitación con la marca del club: cabecera navy, botón esmeralda, código y caducidad. */
export function invitationEmail(opts: { to: string; inviteeName: string | null; familyName: string; presidentName: string; code: string; link: string; expiresAt: Date | null; newFamily?: boolean }): EmailMessage {
  const saludo = opts.inviteeName ? `Hola, ${opts.inviteeName}:` : "Hola:";
  const caduca = opts.expiresAt ? `La invitación caduca el ${opts.expiresAt.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}.` : "La invitación no caduca.";
  const subject = opts.newFamily ? "Invitación para crear el Club de Inversión de tu familia" : `Invitación al Club de Inversión Familiar de ${opts.familyName}`;
  const intro = opts.newFamily
    ? `${opts.presidentName}, de ${opts.familyName}, te invita a crear el club de inversión de tu propia familia: una liga familiar para aprender a invertir con una paga mensual, carteras propuestas por el presidente, una academia y un diario de inversión. Tú serás el presidente de tu club, invitarás a tu familia y tendrás cinco invitaciones para otras familias: ${opts.familyName} te ha dado una de las suyas.`
    : `${opts.presidentName} te invita a unirte al club de inversión de ${opts.familyName}: una liga familiar para aprender a invertir con una paga mensual, carteras propuestas por el presidente, una academia y un diario de inversión.`;
  const text = [
    saludo,
    "",
    intro,
    "",
    `Acepta la invitación aquí: ${opts.link}`,
    `Tu código personal: ${opts.code}`,
    caduca,
    "",
    "Si no esperabas este correo, puedes ignorarlo.",
    "",
    "Club de Inversión Familiar · Aprende, invierte y crece en familia.",
  ].join("\n");
  const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;color:#0e2138;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;padding:24px 12px;"><tr><td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
  <tr><td style="background:#0e2138;padding:22px 28px;">
    <div style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#10b981;font-weight:700;">Club de Inversión Familiar</div>
    <div style="font-size:22px;font-weight:800;color:#ffffff;margin-top:6px;">${opts.newFamily ? "Crea el club de tu familia" : `Invitación al club de ${esc(opts.familyName)}`}</div>
  </td></tr>
  <tr><td style="padding:28px;font-size:15px;line-height:1.6;">
    <p style="margin:0 0 14px;">${esc(saludo)}</p>
    <p style="margin:0 0 14px;">${esc(intro)}</p>
    <p style="margin:22px 0;text-align:center;">
      <a href="${esc(opts.link)}" style="display:inline-block;background:#10b981;color:#ffffff;text-decoration:none;font-weight:700;padding:13px 26px;border-radius:10px;font-size:15px;">Aceptar la invitación</a>
    </p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;border:1px dashed #cbd5e1;border-radius:12px;"><tr><td style="padding:14px 18px;text-align:center;">
      <div style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#64748b;">Tu código personal</div>
      <div style="font-family:'JetBrains Mono',Consolas,monospace;font-size:24px;font-weight:700;letter-spacing:.2em;margin-top:4px;">${esc(opts.code)}</div>
    </td></tr></table>
    <p style="margin:18px 0 0;font-size:13px;color:#64748b;">${esc(caduca)} Si el botón no funciona, copia este enlace en el navegador:<br><a href="${esc(opts.link)}" style="color:#0e2138;word-break:break-all;">${esc(opts.link)}</a></p>
  </td></tr>
  <tr><td style="padding:16px 28px;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8;">Si no esperabas este correo, puedes ignorarlo. Club de Inversión Familiar · Aprende, invierte y crece en familia.</td></tr>
</table>
</td></tr></table>
</body></html>`;
  return { to: opts.to, subject, text, html };
}

/** Correo con el enlace de un solo uso para fijar una contraseña nueva (lo genera el presidente). */
export function passwordResetEmail(opts: { to: string; name: string; presidentName: string; link: string }): EmailMessage {
  const subject = "Tu enlace para cambiar la contraseña del Club de Inversión Familiar";
  const text = [
    `Hola, ${opts.name}:`,
    "",
    `${opts.presidentName} ha generado un enlace para que elijas una contraseña nueva en el Club de Inversión Familiar.`,
    "",
    `Cámbiala aquí (vale una hora y un solo uso): ${opts.link}`,
    "",
    "Si no lo has pedido, ignora este correo: tu contraseña actual sigue siendo válida.",
  ].join("\n");
  const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;color:#0e2138;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;padding:24px 12px;"><tr><td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
  <tr><td style="background:#0e2138;padding:22px 28px;">
    <div style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#10b981;font-weight:700;">Club de Inversión Familiar</div>
    <div style="font-size:22px;font-weight:800;color:#ffffff;margin-top:6px;">Contraseña nueva</div>
  </td></tr>
  <tr><td style="padding:28px;font-size:15px;line-height:1.6;">
    <p style="margin:0 0 14px;">Hola, ${esc(opts.name)}:</p>
    <p style="margin:0 0 14px;"><strong>${esc(opts.presidentName)}</strong> ha generado un enlace para que elijas una contraseña nueva.</p>
    <p style="margin:22px 0;text-align:center;"><a href="${esc(opts.link)}" style="display:inline-block;background:#10b981;color:#ffffff;text-decoration:none;font-weight:700;padding:13px 26px;border-radius:10px;font-size:15px;">Elegir contraseña nueva</a></p>
    <p style="margin:18px 0 0;font-size:13px;color:#64748b;">El enlace vale una hora y un solo uso. Si el botón no funciona, copia esta dirección en el navegador:<br><a href="${esc(opts.link)}" style="color:#0e2138;word-break:break-all;">${esc(opts.link)}</a></p>
  </td></tr>
  <tr><td style="padding:16px 28px;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8;">Si no lo has pedido, ignora este correo: tu contraseña actual sigue siendo válida.</td></tr>
</table>
</td></tr></table>
</body></html>`;
  return { to: opts.to, subject, text, html };
}
