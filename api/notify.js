// Vercel serverless function: emails the selection summary via Resend.
// Env vars (set in Vercel): RESEND_API_KEY (required), RESEND_FROM (verified sender), NOTIFY_TO (default below).
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clip = (s, n) => String(s == null ? '' : s).replace(/[\r\n]+/g, ' ').slice(0, n);

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ ok: false, error: 'method' }); }
  const key = process.env.RESEND_API_KEY;
  if (!key) return res.status(500).json({ ok: false, error: 'not-configured' });

  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (_) { return res.status(400).json({ ok: false, error: 'bad-json' }); } }
  const sel = Array.isArray(b && b.selected) ? b.selected.slice(0, 40) : [];
  if (!sel.length) return res.status(400).json({ ok: false, error: 'empty' });
  const items = sel.map(i => ({ name: clip(i && i.name, 80), brand: clip(i && i.brand, 60), designer: clip(i && i.designer, 80) }))
    .map(i => Object.assign(i, { india: /made in india/i.test(i.brand) })).filter(i => i.name);
  const total = Math.min(Math.max(parseInt(b.total, 10) || items.length, items.length), 99);

  const now = new Date();
  const ist = now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) + ' IST';
  const iso = now.toISOString();
  const subject = 'Product selection: ' + items.length + ' of ' + total + ' liked (' + ist + ')';

  const india = items.filter(i => i.india), other = items.filter(i => !i.india);
  const line = i => i.name + ' - ' + i.brand + (i.designer ? ' (designed by ' + i.designer + ')' : '');
  const sec = (title, arr) => arr.length ? title + ' (' + arr.length + ')\n' + arr.map((i, n) => (n + 1) + '. ' + line(i)).join('\n') + '\n\n' : '';
  const text = 'Product selection\n' + ist + '  |  ' + iso + '\n' + items.length + ' of ' + total + ' liked\n\n' +
    sec('INDIA MADE PRODUCTS | BIS', india) + sec('ALL OTHER PRODUCTS', other);
  const rows = (arr, accent) => arr.map((i, n) => '<tr><td style="padding:8px 10px 8px 0;border-top:1px solid #eee;color:#999;width:28px">' + (n + 1) + '</td><td style="padding:8px 0;border-top:1px solid #eee"><b style="font-weight:500">' + esc(i.name) + '</b><br><span style="color:#666;font-size:13px">' + esc(i.brand) + (i.designer ? ' · Designed by ' + esc(i.designer) : '') + '</span></td></tr>').join('');
  const hsec = (title, arr, color) => arr.length ? '<h3 style="margin:20px 0 6px;font-weight:600;font-size:16px;color:' + color + ';border-left:5px solid ' + color + ';padding-left:8px">' + esc(title) + ' <span style="color:#999;font-weight:400;font-size:13px">(' + arr.length + ')</span></h3><table style="border-collapse:collapse;width:100%;font-size:15px">' + rows(arr) + '</table>' : '';
  const html = '<div style="font-family:Arial,Helvetica,sans-serif;color:#141414;max-width:520px">' +
    '<h2 style="margin:0 0 4px;font-weight:500">Product selection</h2>' +
    '<p style="margin:0 0 4px;color:#666;font-size:14px">' + esc(ist) + '<br>' + items.length + ' of ' + total + ' liked</p>' +
    hsec('India made products | BIS', india, '#d9780a') + hsec('All other products', other, '#141414') + '</div>';

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.RESEND_FROM || 'Haworth Selector <onboarding@resend.dev>',
        to: [process.env.NOTIFY_TO || 'siddhartht14@gmail.com'],
        subject, html, text
      })
    });
    if (!r.ok) return res.status(502).json({ ok: false, error: 'resend-' + r.status });
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(502).json({ ok: false, error: 'network' });
  }
};
