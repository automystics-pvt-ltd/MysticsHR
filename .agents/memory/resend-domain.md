---
name: Resend email domain limitation
description: Resend free tier restriction — emails only deliverable to account owner until domain is verified
---

# Resend Free Tier Domain Restriction

## The Rule
Resend's free tier only allows sending to the email address of the Resend account owner. Any attempt to send to a different address returns HTTP 403 `validation_error`.

**Why:** Resend prevents spam/abuse on unverified accounts by locking the `to` address to the account owner's email until a sending domain is verified.

## Error observed
```
403 {"statusCode":403,"name":"validation_error","message":"You can only send testing emails to your own email address (anandakumar.mani012@gmail.com). To send emails to other recipients, please verify a domain at resend.com/domains, and change the `from` address to an email using this domain."}
```

## Fix Required (before going to production)
1. Go to **resend.com/domains** → Add domain (e.g. `automystics.com`)
2. Add DNS records (MX + SPF + DKIM) as shown by Resend — takes ~5 min
3. Add a `RESEND_FROM` secret: `MysticsHR <noreply@automystics.com>`
4. The `sendViaResend()` function in `self-service.ts` already reads `process.env.RESEND_FROM` with this fallback pattern

## Current behaviour without domain verification
- OTP is still printed to the API server console log (`[OTP] ... OTP for X: NNNNNN`)
- SMTP fallback also runs but returns null (no SMTP configured)
- Net result: OTP only visible in server logs — functional for development, blocked for production
