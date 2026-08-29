-- Multiple badges and multiple redaction regions per scene.
--
-- Both effects were single-instance: one `editorBadgeNumber` / `editorBadgeX`
-- pair and one `editorRedactX..H` rectangle per step, so placing a second badge
-- or redacting a second area silently moved the first one. These JSON columns
-- hold the full list, matching the shape already used by `editorBlurs`,
-- `editorPixelates` and `editorSpotlights`.
--
-- Nullable with no default: existing rows keep NULL, and the renderer falls
-- back to the legacy scalar columns whenever the array is absent or empty, so
-- nothing already saved changes how it renders.
ALTER TABLE `steps`
  ADD COLUMN `editorRedacts` JSON NULL AFTER `editorRedactColor`,
  ADD COLUMN `editorBadges` JSON NULL AFTER `editorBadgeColor`;
