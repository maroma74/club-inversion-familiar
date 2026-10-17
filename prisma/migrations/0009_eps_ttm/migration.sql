-- BPA TTM ya construido y su divisa, para proveedores que no publican trimestres (Yahoo)
ALTER TABLE "EpsCache" ADD COLUMN "ttm" JSONB;
ALTER TABLE "EpsCache" ADD COLUMN "currency" TEXT;
