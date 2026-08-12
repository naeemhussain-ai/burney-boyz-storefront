-- Reverts the individual variant-pricing feature added in
-- 20260812123000_add_variant_compare_and_review_status. That migration bundled
-- two unrelated changes: reviews.status (KEEP - review moderation stays) and
-- variants.comparePrice (DROP - variant-level pricing editing is being
-- reverted; product-level myPrice/comparePrice remains the only editable
-- selling price).
ALTER TABLE "variants" DROP COLUMN IF EXISTS "comparePrice";
