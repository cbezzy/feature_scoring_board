/**
 * Mailgun Messages API (US region).
 * https://documentation.mailgun.com/en/latest/api-sending.html#messages
 */

function isConfigured() {
  return Boolean(
    process.env.MAILGUN_API_KEY &&
      process.env.MAILGUN_DOMAIN &&
      process.env.MAILGUN_FROM
  );
}

/**
 * @param {{ id: number, code: string, title?: string | null }} feature
 * @param {string[]} recipientEmails — deduped, non-empty
 */
async function sendNewFeatureNotification(feature, recipientEmails) {
  if (!isConfigured()) {
    console.warn("mailgun: skipping send (MAILGUN_* env not set)");
    return;
  }
  if (!recipientEmails.length) {
    console.warn("mailgun: no recipients for new feature notification");
    return;
  }

  const domain = process.env.MAILGUN_DOMAIN;
  const from = process.env.MAILGUN_FROM;
  const apiKey = process.env.MAILGUN_API_KEY;
  const baseUrl = process.env.APP_PUBLIC_URL || "";

  const title = feature.title || "New feature request";
  const subject = `[Feature Board] New feature: ${feature.code} — ${title}`;
  const viewLink = baseUrl
    ? `${baseUrl.replace(/\/$/, "")}/?feature=${feature.id}`
    : "";

  const textLines = [
    `Internal Feature Board — a new feature idea was added.`,
    `Please open it and add your scores so we get a full team view.`,
    ``,
    `Code: ${feature.code}`,
    `Title: ${title}`,
    viewLink ? `Open: ${viewLink}` : null,
  ].filter(Boolean);

  const html = buildNewFeatureEmailHtml(feature.code, title, viewLink);

  const body = new URLSearchParams();
  body.set("from", from);
  body.set("subject", subject);
  body.set("html", html);
  body.set("text", textLines.join("\n"));

  const first = recipientEmails[0];
  const rest = recipientEmails.slice(1);
  body.set("to", first);
  for (const addr of rest) {
    body.append("bcc", addr);
  }

  const auth = Buffer.from(`api:${apiKey}`).toString("base64");
  const url = `https://api.mailgun.net/v3/${encodeURIComponent(domain)}/messages`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Mailgun ${res.status}: ${errText.slice(0, 500)}`);
  }
}

/**
 * Nudge teammates who have not finished scoring after someone completes all questions.
 *
 * @param {{ id: number, code: string, title?: string | null }} feature
 * @param {string} completedByName
 * @param {string[]} recipientEmails — deduped; incomplete scorers only (non-empty)
 */
async function sendScoringCompleteNudge(
  feature,
  completedByName,
  recipientEmails
) {
  if (!isConfigured()) {
    console.warn("mailgun: skipping send (MAILGUN_* env not set)");
    return;
  }
  if (!recipientEmails.length) {
    return;
  }

  const domain = process.env.MAILGUN_DOMAIN;
  const from = process.env.MAILGUN_FROM;
  const apiKey = process.env.MAILGUN_API_KEY;
  const baseUrl = process.env.APP_PUBLIC_URL || "";

  const title = feature.title || "Feature request";
  const who = completedByName || "A teammate";
  const subject = `[Feature Board] Scoring complete: ${feature.code} — ${who} finished; add yours`;
  const viewLink = baseUrl
    ? `${baseUrl.replace(/\/$/, "")}/?feature=${feature.id}`
    : "";

  const textLines = [
    `${who} finished scoring every question for this feature.`,
    `Your scores are still needed if you have not completed them.`,
    ``,
    `Code: ${feature.code}`,
    `Title: ${title}`,
    viewLink ? `Open: ${viewLink}` : null,
  ].filter(Boolean);

  const html = buildScoringCompleteNudgeHtml(who, feature.code, title, viewLink);

  const body = new URLSearchParams();
  body.set("from", from);
  body.set("subject", subject);
  body.set("html", html);
  body.set("text", textLines.join("\n"));

  const first = recipientEmails[0];
  const rest = recipientEmails.slice(1);
  body.set("to", first);
  for (const addr of rest) {
    body.append("bcc", addr);
  }

  const auth = Buffer.from(`api:${apiKey}`).toString("base64");
  const url = `https://api.mailgun.net/v3/${encodeURIComponent(domain)}/messages`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Mailgun ${res.status}: ${errText.slice(0, 500)}`);
  }
}

