import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Landing } from "@/components/landing/Landing";

export const metadata: Metadata = {
  title: "Club de Inversión Familiar · La paga que enseña a invertir",
  description: "Un club de inversión para tu familia: cada mes, una lección, una decisión y un porqué. Tú presides; tus hijos deciden con su paga. Solo por invitación: cada familia puede invitar a cinco.",
  openGraph: { title: "La paga que enseña a invertir", description: "Convierte la paga en un club de inversión familiar: lección del mes, decisión con porqué, liga y academia.", type: "website", locale: "es_ES" },
};

/** Portada: quien ya tiene sesión va a su club; el resto ve la presentación con la caja de entrada. */
export default async function Home() {
  const user = await getCurrentUser();
  if (user) redirect("/inicio");
  return <Landing />;
}
