-- Where a scene's narration came from.
--
-- 'tts' is regenerated on every render. 'upload' is the customer's own recording,
-- which the render must use as-is: without this flag the next render silently
-- replaces a human take with a synthesised one.
--
-- Every existing row becomes 'tts', which is exactly what it was.
ALTER TABLE `steps`
  ADD COLUMN `audioSource` ENUM('tts', 'upload') NOT NULL DEFAULT 'tts' AFTER `userEditedScript`;
