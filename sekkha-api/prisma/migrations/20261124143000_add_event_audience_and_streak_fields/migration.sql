-- AlterTable: event_types (nullable late penalty defaults + audience & streak config)
ALTER TABLE "event_types"
ALTER COLUMN "default_max_late_minutes" DROP NOT NULL,
ALTER COLUMN "default_late_penalty_points" DROP NOT NULL,
ADD COLUMN IF NOT EXISTS "default_visibility" "EventVisibility" NOT NULL DEFAULT 'all',
ADD COLUMN IF NOT EXISTS "default_target_roles" "Role"[] NOT NULL DEFAULT ARRAY[]::"Role"[],
ADD COLUMN IF NOT EXISTS "counts_toward_streak" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable: events (audience target roles + countsTowardStreak)
ALTER TABLE "events"
ADD COLUMN IF NOT EXISTS "target_roles" "Role"[] NOT NULL DEFAULT ARRAY[]::"Role"[],
ADD COLUMN IF NOT EXISTS "counts_toward_streak" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "events_status_counts_toward_streak_event_date_idx"
ON "events"("status", "counts_toward_streak", "event_date");
