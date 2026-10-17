-- Invitaciones para crear una familia nueva (quien la usa es el presidente de su club)
ALTER TABLE "Invitation" ADD COLUMN "newFamily" BOOLEAN NOT NULL DEFAULT false;