function featureBoardOpenCtaBlock(viewLink) {
  if (!viewLink) {
    return `
  <p style="margin:20px 0 0;font-size:13px;line-height:1.5;color:#6b7280;">
    No direct link is available (APP_PUBLIC_URL is not set). Open the Feature Board from your usual internal bookmark and find this feature by code.
  </p>`;
  }
  const safeUrl = escapeHtml(viewLink);
  return `
  <table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0 0;">
    <tr>
      <td align="left" style="border-radius:6px;background-color:#2563eb;">
        <a href="${safeUrl}" style="display:inline-block;padding:12px 22px;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">Open in Feature Board &amp; score</a>
      </td>
    </tr>
  </table>`;
}

function featureBoardCodeTitleBlock(safeCode, safeTitle) {
  return `
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:22px 0 0;border-collapse:separate;">
              <tr>
                <td style="padding:14px 16px;background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;">
                  <p style="margin:0 0 6px;font-size:12px;line-height:1.4;color:#6b7280;">Code</p>
                  <p style="margin:0;font-size:14px;line-height:1.4;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-weight:600;color:#111827;">${safeCode}</p>
                  <p style="margin:12px 0 0;font-size:12px;line-height:1.4;color:#6b7280;">Title</p>
                  <p style="margin:4px 0 0;font-size:16px;line-height:1.45;font-weight:600;color:#111827;">${safeTitle}</p>
                </td>
              </tr>
            </table>`;
}

function buildNewFeatureEmailHtml(code, title, viewLink) {
  const safeCode = escapeHtml(code);
  const safeTitle = escapeHtml(title);

  return `
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0;padding:0;background-color:#f3f4f6;">
  <tr>
    <td align="center" style="padding:28px 14px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;border:1px solid #e5e7eb;border-radius:8px;background-color:#ffffff;">
        <tr>
          <td style="padding:28px 28px 24px;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
            <p style="margin:0 0 6px;font-size:12px;line-height:1.4;letter-spacing:0.02em;text-transform:uppercase;color:#6b7280;">Feature Board</p>
            <p style="margin:0 0 14px;font-size:22px;line-height:1.25;font-weight:600;color:#111827;">New feature idea — add your scores</p>
            <p style="margin:0;font-size:15px;line-height:1.55;color:#374151;">
              A teammate added this request. When you have a moment, open it in the board and complete the scoring questions so priorities reflect the whole team.
            </p>
            ${featureBoardCodeTitleBlock(safeCode, safeTitle)}
            ${featureBoardOpenCtaBlock(viewLink)}
            <p style="margin:28px 0 0;font-size:12px;line-height:1.45;color:#9ca3af;">Internal Feature Board · automated message</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`.trim();
}

/**
 * Daily digest: features this admin has never started scoring (matches UI "Your Scoring Todo").
 *
 * @param {string} adminEmail
 * @param {string} adminName
 * @param {{ id: number, code: string, title?: string | null, summary?: string | null }[]} features
 */
