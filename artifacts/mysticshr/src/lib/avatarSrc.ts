// Employee photos are uploaded to private object storage (path like
// "/objects/uploads/..."), which isn't directly fetchable as an <img src>.
// Route those through the authenticated avatar-serving endpoint; pass
// through anything else unchanged (e.g. a legacy external URL, if ever set).
export function employeeAvatarSrc(employeeId: number, avatarUrl?: string | null): string | undefined {
  if (!avatarUrl) return undefined;
  if (avatarUrl.startsWith("/objects/")) return `/api/employees/${employeeId}/avatar`;
  return avatarUrl;
}
