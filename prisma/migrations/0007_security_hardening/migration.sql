-- Versión de sesión: al cambiar o restablecer la contraseña se invalidan las sesiones anteriores
ALTER TABLE "User" ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0;

-- Enlaces de restablecimiento de contraseña (solo el hash del token)
CREATE TABLE "PasswordReset" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordReset_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PasswordReset_tokenHash_key" ON "PasswordReset"("tokenHash");
CREATE INDEX "PasswordReset_userId_createdAt_idx" ON "PasswordReset"("userId", "createdAt");

ALTER TABLE "PasswordReset" ADD CONSTRAINT "PasswordReset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PasswordReset" ADD CONSTRAINT "PasswordReset_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Índices para las consultas más frecuentes (liga, cartera de cada miembro, elecciones de la cartera del mes)
CREATE INDEX "User_familyId_status_idx" ON "User"("familyId", "status");
CREATE INDEX "Contribution_userId_date_idx" ON "Contribution"("userId", "date");
CREATE INDEX "MonthlyChoice_tradeId_idx" ON "MonthlyChoice"("tradeId");
CREATE INDEX "MonthlyChoice_journalEntryId_idx" ON "MonthlyChoice"("journalEntryId");
