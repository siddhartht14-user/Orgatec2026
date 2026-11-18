// Vercel serverless function (Resend).
// 1) Always: a short lead record to the team inbox (organisation, role, email).
// 2) If the visitor gave an email AND a verified sender is configured: a thank-you note with their selection as a PDF.
// Env vars (Vercel): RESEND_API_KEY (required), RESEND_FROM (verified sender, needed for the visitor email),
//                    NOTIFY_TO (team inbox, default below), PUBLIC_URL (site URL used for the logo in the email).
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clip = (s, n) => String(s == null ? '' : s).replace(/[\r\n]+/g, ' ').trim().slice(0, n);

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ ok: false, error: 'method' }); }
  const key = process.env.RESEND_API_KEY;
  if (!key) return res.status(500).json({ ok: false, error: 'not-configured' });

  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (_) { return res.status(400).json({ ok: false, error: 'bad-json' }); } }
  b = b || {};
  const count = Math.max(0, Math.min(parseInt(b.count, 10) || 0, 99));
  if (!count) return res.status(400).json({ ok: false, error: 'empty' });
  const org = clip(b.org, 80), role = clip(b.role, 40);
  const email = /^[^\s@<>",;]+@[^\s@<>",;]+\.[^\s@<>",;]{2,}$/.test(String(b.email || '').trim()) ? String(b.email).trim().slice(0, 120) : '';
  const pdf = typeof b.pdf === 'string' && /^[A-Za-z0-9+/=]+$/.test(b.pdf) && b.pdf.length < 6e6 ? b.pdf : '';

  const TEAM = process.env.NOTIFY_TO || 'siddhartht14@gmail.com';
  const FROM = process.env.RESEND_FROM || 'Haworth Selector <onboarding@resend.dev>';
  const SITE = (process.env.PUBLIC_URL || 'https://orgatec2026.vercel.app').replace(/\/$/, '');
  const ist = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }) + ' IST';
  const send = payload => fetch('https://api.resend.com/emails', {
    method: 'POST', headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });

  // 1) lead record
  const rec = [['Organisation', org], ['Role', role], ['Email', email]];
  const ltext = 'Orgatec India 2026 - new visitor\n' + ist + '\n\n' + rec.map(r => r[0] + ': ' + (r[1] || '-')).join('\n') + '\n';
  const lhtml = '<div style="font-family:Arial,Helvetica,sans-serif;color:#141414;max-width:480px">' +
    '<h2 style="margin:0 0 4px;font-weight:500">Orgatec India 2026 - new visitor</h2><p style="margin:0 0 12px;color:#666;font-size:14px">' + esc(ist) + '</p>' +
    '<table style="border-collapse:collapse;font-size:15px">' + rec.map(r => '<tr><td style="padding:5px 18px 5px 0;color:#999">' + esc(r[0]) + '</td><td style="padding:5px 0"><b style="font-weight:500">' + esc(r[1] || '-') + '</b></td></tr>').join('') + '</table></div>';
  try {
    const r = await send({ from: FROM, to: [TEAM], subject: 'Orgatec lead: ' + (org || 'Visitor') + (role ? ' (' + role + ')' : ''), html: lhtml, text: ltext, ...(email ? { reply_to: email } : {}) });
    if (!r.ok) return res.status(502).json({ ok: false, error: 'resend-' + r.status });
  } catch (e) { return res.status(502).json({ ok: false, error: 'network' }); }

  // 2) thank-you + PDF to the visitor (needs a verified sender domain, i.e. RESEND_FROM)
  let visitor = 'skipped';
  if (email && process.env.RESEND_FROM) {
    const P1 = 'We loved hosting you at Haworth’s Orgatec India 2026 showcase. Thank you for taking the time to visit us and to explore our range.';
    const P2 = 'We hope our sensory experience and products gave you fresh insights and design ideas for your future projects. Your personal selection is attached as a PDF for easy reference.';
    const P3 = 'If you would like samples, specifications or a conversation about a project, simply reply to this email and our team will be glad to help.';
    const text = 'Hi,\n\n' + P1 + '\n\n' + P2 + '\n\n' + P3 + '\n\nWarm regards,\nTeam Haworth India\n';
    const p = 'style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#2b2b2b"';
    const html = '<div style="background:#f4f4f4;padding:28px 12px;font-family:Arial,Helvetica,sans-serif">' +
      '<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:6px;overflow:hidden">' +
      '<div style="padding:30px 36px 6px"><img src="' + SITE + '/img/haworth-logo-black.png" alt="HAWORTH" width="170" style="display:block;border:0;height:auto"></div>' +
      '<div style="padding:18px 36px 8px"><p ' + p + '>Hi,</p><p ' + p + '>' + esc(P1) + '</p><p ' + p + '>' + esc(P2) + '</p><p ' + p + '>' + esc(P3) + '</p>' +
      '<p style="margin:26px 0 0;font-size:16px;line-height:1.5;color:#2b2b2b">Warm regards,<br><b style="font-weight:600">Team Haworth India</b></p></div>' +
      '<div style="padding:22px 36px 28px;font-size:12px;color:#999">Haworth India &nbsp;|&nbsp; Orgatec India 2026</div></div></div>';
    try {
      const v = await send({ from: FROM, to: [email], subject: 'Haworth | Your Selection', html, text, reply_to: TEAM,
        ...(pdf ? { attachments: [{ filename: 'Haworth-Your-Selection.pdf', content: pdf }] } : {}) });
      visitor = v.ok ? (pdf ? 'sent-with-pdf' : 'sent-no-pdf') : 'failed-' + v.status;
    } catch (_) { visitor = 'failed'; }
  }
  return res.status(200).json({ ok: true, visitor });
};
