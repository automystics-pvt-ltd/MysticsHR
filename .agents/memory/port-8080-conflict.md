---
name: Port 8080 conflict pattern
description: Legacy "API Server" workflow races with the artifact workflow for port 8080; how to diagnose and fix.
---

## Rule
When `artifacts/api-server: API Server` fails with EADDRINUSE on port 8080, the cause is always a legacy duplicate workflow (`API Server`, command `PORT=8080 pnpm --filter @workspace/api-server run dev`) that was created before the artifact system.

## How to fix
1. `removeWorkflow({ name: "API Server" })` — removes the conflicting legacy workflow.
2. If a stale process is still holding the port: look up inode in `/proc/net/tcp` (port 8080 = 0x1F90), find the PID owning that socket inode by scanning `/proc/[0-9]*/fd`, then `kill -9 <pid>`.
3. `restartWorkflow({ workflowName: "artifacts/api-server: API Server", timeout: 50 })`.

**Why:** The legacy workflow auto-restarts and binds 8080 faster than the artifact workflow, every single time the artifact workflow is restarted.

**How to apply:** Any time `EADDRINUSE: 0.0.0.0:8080` appears in the API server logs.
