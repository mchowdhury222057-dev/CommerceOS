import { sendEmail } from "../lib/email.js";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@commerceos.dev";

// Simple table-based layout (not flexbox/grid) - email clients have poor
// CSS support, inline styles + tables is the only pattern that renders
// consistently across them. Indigo accent (#4F46E5) matches the rest of
// the platform's brand.
function emailShell(bodyHtml: string): string {
  return `
  <div style="font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif; background-color: #F8FAFC; padding: 32px 16px;">
    <table role="presentation" width="100%" style="max-width: 480px; margin: 0 auto; background: #FFFFFF; border-radius: 12px; overflow: hidden; border: 1px solid #E2E8F0;">
      <tr>
        <td style="background-color: #0F172A; padding: 20px 28px;">
          <span style="color: #FFFFFF; font-size: 16px; font-weight: 700;">CommerceOS</span>
        </td>
      </tr>
      <tr>
        <td style="padding: 28px;">
          ${bodyHtml}
        </td>
      </tr>
      <tr>
        <td style="padding: 16px 28px; border-top: 1px solid #E2E8F0;">
          <span style="color: #94A3B8; font-size: 12px;">This is an automated message from CommerceOS. Please do not reply to this email.</span>
        </td>
      </tr>
    </table>
  </div>`;
}

function button(label: string, href: string): string {
  return `<a href="${href}" style="display: inline-block; background-color: #4F46E5; color: #FFFFFF; text-decoration: none; font-size: 14px; font-weight: 600; padding: 12px 24px; border-radius: 8px; margin-top: 16px;">${label}</a>`;
}

// Section 8 - explains pending status, links to the secure verification
// page only. No sensitive info requested via reply.
export async function sendVerificationRequiredEmail(to: string, storeName: string, verificationLink: string): Promise<void> {
  await sendEmail({
    to,
    subject: "CommerceOS — Complete Your Store Verification",
    html: emailShell(`
      <h1 style="font-size: 18px; color: #0F172A; margin: 0 0 12px;">Welcome to CommerceOS, ${storeName}!</h1>
      <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 8px;">
        Your store account has been created and is currently <strong>pending approval</strong>. Before a Master
        Administrator can review your application, we need a few more details to verify your business.
      </p>
      <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 8px;">
        Click below to complete your verification. This link is unique to you and expires soon, so please
        complete it in one sitting.
      </p>
      ${button("Complete Verification", verificationLink)}
      <p style="font-size: 12px; color: #94A3B8; margin-top: 20px;">
        We will never ask you to reply to this email with sensitive information such as your NID number or documents.
      </p>
    `),
  });
}

// Section 13 - to the Super Admin, no NID/document info in the body itself.
export async function sendAdminVerificationSubmittedEmail(input: {
  storeName: string;
  ownerName: string;
  ownerEmail: string;
  submittedAt: Date;
  reviewLink: string;
}): Promise<void> {
  await sendEmail({
    to: ADMIN_EMAIL,
    subject: "CommerceOS — New Store Verification Requires Review",
    html: emailShell(`
      <h1 style="font-size: 18px; color: #0F172A; margin: 0 0 12px;">New Verification Application</h1>
      <table role="presentation" style="font-size: 14px; color: #475569; margin-bottom: 8px;">
        <tr><td style="padding: 2px 12px 2px 0; color: #94A3B8;">Store</td><td style="font-weight: 600; color: #0F172A;">${input.storeName}</td></tr>
        <tr><td style="padding: 2px 12px 2px 0; color: #94A3B8;">Owner</td><td>${input.ownerName}</td></tr>
        <tr><td style="padding: 2px 12px 2px 0; color: #94A3B8;">Email</td><td>${input.ownerEmail}</td></tr>
        <tr><td style="padding: 2px 12px 2px 0; color: #94A3B8;">Submitted</td><td>${input.submittedAt.toLocaleString()}</td></tr>
      </table>
      ${button("Review Application", input.reviewLink)}
    `),
  });
}

// Section 16-17 - Store Website + Dashboard links, "View My Store" /
// "Open Dashboard" buttons.
export async function sendStoreApprovalEmail(to: string, storeName: string, storefrontUrl: string, dashboardUrl: string): Promise<void> {
  await sendEmail({
    to,
    subject: "CommerceOS — Your Store Has Been Approved!",
    html: emailShell(`
      <h1 style="font-size: 18px; color: #0F172A; margin: 0 0 12px;">🎉 ${storeName} is now live!</h1>
      <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 16px;">
        Great news - your store has been approved by our team. Your storefront is now live and your dashboard is ready to use.
      </p>
      ${button("View My Store", storefrontUrl)}
      &nbsp;&nbsp;
      ${button("Open Dashboard", dashboardUrl)}
    `),
  });
}

// Section 20 - reason included, support contact.
export async function sendStoreRejectionEmail(to: string, storeName: string, reason: string): Promise<void> {
  await sendEmail({
    to,
    subject: "CommerceOS — Store Application Update",
    html: emailShell(`
      <h1 style="font-size: 18px; color: #0F172A; margin: 0 0 12px;">Your application for ${storeName} was not approved</h1>
      <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 8px;">
        After reviewing your verification application, we're unable to approve your store at this time.
      </p>
      <p style="font-size: 14px; color: #0F172A; background: #FEF2F2; border-radius: 8px; padding: 12px; line-height: 1.6;">${reason}</p>
      <p style="font-size: 14px; color: #475569; line-height: 1.6; margin-top: 12px;">
        If you believe this is a mistake, please contact support at ${ADMIN_EMAIL}.
      </p>
    `),
  });
}

// Section 21 - reason included, support contact.
export async function sendStoreSuspensionEmail(to: string, storeName: string, reason: string): Promise<void> {
  await sendEmail({
    to,
    subject: "CommerceOS — Your Store Has Been Suspended",
    html: emailShell(`
      <h1 style="font-size: 18px; color: #0F172A; margin: 0 0 12px;">${storeName} has been suspended</h1>
      <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 8px;">
        Your store's dashboard and storefront are temporarily unavailable.
      </p>
      <p style="font-size: 14px; color: #0F172A; background: #FEF2F2; border-radius: 8px; padding: 12px; line-height: 1.6;">${reason}</p>
      <p style="font-size: 14px; color: #475569; line-height: 1.6; margin-top: 12px;">
        Please contact support at ${ADMIN_EMAIL} to resolve this.
      </p>
    `),
  });
}

// Section 22 - store/dashboard links, since access is restored.
export async function sendStoreReactivationEmail(to: string, storeName: string, storefrontUrl: string, dashboardUrl: string): Promise<void> {
  await sendEmail({
    to,
    subject: "CommerceOS — Your Store Has Been Reactivated",
    html: emailShell(`
      <h1 style="font-size: 18px; color: #0F172A; margin: 0 0 12px;">${storeName} is back online</h1>
      <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 16px;">
        Your store has been reactivated. Your storefront and dashboard are available again.
      </p>
      ${button("View My Store", storefrontUrl)}
      &nbsp;&nbsp;
      ${button("Open Dashboard", dashboardUrl)}
    `),
  });
}
