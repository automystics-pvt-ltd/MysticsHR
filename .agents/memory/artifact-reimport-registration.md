---
name: Artifact registration lost on GitHub re-import
description: What to do when a pnpm-workspace project is re-imported from GitHub and artifact.toml files exist on disk but listArtifacts()/Screenshot/WorkflowsRestart don't recognize them (empty workflows, "artifact not found").
---

## Symptom
After importing an existing multi-artifact pnpm-workspace repo (artifact.toml files present under `artifacts/*/.replit-artifact/`), `.replit` has an empty `[workflows]` section, `listArtifacts()` returns `[]`, and `WorkflowsRestart` fails with "workflow doesn't exist in config" for the expected managed names. `createArtifact()` also fails with `ARTIFACT_DIR_EXISTS` since the directories already exist.

## Fix
Calling `verifyAndReplaceArtifactToml()` on any one artifact's `artifact.toml` (even a no-op or trivial edit, e.g. fixing a stale `localPort`) triggers the platform to re-scan and re-register **all** artifacts under `artifacts/`. After that call, proper managed workflows (`artifacts/<slug>: <service>`) appear and `listArtifacts()`/`Screenshot` work normally.

**Why:** The re-scan is apparently triggered by writes through the artifact-toml write path, not by simply reading the files or running `pnpm install`. There is no dedicated "resync"/"reindex" callback.

**How to apply:** If re-registration is needed but nothing actually needs changing, pick one artifact and do a real, harmless fix via `verifyAndReplaceArtifactToml` (e.g. correct a `localPort` that doesn't match a port declared in `.replit`'s `[[ports]]` list — mismatched ports cause `configureWorkflow`/managed-workflow port-open timeouts even though the dev server logs "ready"). Don't leave stray ad-hoc `configureWorkflow` workflows around afterward — remove them once the managed ones exist, and kill any orphan processes bound to the old ports before restarting the managed workflow (duplicate binds cause `EADDRINUSE` / wrong-port fallback).
