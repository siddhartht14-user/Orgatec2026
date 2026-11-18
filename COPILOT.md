# Auto-forward the selection PDF to the visitor (Power Automate, described to Copilot)

Outlook's Copilot cannot act on its own when mail arrives. Power Automate can, and it has its own Copilot box
("Describe it to design it") where you paste the prompt below. Open make.powerautomate.com, sign in with your
Haworth account, then Create > "Describe it to design it" (or "Start with Copilot").

## Prompt to paste

Create an automated cloud flow for my Haworth Outlook mailbox.

Trigger: "When a new email arrives (V3)" in my Inbox, with Subject Filter "Haworth | Your Selection", From set to
siddhartht14@gmail.com, Only with Attachments = Yes, Include Attachments = Yes.

Step 1: Compose, named "VisitorEmail". Read the visitor's email id from the line that says "Send to:" at the top of the
email body. Use this expression:
trim(first(split(replace(replace(last(split(triggerOutputs()?['body/bodyPreview'],'Send to: ')),decodeUriComponent('%0D'),' '),decodeUriComponent('%0A'),' '),' ')))

Step 2: Condition. Continue only if VisitorEmail contains "@". If it does not, do nothing.

Step 3 (Yes branch): "Send an email (V2)" from my mailbox.
- To: VisitorEmail
- Subject: Haworth | Your Selection
- Body (HTML): copy everything in the original email body that comes AFTER the "Send to:" line, from "Hi," through
  "Team Haworth India". Do not include the "Send to:" line.
- Attachments: the PDF attachment from the trigger email (use the Attachments Name and Attachments Content from the trigger).
- Importance: Normal.

Step 4: Move the original email to a folder called "Orgatec Sent" so my Inbox stays clean.

Add a Scope around steps 1 to 4 and, if anything fails, send me an email saying "Orgatec auto-send failed for
" followed by the Subject, so I can send it by hand.

## Body text the flow should send (use this if Copilot does not copy it cleanly)

Hi,

We loved hosting you at Haworth's Orgatec India 2026 showcase. Thank you for taking the time to visit us and to explore our range.

We hope our sensory experience and products gave you fresh insights and design ideas for your future projects. Your personal selection is attached as a PDF for easy reference.

If you would like samples, specifications or a conversation about a project, simply reply to this email and our team will be glad to help.

Warm regards,
Team Haworth India

## Test before the show

1. Run the app once with your own personal email id and check the flow forwards it.
2. Check the visitor copy lands in the inbox (not spam), with the PDF attached.
3. Entries with no email id arrive with the subject "Orgatec selection (no visitor email): ..." and the flow ignores them.

If Haworth IT blocks external recipients from flows, ask for the "Send an email (V2)" action to be allowed for
external addresses; the rest of the flow stays inside Haworth.
