// Haworth | Orgatec India 2026 - Finder backend (Google Apps Script)
// Bound to a Google Sheet. For every submission it:
//   1) adds one row to the "Visitors" tab: Time | Organisation | Role | Email | Liked | Products
//   2) emails the selection PDF to TO_EMAIL (your Haworth inbox), with "Send to: <visitor email>" at the top
// The Vercel function /api/notify calls this web app. Nothing else is exposed.

const TO_EMAIL = 'siddharth.t@haworth.com';
const SECRET   = 'PASTE-A-LONG-RANDOM-STRING-HERE';   // must match SHEET_TOKEN in Vercel
const TAB      = 'Visitors';
const HEAD     = ['Time (IST)', 'Organisation', 'Role', 'Email', 'Liked', 'Products'];

function doPost(e) {
  let b;
  try { b = JSON.parse(e.postData.contents); } catch (_) { return out_({ ok: false, error: 'bad-json' }); }
  if (!b || b.token !== SECRET) return out_({ ok: false, error: 'auth' });

  const org = s_(b.org, 80), role = s_(b.role, 40), email = s_(b.email, 120);
  const products = (Array.isArray(b.products) ? b.products : []).map(x => s_(x, 60)).filter(Boolean);
  const when = Utilities.formatDate(new Date(), 'Asia/Kolkata', 'dd MMM yyyy HH:mm');
  const res = { ok: true, sheet: 'failed', mail: 'skipped' };

  // 1) sheet row
  try {
    const lock = LockService.getScriptLock(); lock.waitLock(20000);
    try {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      let sh = ss.getSheetByName(TAB);
      if (!sh) { sh = ss.insertSheet(TAB); }
      if (sh.getLastRow() === 0) {
        sh.appendRow(HEAD); sh.setFrozenRows(1);
        sh.getRange(1, 1, 1, HEAD.length).setFontWeight('bold');
      }
      sh.appendRow([when, safe_(org), safe_(role), safe_(email), products.length, safe_(products.join(', '))]);
    } finally { lock.releaseLock(); }
    res.sheet = 'ok';
  } catch (err) { res.sheet = 'failed: ' + err; }

  // 2) email to your Haworth inbox
  try {
    const hasMail = !!email;
    const P1 = 'We loved hosting you at Haworth’s Orgatec India 2026 showcase. Thank you for taking the time to visit us and to explore our range.';
    const P2 = 'We hope our sensory experience and products gave you fresh insights and design ideas for your future projects. Your personal selection is attached as a PDF for easy reference.';
    const P3 = 'If you would like samples, specifications or a conversation about a project, simply reply to this email and our team will be glad to help.';
    const text = (hasMail ? 'Send to: ' + email : 'Send to: (no email given - no action needed)') + '\n\n' +
      'Hi,\n\n' + P1 + '\n\n' + P2 + '\n\n' + P3 + '\n\nWarm regards,\nTeam Haworth India\n' +
      (hasMail ? '' : '\n---\nOrganisation: ' + (org || '-') + '\nRole: ' + (role || '-') + '\n');
    const p = 'style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#2b2b2b"';
    const html = '<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px">' +
      '<p style="margin:0 0 22px;font-size:16px;color:#141414">Send to: <b>' + h_(hasMail ? email : '(no email given - no action needed)') + '</b></p>' +
      '<div style="border-top:1px solid #ddd;padding-top:20px">' +
      '<p ' + p + '>Hi,</p><p ' + p + '>' + h_(P1) + '</p><p ' + p + '>' + h_(P2) + '</p><p ' + p + '>' + h_(P3) + '</p>' +
      '<p style="margin:26px 0 0;font-size:16px;line-height:1.5;color:#2b2b2b">Warm regards,<br><b>Team Haworth India</b></p></div>' +
      (hasMail ? '' : '<p style="margin:24px 0 0;font-size:13px;color:#777">Organisation: ' + h_(org || '-') + '<br>Role: ' + h_(role || '-') + '</p>') +
      '</div>';
    const opts = { to: TO_EMAIL, subject: hasMail ? 'Haworth | Your Selection' : 'Orgatec selection (no visitor email): ' + (org || 'Visitor'),
      body: text, htmlBody: html, name: 'Haworth Orgatec Finder' };
    if (b.pdf && /^[A-Za-z0-9+\/=]+$/.test(b.pdf)) {
      opts.attachments = [Utilities.newBlob(Utilities.base64Decode(b.pdf), 'application/pdf', 'Haworth-Your-Selection.pdf')];
    }
    MailApp.sendEmail(opts);
    res.mail = opts.attachments ? 'sent-with-pdf' : 'sent-no-pdf';
  } catch (err) { res.mail = 'failed: ' + err; }

  return out_(res);
}

function doGet() { return out_({ ok: true, service: 'haworth-orgatec-finder' }); }
function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function s_(v, n) { return String(v == null ? '' : v).replace(/[\r\n]+/g, ' ').trim().slice(0, n); }
function safe_(v) { v = String(v); return /^[=+\-@]/.test(v) ? "'" + v : v; }   // stops formulas being run from the sheet
function h_(v) { return String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

// Run this once from the editor to authorise the script (sheet + email permissions).
function authorise() {
  SpreadsheetApp.getActiveSpreadsheet();
  MailApp.getRemainingDailyQuota();
}
