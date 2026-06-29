---
name: API client branches gap
description: Branches API has no generated React hooks — use direct fetch with useQuery
---

The auto-generated `@workspace/api-client-react` package does NOT export hooks for the `/api/branches` endpoints (`useGetBranches`, `useListBranches` etc. do not exist).

**Why:** The OpenAPI codegen only generates hooks for endpoints registered in the spec. Branches may have been added directly without updating the spec, or the spec was not regenerated.

**How to apply:** Anywhere you need branch data in the frontend, use:
```typescript
const { data: branches = [] } = useQuery<Branch[]>({
  queryKey: ["branches"],
  queryFn: () => fetch(`${BASE_URL}/api/branches`, { credentials: "include" }).then(r => r.json()),
});
```

Same pattern applies to any other endpoint that lacks a generated hook — check with:
```bash
grep "useGetBranches\|useListBranches" lib/api-client-react/src/generated/api.ts
```
before importing a hook that may not exist.
