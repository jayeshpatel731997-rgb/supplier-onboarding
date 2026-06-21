import { Resend } from "resend";
import { getEnv } from "@/lib/env";

let resend: Resend | null = null;

function getResend() {
  if (!resend) {
    resend = new Resend(getEnv("RESEND_API_KEY"));
  }
  return resend;
}

const from = "Supplier Onboarding <onboarding@resend.dev>";

function emailShell(title: string, body: string, action?: { label: string; url: string }) {
  return `
    <div style="font-family:Inter,Arial,sans-serif;background:#f7f9fb;padding:32px;color:#172026">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e5e9ef;border-radius:8px;padding:32px">
        <h1 style="font-size:22px;line-height:1.3;margin:0 0 16px">${title}</h1>
        <div style="font-size:15px;line-height:1.65;color:#425466">${body}</div>
        ${
          action
            ? `<p style="margin:28px 0 0"><a href="${action.url}" style="display:inline-block;background:#0f766e;color:white;text-decoration:none;border-radius:6px;padding:12px 18px;font-weight:700">${action.label}</a></p>`
            : ""
        }
      </div>
    </div>
  `;
}

export async function sendOnboardingInvite(
  to: string,
  supplierName: string,
  buyerCompany: string,
  url: string,
  personalMessage?: string,
) {
  return getResend().emails.send({
    from,
    to,
    subject: `${buyerCompany} invited you to complete supplier onboarding`,
    html: emailShell(
      "Supplier onboarding invitation",
      `<p>${buyerCompany} has invited ${supplierName} to complete supplier onboarding.</p>${
        personalMessage ? `<p><strong>Message from buyer:</strong><br>${personalMessage}</p>` : ""
      }<p>This secure link lets you complete your profile and upload required PDF documents without creating an account.</p>`,
      { label: "Complete onboarding", url },
    ),
  });
}

export async function sendReminderEmail(
  to: string,
  supplierName: string,
  buyerCompany: string,
  url: string,
  daysLeft: number,
) {
  return getResend().emails.send({
    from,
    to,
    subject: `Reminder: ${supplierName} onboarding is due in ${daysLeft} days`,
    html: emailShell(
      "Onboarding reminder",
      `<p>${buyerCompany} is waiting for ${supplierName}'s supplier onboarding package.</p><p>Please complete the remaining profile and document steps. The onboarding window closes in ${daysLeft} days.</p>`,
      { label: "Resume onboarding", url },
    ),
  });
}

export async function sendExpiryWarning(
  to: string,
  supplierName: string,
  documentType: string,
  expiryDate: string,
  daysLeft: number,
) {
  return getResend().emails.send({
    from,
    to,
    subject: `${supplierName} ${documentType} expires in ${daysLeft} days`,
    html: emailShell(
      "Document expiry warning",
      `<p>${supplierName}'s ${documentType} expires on <strong>${expiryDate}</strong>.</p><p>Please request an updated document before procurement records become stale.</p>`,
    ),
  });
}

export async function sendCompletionNotification(
  to: string,
  buyerName: string,
  supplierCompany: string,
) {
  return getResend().emails.send({
    from,
    to,
    subject: `${supplierCompany} completed supplier onboarding`,
    html: emailShell(
      "Supplier onboarding complete",
      `<p>${buyerName}, ${supplierCompany} has submitted business details, banking preferences, and required documents.</p>`,
    ),
  });
}

export async function sendWelcomeEmail(to: string, buyerName: string) {
  return getResend().emails.send({
    from,
    to,
    subject: "Welcome to Supplier Onboarding",
    html: emailShell(
      "Welcome to Supplier Onboarding",
      `<p>${buyerName}, your buyer workspace is ready. Add a supplier to send your first secure onboarding invitation.</p>`,
    ),
  });
}
