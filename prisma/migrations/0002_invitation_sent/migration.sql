-- Registro del envío por correo de una invitación
ALTER TABLE "Invitation" ADD COLUMN "sentAt" TIMESTAMP(3);
ALTER TABLE "Invitation" ADD COLUMN "sentTo" TEXT;
