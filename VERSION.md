# Version

| Field | Value |
| --- | --- |
| Version | 3.0.0 |
| Package | `aivideo` (see `package.json`) |

## Rollback points

Two, newest first. Prefer the newer one unless the fault is in the work it
carries.

| Field | Value |
| --- | --- |
| Commit | `ad7f1e6` |
| Subject | feat: support multiple badges and redaction regions per scene |
| Carries | multi-badge/redact, blur preview rework, caption sizing, overlay wrapping |
| Note | Needs `editorRedacts`/`editorBadges` on `steps`; already applied to the Aiven database |

The older commit below predates all of the current round of editor fixes.

| Field | Value |
| --- | --- |
| Commit | `912372ff11a6c7e86b99f8a21d6babb00476d3f4` |
| Short | `912372f` |
| Date | 2026-08-19 07:10:41 +0500 |
| Subject | fix: update caption handling logic and improve upload process in StepEditorPanel |
| Branch | `main` |

### How to roll back

Inspect first, then choose one:

```bash
# See exactly what changed since the stable point
git diff 912372f

# Throw away uncommitted work and return the tree to the stable commit
git restore --source=912372f --staged --worktree .

# Or, if the changes were already committed, undo them but keep the files
# staged so you can pick through them
git reset --soft 912372f

# Nuclear option: discard every commit and file change after the stable point
git reset --hard 912372f
```

`git reset --hard` destroys uncommitted work with no undo. Run `git stash` or
`git diff > /tmp/wip.patch` first if there is anything you might want back.
