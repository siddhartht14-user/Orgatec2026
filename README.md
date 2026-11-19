# Orgatec 2026 – product selector

Tinder-style swipe selector for Haworth, BuzziSpace and Cappellini products.

- `/` the app (full screen, mobile first)
- `/preview` device preview (iPhone 16, 16 Pro Max, Galaxy S25 Ultra)
- `products.js` product names, brands, designers and images
- `api/notify.js` emails each completed selection (time, organisation, role, email, products) via Resend
- `apps-script/` and `COPILOT.md` are optional extras (Google Sheet / Power Automate), not used right now

## Vercel environment variables

| Name | Required | Notes |
|---|---|---|
| `RESEND_API_KEY` | yes | Resend API key (never commit it) |
| `NOTIFY_TO` | no | Defaults to siddhartht14@gmail.com |
| `RESEND_FROM` | no | Verified sender; default is Resend's onboarding@resend.dev |
