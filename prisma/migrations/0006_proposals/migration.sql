-- Repositorio de propuestas de cartera
CREATE TABLE "Proposal" (
    "id" TEXT NOT NULL,
    "slug" TEXT,
    "source" TEXT NOT NULL,
    "familyId" TEXT,
    "signed" BOOLEAN NOT NULL DEFAULT false,
    "sourcePortfolioId" TEXT,
    "title" TEXT NOT NULL,
    "theme" TEXT NOT NULL,
    "risk" INTEGER NOT NULL,
    "lesson" TEXT NOT NULL,
    "minChoices" INTEGER NOT NULL DEFAULT 1,
    "maxChoices" INTEGER NOT NULL DEFAULT 1,
    "uses" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Proposal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProposalOption" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'STOCK',
    "note" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ProposalOption_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Proposal_slug_key" ON "Proposal"("slug");
CREATE UNIQUE INDEX "Proposal_sourcePortfolioId_key" ON "Proposal"("sourcePortfolioId");
CREATE INDEX "Proposal_source_theme_idx" ON "Proposal"("source", "theme");
CREATE UNIQUE INDEX "ProposalOption_proposalId_symbol_key" ON "ProposalOption"("proposalId", "symbol");

ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProposalOption" ADD CONSTRAINT "ProposalOption_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
