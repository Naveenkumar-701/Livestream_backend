
import sgMail from "@sendgrid/mail";

let sgReady = false;

function ensureSendgrid() {
  const key = process.env.SENDGRID_API_KEY;
  if (!key) throw new Error("SENDGRID_API_KEY is missing");
  if (!key.startsWith("SG.")) throw new Error('API key does not start with "SG."');
  if (!sgReady) {
    sgMail.setApiKey(key);
    sgReady = true;
  }
}

function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function sendAdminNotification({ fullName, workEmail, phoneNumber, organizationName }) {
  ensureSendgrid(); // <-- init happens here, AFTER dotenv has loaded

  const to = process.env.ADMIN_EMAIL || "dilanja@arinnovate.io";
  const from = process.env.SENDGRID_FROM || "recroot-account@recroot.io";

  const subject = "New Demo Voice Call Request Submitted";

  const text = `Hi Gokul,

A new request for a demo voice call has just been submitted. Please find the details below:

• Name: ${fullName}
• Work Email: ${workEmail}
• Phone Number: ${phoneNumber}
• Organization Name: ${organizationName}
`;

  const html = `
  <div style="font-family: Arial, Helvetica, sans-serif; line-height:1.6; color:#111;">
    <p><strong>Subject:</strong> New Demo Voice Call Request Submitted</p>
    <p><strong>Body:</strong></p>
    <p>Hi Gokul,</p>
    <p>A new request for a demo voice call has just been submitted. Please find the details below:</p>
    <ul style="padding-left: 18px; margin-top: 8px;">
      <li><strong>Name:</strong> ${escapeHtml(fullName)}</li>
      <li><strong>Work Email:</strong> ${escapeHtml(workEmail)}</li>
      <li><strong>Phone Number:</strong> ${escapeHtml(phoneNumber)}</li>
      <li><strong>Organization Name:</strong> ${escapeHtml(organizationName)}</li>
    </ul>
  </div>`;

  await sgMail.send({
    to,
    from,            // must be a verified sender/domain in SendGrid
    subject,
    text,
    html,
    replyTo: workEmail, // optional
  });
}
