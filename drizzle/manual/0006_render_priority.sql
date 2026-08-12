-- Queue position for render jobs. Higher goes first; equal priorities keep
-- arrival order, so the queue stays fair within a plan.
--
-- Set at enqueue from the customer's plan (team 20, pro 10, free 0) rather than
-- looked up when the worker claims the job, so a customer keeps the position
-- their plan promised at the moment they pressed render.
ALTER TABLE `render_jobs`
  ADD COLUMN `priority` INT NOT NULL DEFAULT 0 AFTER `projectId`;

-- The worker orders by priority then id, so give it an index to walk.
CREATE INDEX `render_jobs_queue_idx` ON `render_jobs` (`status`, `priority`, `id`);
