-- CreateTable
CREATE TABLE "ClubRecommendation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "symbol" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "action" TEXT NOT NULL,
    "bias" TEXT NOT NULL,
    "score" REAL NOT NULL,
    "confidence" TEXT NOT NULL,
    "rr" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "ClubRecommendation_symbol_date_idx" ON "ClubRecommendation"("symbol", "date");

-- CreateIndex
CREATE UNIQUE INDEX "ClubRecommendation_symbol_date_key" ON "ClubRecommendation"("symbol", "date");

