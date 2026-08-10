-- Filter opacity for the canvas editor's colour filter.
-- Defaults to 100 so every existing step keeps the full-strength filter it
-- already renders with; only steps you actually adjust will change.
ALTER TABLE `steps`
  ADD COLUMN `editorColorFilterStrength` FLOAT NOT NULL DEFAULT 100;
