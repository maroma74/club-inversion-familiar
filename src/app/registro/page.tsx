import { checkJoinCode } from "@/lib/auth";
import { RegisterForm } from "./RegisterForm";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ codigo?: string }> }) {
  const { codigo } = await searchParams;
  const code = codigo?.trim().toUpperCase() ?? "";
  const check = code ? await checkJoinCode(code) : null;
  return (
    <RegisterForm
      initialCode={code}
      preview={
        check
          ? check.kind === "invalid"
            ? { error: check.reason }
            : check.kind === "invitation"
              ? { familyName: check.familyName, name: check.name, email: check.email, role: check.role, personal: true }
              : { familyName: check.familyName, name: null, email: null, role: "MEMBER", personal: false, approval: check.joinMode === "CODE_APPROVAL" }
          : null
      }
    />
  );
}
