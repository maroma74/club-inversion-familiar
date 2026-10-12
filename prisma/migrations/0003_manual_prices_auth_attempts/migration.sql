-- Precios manuales por familia (antes eran globales en PriceQuote) e intentos de autenticación
CREATE TABLE "ManualPrice" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ManualPrice_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ManualPrice_familyId_symbol_key" ON "ManualPrice"("familyId", "symbol");
ALTER TABLE "ManualPrice" ADD CONSTRAINT "ManualPrice_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "AuthAttempt" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuthAttempt_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AuthAttempt_key_at_idx" ON "AuthAttempt"("key", "at");
