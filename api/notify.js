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
  const items = sel.map(i => ({ name: clip(i && i.name, 80), brand: clip(i && i.brand, 60), designer: clip(i && i.designer, 80), note: clip(i && i.note, 60) }))
    .map(i => Object.assign(i, { india: /made in india/i.test(i.brand) })).filter(i => i.name);
  const org = clip(b.org, 80), role = clip(b.role, 40), device = clip(b.device, 40);
  const email = /^[^\s@<>",;]+@[^\s@<>",;]+\.[^\s@<>",;]{2,}$/.test(String(b.email || '').trim()) ? String(b.email).trim().slice(0, 120) : '';
  const total = Math.min(Math.max(parseInt(b.total, 10) || items.length, items.length), 99);

  const now = new Date();
  const ist = now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) + ' IST';
  const iso = now.toISOString();
  const subject = 'Product selection: ' + items.length + ' of ' + total + ' liked' + (org ? ' - ' + org : '') + (role ? ' (' + role + ')' : '') + ' (' + ist + ')';

  const india = items.filter(i => i.india), other = items.filter(i => !i.india);
  const line = i => i.name + ' - ' + i.brand + (i.designer ? ' (designed by ' + i.designer + ')' : '') + (i.note ? ' [' + i.note + ']' : '');
  const sec = (title, arr) => arr.length ? title + ' (' + arr.length + ')\n' + arr.map((i, n) => (n + 1) + '. ' + line(i)).join('\n') + '\n\n' : '';
  const who = [['Organisation', org], ['Role', role], ['Email', email], ['Device', device]].filter(x => x[1]);
  const text = 'Product selection\n' + ist + '  |  ' + iso + '\n' + items.length + ' of ' + total + ' liked\n' +
    (who.length ? '\n' + who.map(x => x[0] + ': ' + x[1]).join('\n') + '\n' : '') + '\n' +
    sec('INDIA MADE PRODUCTS | BIS', india) + sec('ALL OTHER PRODUCTS', other);
  const rows = (arr, accent) => arr.map((i, n) => '<tr><td style="padding:8px 10px 8px 0;border-top:1px solid #eee;color:#999;width:28px">' + (n + 1) + '</td><td style="padding:8px 0;border-top:1px solid #eee"><b style="font-weight:500">' + esc(i.name) + '</b><br><span style="color:#666;font-size:13px">' + esc(i.brand) + (i.designer ? ' · Designed by ' + esc(i.designer) : '') + (i.note ? ' · ' + esc(i.note) : '') + '</span></td></tr>').join('');
  const hsec = (title, arr, color) => arr.length ? '<h3 style="margin:20px 0 6px;font-weight:600;font-size:16px;color:' + color + ';border-left:5px solid ' + color + ';padding-left:8px">' + esc(title) + ' <span style="color:#999;font-weight:400;font-size:13px">(' + arr.length + ')</span></h3><table style="border-collapse:collapse;width:100%;font-size:15px">' + rows(arr) + '</table>' : '';
  const html = '<div style="font-family:Arial,Helvetica,sans-serif;color:#141414;max-width:520px">' +
    '<h2 style="margin:0 0 4px;font-weight:500">Product selection</h2>' +
    '<p style="margin:0 0 4px;color:#666;font-size:14px">' + esc(ist) + '<br>' + items.length + ' of ' + total + ' liked</p>' +
    (who.length ? '<table style="border-collapse:collapse;margin:10px 0 0;font-size:15px">' + who.map(x => '<tr><td style="padding:3px 14px 3px 0;color:#999">' + esc(x[0]) + '</td><td style="padding:3px 0"><b style="font-weight:500">' + esc(x[1]) + '</b></td></tr>').join('') + '</table>' : '') +
    hsec('India made products | BIS', india, '#d9780a') + hsec('All other products', other, '#141414') + '</div>';

  const FROM = process.env.RESEND_FROM || 'Haworth Selector <onboarding@resend.dev>';
  const send = payload => fetch('https://api.resend.com/emails', {
    method: 'POST', headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  try {
    // 1) internal notification to the team inbox (always)
    const r = await send({ from: FROM, to: [process.env.NOTIFY_TO || 'siddhartht14@gmail.com'], subject, html, text, ...(email ? { reply_to: email } : {}) });
    if (!r.ok) return res.status(502).json({ ok: false, error: 'resend-' + r.status });

    // 2) a copy of the summary to the visitor. Needs a verified sender domain in Resend (set RESEND_FROM);
    //    with the default onboarding sender Resend only delivers to the account owner, so this is skipped.
    let visitor = 'skipped';
    if (email && process.env.RESEND_FROM) {
      const vhtml = '<div style="font-family:Arial,Helvetica,sans-serif;color:#141414;max-width:520px">' +
        '<h2 style="margin:0 0 4px;font-weight:500">Your Haworth product selection</h2>' +
        '<p style="margin:0 0 4px;color:#666;font-size:14px">Thank you for visiting us at Orgatec India. You liked ' + items.length + ' of ' + total + ' products.</p>' +
        hsec('India made products | BIS', india, '#d9780a') + hsec('All other products', other, '#141414') +
        '<p style="margin:24px 0 0;color:#666;font-size:13px">Reply to this email and our team will get back to you.</p></div>';
      const vtext = 'Your Haworth product selection\nYou liked ' + items.length + ' of ' + total + ' products.\n\n' +
        sec('INDIA MADE PRODUCTS | BIS', india) + sec('ALL OTHER PRODUCTS', other);
      try {
        const v = await send({ from: FROM, to: [email], subject: 'Your Haworth product selection', html: vhtml, text: vtext, reply_to: process.env.NOTIFY_TO || 'siddhartht14@gmail.com' });
        visitor = v.ok ? 'sent' : 'failed-' + v.status;
      } catch (_) { visitor = 'failed'; }
    }
    return res.status(200).json({ ok: true, visitor });
  } catch (e) {
    return res.status(502).json({ ok: false, error: 'network' });
  }
};
