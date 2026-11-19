// Vercel serverless function (Resend): one email per completed selection to the team inbox.
// Env vars (Vercel): RESEND_API_KEY (required), NOTIFY_TO (default below), RESEND_FROM (optional verified sender).
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clip = (s, n) => String(s == null ? '' : s).replace(/[\r\n]+/g, ' ').trim().slice(0, n);

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ ok: false, error: 'method' }); }
  const key = process.env.RESEND_API_KEY;
  if (!key) return res.status(500).json({ ok: false, error: 'not-configured' });

  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (_) { return res.status(400).json({ ok: false, error: 'bad-json' }); } }
  b = b || {};
  const products = (Array.isArray(b.products) ? b.products : []).slice(0, 60).map(x => clip(x, 60)).filter(Boolean);
  if (!products.length) return res.status(400).json({ ok: false, error: 'empty' });
  const org = clip(b.org, 80), role = clip(b.role, 40);
  const email = /^[^\s@<>",;]+@[^\s@<>",;]+\.[^\s@<>",;]{2,}$/.test(String(b.email || '').trim()) ? String(b.email).trim().slice(0, 120) : '';

  const TO = process.env.NOTIFY_TO || 'siddhartht14@gmail.com';
  const FROM = process.env.RESEND_FROM || 'Haworth Selector <onboarding@resend.dev>';
  const ist = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) + ' IST';

  const rows = [['Time', ist], ['Organisation', org || '-'], ['Role', role || '-'], ['Email', email || '-']];
  const text = 'Orgatec India 2026 - new visitor\n\n' + rows.map(r => r[0] + ': ' + r[1]).join('\n') +
    '\n\nProducts chosen (' + products.length + '):\n' + products.map((p, i) => (i + 1) + '. ' + p).join('\n') + '\n';
  const html = '<div style="font-family:Arial,Helvetica,sans-serif;color:#141414;max-width:520px">' +
    '<h2 style="margin:0 0 14px;font-weight:500">Orgatec India 2026 - new visitor</h2>' +
    '<table style="border-collapse:collapse;font-size:15px">' + rows.map(r => '<tr><td style="padding:5px 20px 5px 0;color:#999">' + esc(r[0]) + '</td><td style="padding:5px 0"><b style="font-weight:500">' + esc(r[1]) + '</b></td></tr>').join('') + '</table>' +
    '<h3 style="margin:22px 0 8px;font-weight:500;font-size:16px">Products chosen (' + products.length + ')</h3>' +
    '<ol style="margin:0;padding-left:22px;font-size:15px;line-height:1.7">' + products.map(p => '<li>' + esc(p) + '</li>').join('') + '</ol></div>';

  try {
    const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to: [TO], subject: 'Orgatec lead: ' + (org || 'Visitor') + (role ? ' (' + role + ')' : ''), html, text, ...(email ? { reply_to: email } : {}) }) });
    if (!r.ok) return res.status(502).json({ ok: false, error: 'resend-' + r.status });
    return res.status(200).json({ ok: true });
  } catch (e) { return res.status(502).json({ ok: false, error: 'network' }); }
};
