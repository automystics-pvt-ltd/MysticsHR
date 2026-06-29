---
name: Billing price storage convention
description: How subscription plan prices are stored in DB vs displayed in UI
---

## Rule
Subscription plan prices are stored in the DB as **rupees** (integers), not paise.
- `priceMonthly: 2900` = ₹2,900/month
- `priceYearly: 29000` = ₹29,000/year

## Why
The billing API in `billing.ts` calls `planAmountCents(plan, cycle) = plan.priceMonthly * 100`
to convert to paise for Razorpay. Frontend billing page displays `plan.priceMonthly` directly as rupees.

## How to apply
- Frontend display: show `plan.priceMonthly` as-is with `₹` prefix (no ÷100)
- API to Razorpay: multiply by 100 to get paise
- Landing page `fmtPrice(rupees)` must NOT divide by 100 (fixed bug where it divided)
