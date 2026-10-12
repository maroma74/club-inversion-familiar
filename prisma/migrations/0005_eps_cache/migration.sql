-- Caché diaria de BPA trimestral y resumen del PER histórico
CREATE TABLE "EpsCache" (
    "symbol" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "reason" TEXT,
    "quarters" JSONB NOT NULL,
    "summary" JSONB,
    "fetchedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EpsCache_pkey" PRIMARY KEY ("symbol")
);
