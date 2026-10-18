/**
 * Familia de ejemplo para enseñar el asistente de puesta en marcha (SOLO base de datos local).
 * Crea «Familia Ruiz» recién fundada: Laura (presidenta, sin nada hecho todavía), lista para recorrer
 * /empezar paso a paso. Los hijos (Irene, 19, y Pablo, 16) los invita Laura durante el recorrido.
 * Uso: npx tsx --env-file=.env scripts/seed-onboarding-demo.ts   (contraseña: la de DEMO_PASSWORD o «Demo-Ruiz-2026-x»)
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const PASSWORD = process.env.DEMO_PASSWORD ?? "Demo-Ruiz-2026-x";
const NAME = "Familia Ruiz";

async function main() {
  if (process.env.NODE_ENV === "production" || /cloudsql|34\.175/.test(process.env.DATABASE_URL ?? "")) throw new Error("Solo para la base de datos local");

  // Se puede repetir: borra la familia de ejemplo anterior con todo lo suyo
  const old = await prisma.family.findFirst({ where: { name: NAME } });
  if (old) {
    await prisma.monthlyPortfolio.deleteMany({ where: { familyId: old.id } });
    await prisma.communication.deleteMany({ where: { familyId: old.id } });
    await prisma.invitation.deleteMany({ where: { familyId: old.id } });
    await prisma.user.deleteMany({ where: { familyId: old.id } });
    await prisma.family.delete({ where: { id: old.id } });
  }
  await prisma.user.deleteMany({ where: { email: { in: ["laura@ruiz.demo", "irene@ruiz.demo", "pablo@ruiz.demo"] } } });

  const family = await prisma.family.create({ data: { name: NAME, inviteCode: "RUIZ2026" } });
  await prisma.user.create({
    data: { familyId: family.id, name: "Laura Ruiz", email: "laura@ruiz.demo", passwordHash: await bcrypt.hash(PASSWORD, 10), role: "ADMIN", status: "ACTIVE", welcomedAt: new Date() },
  });
  console.log(`«${NAME}» lista. Entra con laura@ruiz.demo y ve a /empezar.`);
}

main().finally(() => prisma.$disconnect());
