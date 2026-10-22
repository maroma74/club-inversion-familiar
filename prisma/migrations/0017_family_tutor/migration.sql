-- TutorIA por familia: el presidente puede activarla o desactivarla (empieza activada)
ALTER TABLE "Family" ADD COLUMN "tutorEnabled" BOOLEAN NOT NULL DEFAULT true;
