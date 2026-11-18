# Orgatec 2026 – product selector

Tinder-style swipe selector for Haworth, BuzziSpace and Cappellini products.

- `/` the app (full screen, mobile first)
- `/preview` device preview (iPhone 16, 16 Pro Max, Galaxy S25 Ultra)
- `products.js` product names, brands, designers and images
- `api/notify.js` relays each completed selection to the Google Apps Script web app
- `apps-script/Code.gs` paste into the Google Sheet's Apps Script: adds a row and emails the PDF to the Haworth inbox
- `COPILOT.md` the Power Automate / Copilot prompt that forwards the PDF to the visitor

## Vercel environment variables

| Name | Required | Notes |
|---|---|---|
| `SHEET_WEBHOOK_URL` | yes | The Apps Script web app URL (ends in `/exec`) |
| `SHEET_TOKEN` | yes | Same secret string as `SECRET` in Code.gs |
