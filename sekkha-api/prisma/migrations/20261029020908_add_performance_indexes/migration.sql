-- CreateIndex
CREATE INDEX "badge_activities_is_active_idx" ON "badge_activities"("is_active");

-- CreateIndex
CREATE INDEX "events_event_date_idx" ON "events"("event_date");

-- CreateIndex
CREATE INDEX "events_status_visibility_event_date_idx" ON "events"("status", "visibility", "event_date");

-- CreateIndex
CREATE INDEX "point_rules_is_active_category_idx" ON "point_rules"("is_active", "category");

-- CreateIndex
CREATE INDEX "schools_status_is_active_name_idx" ON "schools"("status", "is_active", "name");

-- CreateIndex
CREATE INDEX "schools_status_created_at_idx" ON "schools"("status", "created_at" DESC);
