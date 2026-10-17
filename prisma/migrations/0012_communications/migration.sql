-- Teléfono de cada usuario (WhatsApp) y comunicaciones enviadas por el presidente
ALTER TABLE "User" ADD COLUMN "phone" TEXT;

CREATE TABLE "Communication" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'WHATSAPP',
    "kind" TEXT NOT NULL DEFAULT 'PORTFOLIO',
    "portfolioId" TEXT,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "recipients" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Communication_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Communication_familyId_createdAt_idx" ON "Communication"("familyId", "createdAt");

ALTER TABLE "Communication" ADD CONSTRAINT "Communication_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Communication" ADD CONSTRAINT "Communication_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
