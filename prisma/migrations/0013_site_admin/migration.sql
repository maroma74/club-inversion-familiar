-- Administración de la web: administradores del sitio, paquetes de invitaciones para familias y registro de accesos
ALTER TABLE "User" ADD COLUMN "siteAdmin" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "familyInvitePack" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "unlimitedFamilyInvites" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "lastLoginAt" TIMESTAMP(3);

ALTER TABLE "Invitation" ADD COLUMN "fromPack" BOOLEAN NOT NULL DEFAULT false;
-- Invitaciones por WhatsApp: móvil del invitado y cuándo se compartió
ALTER TABLE "Invitation" ADD COLUMN "phone" TEXT;
ALTER TABLE "Invitation" ADD COLUMN "sharedAt" TIMESTAMP(3);

CREATE TABLE "LoginEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" TEXT,

    CONSTRAINT "LoginEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LoginEvent_at_idx" ON "LoginEvent"("at");
CREATE INDEX "LoginEvent_userId_at_idx" ON "LoginEvent"("userId", "at");

ALTER TABLE "LoginEvent" ADD CONSTRAINT "LoginEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- El propietario de la web administra el sitio y no tiene límite de invitaciones para familias
UPDATE "User" SET "siteAdmin" = true, "unlimitedFamilyInvites" = true WHERE lower("email") = 'miguel.rodero@gmail.com';
