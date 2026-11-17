# Orgatec 2026 – product selector

Tinder-style swipe selector for Haworth, BuzziSpace and Cappellini products.

- `/` the app (full screen, mobile first)
- `/preview` device preview (iPhone 16, 16 Pro Max, Galaxy S25 Ultra)
- `products.js` product names, brands, designers and images
- `api/notify.js` emails the selection via Resend when someone taps "Download selection as PDF"

## Vercel environment variables

| Name | Required | Notes |
|---|---|---|
| `RESEND_API_KEY` | yes | Resend API key (never commit it) |
| `RESEND_FROM` | no | Verified sender, e.g. `Haworth Selector <selector@yourdomain.com>` |
| `NOTIFY_TO` | no | Defaults to siddhartht14@gmail.com |
