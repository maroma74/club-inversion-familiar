-- Caché genérica de respuestas de proveedores externos (BCE, FRED, Finnhub)
CREATE TABLE "ApiCache" (
    "key" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiCache_pkey" PRIMARY KEY ("key")
);
