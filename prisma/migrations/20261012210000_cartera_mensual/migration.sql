-- CreateTable
CREATE TABLE "MonthlyPortfolio" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "familyId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "lesson" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "minChoices" INTEGER NOT NULL DEFAULT 1,
    "maxChoices" INTEGER NOT NULL DEFAULT 1,
    "deadline" DATETIME,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" DATETIME,
    "closedAt" DATETIME
);

-- CreateTable
CREATE TABLE "MonthlyOption" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "portfolioId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'STOCK',
    "note" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "MonthlyOption_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "MonthlyPortfolio" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MonthlyAllocation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "portfolioId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "contributionId" TEXT,
    CONSTRAINT "MonthlyAllocation_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "MonthlyPortfolio" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MonthlyDecision" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "portfolioId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "argument" TEXT NOT NULL,
    "submittedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MonthlyDecision_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "MonthlyPortfolio" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MonthlyChoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "decisionId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "why" TEXT NOT NULL,
    "exitCondition" TEXT,
    "tradeId" TEXT,
    "journalEntryId" TEXT,
    "price" REAL,
    "quantity" REAL,
    CONSTRAINT "MonthlyChoice_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "MonthlyDecision" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MonthlyChoice_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "MonthlyOption" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyPortfolio_familyId_month_key" ON "MonthlyPortfolio"("familyId", "month");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyOption_portfolioId_symbol_key" ON "MonthlyOption"("portfolioId", "symbol");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyAllocation_contributionId_key" ON "MonthlyAllocation"("contributionId");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyAllocation_portfolioId_userId_key" ON "MonthlyAllocation"("portfolioId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyDecision_portfolioId_userId_key" ON "MonthlyDecision"("portfolioId", "userId");

