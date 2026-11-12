-- AlterTable
ALTER TABLE "users"
ADD COLUMN "last_active_at" TIMESTAMP(3),
ADD COLUMN "anonymized_at" TIMESTAMP(3);

-- Backfill last_active_at for existing active accounts from stats.last_activity_at or created_at
UPDATE "users" u
SET "last_active_at" = COALESCE(
  (SELECT s."last_activity_at" FROM "user_stats" s WHERE s."user_id" = u."id"),
  u."created_at"
)
WHERE u."last_active_at" IS NULL;

-- AlterTable
ALTER TABLE "user_profiles"
DROP COLUMN IF EXISTS "phone",
DROP COLUMN IF EXISTS "birth_date";

-- CreateIndex
CREATE INDEX "users_anonymized_at_last_active_at_idx" ON "users"("anonymized_at", "last_active_at");

