-- Ajustes de toda la web (p. ej. el modelo de Claude que usan los análisis con IA)
CREATE TABLE "SiteSetting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "SiteSetting_pkey" PRIMARY KEY ("key")
);
