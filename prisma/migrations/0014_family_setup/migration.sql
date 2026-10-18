-- Asistente de puesta en marcha del club: paga confirmada y asistente descartado
ALTER TABLE "Family" ADD COLUMN "allowanceSetAt" TIMESTAMP(3);
ALTER TABLE "Family" ADD COLUMN "setupDismissedAt" TIMESTAMP(3);

-- Las familias que ya han repartido alguna paga la tienen confirmada de hecho
UPDATE "Family" f SET "allowanceSetAt" = NOW()
WHERE EXISTS (SELECT 1 FROM "Contribution" c JOIN "User" u ON u."id" = c."userId" WHERE u."familyId" = f."id");
