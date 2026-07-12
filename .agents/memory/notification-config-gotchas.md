---
name: notification-config-gotchas
description: Durable lessons about configuring SMTP/WhatsApp notification credentials and platform-admin access whitelists.
---

# Notification & admin-whitelist config lessons

- Credential-driven features (SMTP email, WhatsApp Cloud API) tend to fail silently on misconfiguration — a wrong value (e.g. a hostname field holding an email address) or an expired temporary API token doesn't error until an actual send is attempted. Always do a live send/verify test after collecting such secrets rather than trusting that user-provided values are correct.
- Access-control whitelists driven by an env var (e.g. an admin-email allowlist) must fail closed: no hardcoded fallback list. If the env var is unset/empty, nobody should be granted access — silently falling back to example/placeholder addresses is a security hole.

**Why:** Both issues surfaced in the same session — a swapped SMTP host value and an invalid WhatsApp token both looked "configured" but weren't, and a platform-admin route was previously defaulting to hardcoded example emails when its whitelist env var was absent.

**How to apply:** When enabling any notification channel or access-control whitelist, verify with a real request/send before declaring it done, and audit for permissive hardcoded fallbacks in the surrounding code.
