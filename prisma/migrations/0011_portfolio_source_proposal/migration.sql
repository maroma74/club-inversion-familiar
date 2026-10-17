-- La cartera del mes recuerda la propuesta del repositorio de la que se creó (para marcarla como usada)
ALTER TABLE "MonthlyPortfolio" ADD COLUMN "sourceProposalId" TEXT;
CREATE INDEX "MonthlyPortfolio_sourceProposalId_idx" ON "MonthlyPortfolio"("sourceProposalId");
ALTER TABLE "MonthlyPortfolio" ADD CONSTRAINT "MonthlyPortfolio_sourceProposalId_fkey" FOREIGN KEY ("sourceProposalId") REFERENCES "Proposal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
