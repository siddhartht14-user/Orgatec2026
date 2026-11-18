# Power Automate flow: send the selection PDF to the visitor

How it finds the visitor's email id: the app puts it on the FIRST line of the email body as
`Send to: name@company.com`. The flow reads that line, and sends a fresh email from your Haworth mailbox
to that address with the PDF the app attached.

How the "rule" works: the trigger filters are the rule. Only mail that arrives in your Inbox from the sender
below with the subject "Haworth | Your Selection" and an attachment starts the flow. Submissions with no email id
never send any email (they only go to the Google Sheet), so nothing else can trigger it.

## Prompt to paste (make.powerautomate.com > Create > Describe it to design it)

Create an automated cloud flow for my Haworth Outlook mailbox.

Trigger: "When a new email arrives (V3)", Folder Inbox, From = siddhartht14@gmail.com, Subject Filter = "Haworth | Your Selection",
Only with Attachments = Yes, Include Attachments = Yes.

Step 1: Compose, named VisitorEmail, with this expression (it reads the address after "Send to:" in the email body):
trim(first(split(replace(replace(last(split(triggerOutputs()?['body/bodyPreview'],'Send to: ')),decodeUriComponent('%0D'),' '),decodeUriComponent('%0A'),' '),' ')))

Step 2: Condition. If VisitorEmail contains "@" go to the Yes branch, otherwise do nothing.

Step 3, Yes branch: "Send an email (V2)" from my mailbox.
- To: VisitorEmail
- Subject: Haworth | Your Selection
- Is HTML: Yes
- Body: the HTML below
- Attachments: for each attachment of the trigger email, Name = Attachments Name, Content = Attachments Content (the PDF)

Step 4: Move the trigger email to a folder called "Orgatec Sent".

Put steps 1 to 4 in a Scope. If the Scope fails, send me an email: subject "Orgatec auto-send failed", body = the subject of the trigger email and VisitorEmail.

Body HTML for step 3:

<div style="background:#f4f4f4;padding:24px 10px;font-family:Arial,Helvetica,sans-serif"><div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:6px">
<div style="padding:28px 32px 4px"><img src="https://orgatec2026.vercel.app/img/haworth-logo-black.png" alt="HAWORTH" width="170" style="display:block;border:0;height:auto"></div>
<div style="padding:18px 32px 8px;font-size:16px;line-height:1.6;color:#2b2b2b">
<p style="margin:0 0 16px">Hi,</p>
<p style="margin:0 0 16px">We loved hosting you at Haworth’s Orgatec India 2026 showcase. Thank you for taking the time to visit us and to explore our range.</p>
<p style="margin:0 0 16px">We hope our sensory experience and products gave you fresh insights and design ideas for your future projects. Your personal selection is attached as a PDF for easy reference.</p>
<p style="margin:0 0 16px">If you would like samples, specifications or a conversation about a project, simply reply to this email and our team will be glad to help.</p>
<p style="margin:26px 0 0">Warm regards,<br><b>Team Haworth India</b></p></div>
<div style="padding:20px 32px 26px;font-size:12px;color:#999999">Haworth India &nbsp;|&nbsp; Orgatec India 2026</div></div></div>

## If the expression fails

Open a run in the flow history, look at the output of the trigger, and check that "bodyPreview" starts with "Send to: ".
If Haworth IT blocks flows from emailing external addresses, ask them to allow "Send an email (V2)" to external recipients.

## Test

Complete the app once with your own personal email id. You should get the email in the Haworth inbox, then a minute
later the visitor copy at your personal address with the PDF attached. Check spam.
