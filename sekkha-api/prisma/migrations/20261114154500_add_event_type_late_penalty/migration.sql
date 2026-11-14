-- AlterTable
ALTER TABLE "event_types" ADD COLUMN "apply_late_penalty" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "default_max_late_minutes" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN "default_late_penalty_points" INTEGER NOT NULL DEFAULT 15;
