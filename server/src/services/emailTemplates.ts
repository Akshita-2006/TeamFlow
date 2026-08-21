type EmailTemplate = {
  subject: string;
  text: string;
  html: string;
};

type ActionTemplateInput = {
  title: string;
  greeting: string;
  intro: string;
  details?: string[];
  actionLabel: string;
  actionUrl: string;
  footer: string[];
};

const brandName = "TeamFlow";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function textEmail(input: ActionTemplateInput) {
  return [
    input.greeting,
    "",
    input.intro,
    ...(input.details?.length ? ["", ...input.details] : []),
    "",
    `${input.actionLabel}:`,
    input.actionUrl,
    "",
    ...input.footer,
    "",
    brandName,
  ].join("\n");
}

function actionEmail(input: ActionTemplateInput): Omit<EmailTemplate, "subject"> {
  const details = input.details
    ?.map((item) => `<p style="margin:0 0 12px;color:#4f5f58;line-height:1.6;">${escapeHtml(item)}</p>`)
    .join("");
  const footer = input.footer
    .map((item) => `<p style="margin:0 0 8px;color:#6f7b73;font-size:13px;line-height:1.5;">${escapeHtml(item)}</p>`)
    .join("");
  const html = `
<!doctype html>
<html>
  <body style="margin:0;background:#f8f5ec;font-family:Arial,Helvetica,sans-serif;color:#263333;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8f5ec;padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#fffdf8;border:1px solid #ded8c9;border-radius:8px;overflow:hidden;">
            <tr>
              <td style="padding:28px 28px 18px;border-bottom:1px solid #ede7da;">
                <p style="margin:0 0 8px;color:#507f8a;font-size:13px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;">${brandName}</p>
                <h1 style="margin:0;font-size:26px;line-height:1.2;color:#263333;">${escapeHtml(input.title)}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <p style="margin:0 0 16px;color:#263333;font-size:16px;line-height:1.6;">${escapeHtml(input.greeting)}</p>
                <p style="margin:0 0 16px;color:#4f5f58;line-height:1.6;">${escapeHtml(input.intro)}</p>
                ${details ?? ""}
                <p style="margin:24px 0;">
                  <a href="${escapeHtml(input.actionUrl)}" style="display:inline-block;background:#507f8a;color:#ffffff;text-decoration:none;font-weight:700;border-radius:6px;padding:12px 18px;">${escapeHtml(input.actionLabel)}</a>
                </p>
                <p style="margin:0 0 20px;color:#6f7b73;font-size:13px;line-height:1.5;word-break:break-all;">${escapeHtml(input.actionUrl)}</p>
                ${footer}
                <p style="margin:22px 0 0;color:#263333;font-weight:700;">${brandName}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`.trim();
  return { text: textEmail(input), html };
}

export function passwordResetEmail(input: { name: string; resetUrl: string }): EmailTemplate {
  return {
    subject: "Reset your TeamFlow password",
    ...actionEmail({
      title: "Reset your password",
      greeting: `Hi ${input.name},`,
      intro: "We received a request to reset the password for your TeamFlow account.",
      actionLabel: "Choose a new password",
      actionUrl: input.resetUrl,
      footer: [
        "This link expires in 30 minutes.",
        "If you did not request this, you can safely ignore this email and your password will stay the same.",
      ],
    }),
  };
}

export function workspaceInviteEmail(input: { workspaceName: string; role: string; inviteUrl: string }): EmailTemplate {
  return {
    subject: `${input.workspaceName} invited you to TeamFlow`,
    ...actionEmail({
      title: "You are invited to TeamFlow",
      greeting: "Hi there,",
      intro: `You have been invited to join ${input.workspaceName} on TeamFlow as ${input.role}.`,
      details: ["TeamFlow helps your project team manage tasks, owners, deadlines, comments and blockers in one workspace."],
      actionLabel: "Accept invite",
      actionUrl: input.inviteUrl,
      footer: [
        "If you do not have an account yet, register with this same email first, then open the invite link again.",
        "This invite expires in 7 days.",
      ],
    }),
  };
}

export function workspaceMemberEmail(input: { name: string; workspaceName: string; role: string; appUrl: string; roleChanged: boolean }): EmailTemplate {
  return {
    subject: input.roleChanged ? `Your role changed in ${input.workspaceName}` : `You were added to ${input.workspaceName}`,
    ...actionEmail({
      title: input.roleChanged ? "Your workspace role changed" : "You were added to a workspace",
      greeting: `Hi ${input.name},`,
      intro: input.roleChanged
        ? `Your role in ${input.workspaceName} has been updated to ${input.role}.`
        : `You have been added to ${input.workspaceName} on TeamFlow as ${input.role}.`,
      details: input.roleChanged ? undefined : ["You can now open the workspace, view projects you have access to, and collaborate on assigned work."],
      actionLabel: "Open workspace",
      actionUrl: input.appUrl,
      footer: [],
    }),
  };
}
