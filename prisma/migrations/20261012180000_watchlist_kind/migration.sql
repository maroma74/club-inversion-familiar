-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_WatchlistItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "familyId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'STOCK',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_WatchlistItem" ("createdAt", "familyId", "id", "name", "symbol") SELECT "createdAt", "familyId", "id", "name", "symbol" FROM "WatchlistItem";
DROP TABLE "WatchlistItem";
ALTER TABLE "new_WatchlistItem" RENAME TO "WatchlistItem";
CREATE UNIQUE INDEX "WatchlistItem_familyId_symbol_key" ON "WatchlistItem"("familyId", "symbol");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;


-- Los ETF que ya estaban en la lista de acciones pasan a la sección ETF
UPDATE "WatchlistItem" SET "kind" = 'ETF' WHERE "symbol" IN ('VWCE.DE');
