// Vercel serverless relay -> Google Apps Script (Sheet row + PDF email to your Haworth inbox).
// Env vars (Vercel): SHEET_WEBHOOK_URL (Apps Script web app URL), SHEET_TOKEN (same secret as in Code.gs).
const clip = (s, n) => String(s == null ? '' : s).replace(/[\r\n]+/g, ' ').trim().slice(0, n);

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ ok: false, error: 'method' }); }
  const url = process.env.SHEET_WEBHOOK_URL, token = process.env.SHEET_TOKEN;
  if (!url || !token) return res.status(500).json({ ok: false, error: 'not-configured' });

  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (_) { return res.status(400).json({ ok: false, error: 'bad-json' }); } }
  b = b || {};
  const products = (Array.isArray(b.products) ? b.products : []).slice(0, 60).map(x => clip(x, 60)).filter(Boolean);
  if (!products.length) return res.status(400).json({ ok: false, error: 'empty' });
  const email = /^[^\s@<>",;]+@[^\s@<>",;]+\.[^\s@<>",;]{2,}$/.test(String(b.email || '').trim()) ? String(b.email).trim().slice(0, 120) : '';
  const pdf = typeof b.pdf === 'string' && /^[A-Za-z0-9+/=]+$/.test(b.pdf) && b.pdf.length < 6e6 ? b.pdf : '';

  try {
    const r = await fetch(url, { method: 'POST', redirect: 'follow', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ token, org: clip(b.org, 80), role: clip(b.role, 40), email, products, pdf }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.ok) return res.status(502).json({ ok: false, error: j.error || 'upstream-' + r.status });
    return res.status(200).json({ ok: true, sheet: j.sheet, mail: j.mail });
  } catch (e) { return res.status(502).json({ ok: false, error: 'network' }); }
};
