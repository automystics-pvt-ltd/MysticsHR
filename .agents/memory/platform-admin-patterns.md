---
name: Platform Admin patterns
description: Key patterns and anti-patterns for platform-admin (wouter v3, shadcn, confirm dialogs)
---

## Wouter v3 Link
In wouter v3, `<Link>` renders as an `<a>` tag directly. Pass `className` and all anchor props directly to `<Link>` — never wrap with a child `<a>` element. Nested `<a><a>` is invalid HTML and causes React hydration warnings.

**Wrong:** `<Link href="..."><a className="...">text</a></Link>`
**Right:** `<Link href="..." className="...">text</Link>`

**Why:** wouter v2 used to accept `<a>` children and patch href; v3 changed to render itself as the anchor.

**How to apply:** Any time a Link wraps an <a> child in platform-admin, remove the inner <a> and hoist its className/props to Link.

## Confirm dialogs
Use `AlertDialog` from `@/components/ui/alert-dialog` with a `confirmDlg` state object instead of `window.confirm()` or `alert()`. Pattern:

```tsx
const [confirmDlg, setConfirmDlg] = useState<{ open: boolean; label: string; onConfirm: () => void }>({ open: false, label: "", onConfirm: () => {} });
// trigger:
onClick={() => setConfirmDlg({ open: true, label: "...", onConfirm: () => mutation.mutate(id) })}
// JSX at end of return:
<AlertDialog open={confirmDlg.open} onOpenChange={o => !o && setConfirmDlg(d => ({ ...d, open: false }))}>
  ...AlertDialogAction onClick={confirmDlg.onConfirm}...
</AlertDialog>
```

## Error toasts
Use `useToast` from `@/hooks/use-toast` with `variant: "destructive"` instead of `alert(e.message)`.
