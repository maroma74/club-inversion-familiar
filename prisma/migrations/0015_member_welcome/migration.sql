-- Bienvenida para miembros nuevos: cuándo la vio o se la saltó
ALTER TABLE "User" ADD COLUMN "welcomedAt" TIMESTAMP(3);

-- Quien ya estaba en el club no es nuevo: no se le enseña la bienvenida
UPDATE "User" SET "welcomedAt" = NOW();
