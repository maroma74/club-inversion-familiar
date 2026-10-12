-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_MonthlyAllocation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "portfolioId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "contributionId" TEXT,
    CONSTRAINT "MonthlyAllocation_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "MonthlyPortfolio" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MonthlyAllocation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_MonthlyAllocation" ("amount", "contributionId", "id", "portfolioId", "userId") SELECT "amount", "contributionId", "id", "portfolioId", "userId" FROM "MonthlyAllocation";
DROP TABLE "MonthlyAllocation";
ALTER TABLE "new_MonthlyAllocation" RENAME TO "MonthlyAllocation";
CREATE UNIQUE INDEX "MonthlyAllocation_contributionId_key" ON "MonthlyAllocation"("contributionId");
CREATE UNIQUE INDEX "MonthlyAllocation_portfolioId_userId_key" ON "MonthlyAllocation"("portfolioId", "userId");
CREATE TABLE "new_MonthlyDecision" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "portfolioId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "argument" TEXT NOT NULL,
    "submittedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MonthlyDecision_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "MonthlyPortfolio" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MonthlyDecision_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_MonthlyDecision" ("argument", "id", "portfolioId", "submittedAt", "userId") SELECT "argument", "id", "portfolioId", "submittedAt", "userId" FROM "MonthlyDecision";
DROP TABLE "MonthlyDecision";
ALTER TABLE "new_MonthlyDecision" RENAME TO "MonthlyDecision";
CREATE UNIQUE INDEX "MonthlyDecision_portfolioId_userId_key" ON "MonthlyDecision"("portfolioId", "userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

