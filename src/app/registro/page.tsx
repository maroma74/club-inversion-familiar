import { checkJoinCode } from "@/lib/auth";
import { RegisterForm } from "./RegisterForm";
import { familySignupAllowed } from "@/app/actions/auth";

/** l***@dominio.com: suficiente para que el invitado sepa con qué email registrarse sin exponerlo a terceros. */
function maskEmail(email: string) {
  const [u, d] = email.split("@");
  return `${u.slice(0, 1)}***@${d ?? ""}`;
}

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ codigo?: string }> }) {
  const { codigo } = await searchParams;
  const code = codigo?.trim().toUpperCase() ?? "";
  const check = code ? await checkJoinCode(code) : null;
  const allowCreate = await familySignupAllowed();
  return (
    <RegisterForm
      initialCode={code}
      allowCreate={allowCreate}
      preview={
        check
          ? check.kind === "invalid"
            ? { error: "Código de invitación no válido, usado o caducado. Pide uno nuevo al presidente del club." }
            : check.kind === "invitation"
              ? { familyName: check.familyName, name: check.name ? check.name.split(" ")[0] : null, email: check.email ? maskEmail(check.email) : null, role: check.role, personal: true }
              : { familyName: check.familyName, name: null, email: null, role: "MEMBER", personal: false, approval: check.joinMode === "CODE_APPROVAL" }
          : null
      }
    />
  );
}