async function sendDailyScoringTodoReminder(adminEmail, adminName, features) {
  if (!isConfigured()) {
    console.warn("mailgun: skipping send (MAILGUN_* env not set)");
    return;
  }
  const email = String(adminEmail || "").trim();
  if (!email || !Array.isArray(features) || !features.length) {
    return;
  }

  const domain = process.env.MAILGUN_DOMAIN;
  const from = process.env.MAILGUN_FROM;
  const apiKey = process.env.MAILGUN_API_KEY;
  const baseUrl = process.env.APP_PUBLIC_URL || "";
  const n = features.length;
  const subject = `[Feature Board] Your scoring todo (${n})`;

  const greet = adminName?.trim() || "there";
  const textLines = [
    `Hi ${greet},`,
    ``,
    `You have ${n} feature request(s) you have not started scoring yet. Open the Feature Board and use the scoring tab for each:`,
    ``,
    ...features.map((f) => {
      const title = f.title || f.code;
      const link = baseUrl
        ? `${baseUrl.replace(/\/$/, "")}/?feature=${f.id}`
        : null;
      return link ? `${f.code} — ${title}\n${link}` : `${f.code} — ${title}`;
    }),
    ``,
    baseUrl
      ? `Board: ${baseUrl.replace(/\/$/, "")}`
      : "Set APP_PUBLIC_URL for one-click links in future emails.",
  ];

  const html = buildDailyScoringTodoHtml(greet, features, baseUrl);

  const body = new URLSearchParams();
  body.set("from", from);
  body.set("to", email);
  body.set("subject", subject);
  body.set("html", html);
  body.set("text", textLines.join("\n"));

  const auth = Buffer.from(`api:${apiKey}`).toString("base64");
  const url = `https://api.mailgun.net/v3/${encodeURIComponent(domain)}/messages`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Mailgun ${res.status}: ${errText.slice(0, 500)}`);
  }
}

function buildDailyScoringTodoHtml(greet, features, baseUrl) {
  const safeGreet = escapeHtml(greet);
  const root = baseUrl ? baseUrl.replace(/\/$/, "") : "";
  const items = features
    .map((f) => {
      const title = f.title || f.code;
      const safeCode = escapeHtml(f.code);
      const safeTitle = escapeHtml(title);
      const rawSummary = (f.summary || "").trim().replace(/\s+/g, " ");
      const truncated = rawSummary.length > 140;
      const oneLine = escapeHtml(rawSummary.slice(0, 140));
      const summaryBit =
        oneLine.length > 0
          ? `<p style="margin:6px 0 0;font-size:13px;line-height:1.45;color:#6b7280;">${oneLine}${truncated ? "…" : ""}</p>`
          : "";
      const href = root ? `${root}/?feature=${f.id}` : "";
      const linkBlock = href
        ? `<a href="${escapeHtml(href)}" style="display:inline-block;margin-top:10px;font-size:14px;font-weight:600;color:#2563eb;text-decoration:none;">Open in Feature Board →</a>`
        : `<p style="margin:10px 0 0;font-size:12px;color:#9ca3af;">Set APP_PUBLIC_URL for direct links.</p>`;
      return `
            <tr>
              <td style="padding:14px 16px;border:1px solid #e5e7eb;border-radius:6px;background:#f9fafb;">
                <p style="margin:0;font-size:12px;color:#6b7280;">${safeCode}</p>
                <p style="margin:4px 0 0;font-size:16px;font-weight:600;color:#111827;">${safeTitle}</p>
                ${summaryBit}
                ${linkBlock}
              </td>
            </tr>`;
    })
    .join(
      `<tr><td style="height:10px;padding:0;font-size:0;line-height:0;">&nbsp;</td></tr>`
    );

  return `
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0;padding:0;background-color:#f3f4f6;">
  <tr>
    <td align="center" style="padding:28px 14px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;border:1px solid #e5e7eb;border-radius:8px;background-color:#ffffff;">
        <tr>
          <td style="padding:28px 28px 24px;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
            <p style="margin:0 0 6px;font-size:12px;line-height:1.4;letter-spacing:0.02em;text-transform:uppercase;color:#6b7280;">Feature Board</p>
            <p style="margin:0 0 14px;font-size:22px;line-height:1.25;font-weight:600;color:#111827;">Your scoring todo (${features.length})</p>
            <p style="margin:0;font-size:15px;line-height:1.55;color:#374151;">
              Hi ${safeGreet} — these requests do not have any scores from you yet. When you can, open each one and add your first scores on the scoring tab (same list as the board sidebar).
            </p>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:22px 0 0;border-collapse:separate;">
              ${items}
            </table>
            <p style="margin:28px 0 0;font-size:12px;line-height:1.45;color:#9ca3af;">Internal Feature Board · automated daily reminder</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`.trim();
}

function buildScoringCompleteNudgeHtml(who, code, title, viewLink) {
  const safeWho = escapeHtml(who);
  const safeCode = escapeHtml(code);
  const safeTitle = escapeHtml(title);

  return `
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0;padding:0;background-color:#f3f4f6;">
  <tr>
    <td align="center" style="padding:28px 14px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;border:1px solid #e5e7eb;border-radius:8px;background-color:#ffffff;">
        <tr>
          <td style="padding:28px 28px 24px;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
            <p style="margin:0 0 6px;font-size:12px;line-height:1.4;letter-spacing:0.02em;text-transform:uppercase;color:#6b7280;">Feature Board</p>
            <p style="margin:0 0 14px;font-size:22px;line-height:1.25;font-weight:600;color:#111827;">Someone finished scoring — add yours</p>
            <p style="margin:0;font-size:15px;line-height:1.55;color:#374151;">
              <strong style="color:#111827;">${safeWho}</strong> finished every active scoring question for this feature. If you have not submitted your scores yet, open it and complete the scoring tab so the team rollup reflects everyone.
            </p>
            ${featureBoardCodeTitleBlock(safeCode, safeTitle)}
            ${featureBoardOpenCtaBlock(viewLink)}
            <p style="margin:28px 0 0;font-size:12px;line-height:1.45;color:#9ca3af;">Internal Feature Board · automated message</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`.trim();
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

module.exports = {
  sendNewFeatureNotification,
  sendScoringCompleteNudge,
  sendDailyScoringTodoReminder,
  isConfigured,
};
