// Branded HTML email (same blue look as the app). Table-based layout with inline styles, because
// that is what Gmail / Outlook render reliably. The logo is attached inline as cid:logo by mailer.js.

const BRAND = "#2A5BDB";
const FONT = "'Segoe UI',Roboto,'Helvetica Neue',Helvetica,Arial,sans-serif";
const SEVERITY = {
  CRITICAL: { label: "Critical", bg: "#FDECEC", fg: "#C62828" },
  ALERT: { label: "Critical", bg: "#FDECEC", fg: "#C62828" },
  WARNING: { label: "Warning", bg: "#FFF4DB", fg: "#9A6700" },
  SUCCESS: { label: "Good news", bg: "#E6F8EF", fg: "#1E7A46" },
  INFO: { label: "Info", bg: "#EEF4FF", fg: BRAND },
};

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/**
 * @param {object} o
 * @param {string} o.title       big heading
 * @param {string} o.message     one or two sentences
 * @param {string} [o.severity]  CRITICAL | ALERT | WARNING | SUCCESS | INFO
 * @param {Array<[string,string]>} [o.details]  key / value rows
 * @param {{label:string, url:string}} [o.button]
 * @param {string} [o.footer]    why the person gets this email
 * @returns {{html: string, text: string}}
 */
export function renderEmail({ title, message, severity = "INFO", details = [], button, footer }) {
  const sev = SEVERITY[String(severity).toUpperCase()] || SEVERITY.INFO;
  const rows = details
    .map(
      ([k, v]) => `
        <tr>
          <td style="padding:8px 0;color:#8A94A6;font-size:13px;width:40%;vertical-align:top">${esc(k)}</td>
          <td style="padding:8px 0;color:#2B3445;font-size:13px;font-weight:600">${esc(v)}</td>
        </tr>`,
    )
    .join("");

  const html = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:#F2F5FA;font-family:${FONT}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F2F5FA;padding:24px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;font-family:${FONT};background:#FFFFFF;border-radius:18px;overflow:hidden;box-shadow:0 8px 24px rgba(42,91,219,0.12)">
        <tr>
          <td style="background:${BRAND};background-image:linear-gradient(135deg,#2A5BDB,#4A8BF0);padding:22px 28px">
            <table role="presentation" cellpadding="0" cellspacing="0"><tr>
              <td style="background:#FFFFFF;border-radius:12px;padding:6px;line-height:0"><img src="cid:logo" width="36" height="36" alt="Lanka-Link" style="display:block"></td>
              <td style="padding-left:12px;color:#FFFFFF;font-size:18px;font-weight:700">Lanka-Link</td>
            </tr></table>
          </td>
        </tr>
        <tr>
          <td style="padding:28px">
            <span style="display:inline-block;background:${sev.bg};color:${sev.fg};font-size:12px;font-weight:700;padding:4px 12px;border-radius:999px">${esc(sev.label)}</span>
            <h1 style="margin:14px 0 8px;color:#2B3445;font-size:22px;line-height:1.3">${esc(title)}</h1>
            <p style="margin:0;color:#5B6478;font-size:15px;line-height:1.6">${esc(message)}</p>
            ${rows ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:18px;border-top:1px solid #E3E8F0">${rows}</table>` : ""}
            ${
              button
                ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:24px"><tr><td style="border-radius:999px;background:${BRAND}">
                     <a href="${esc(button.url)}" style="display:inline-block;padding:12px 26px;color:#FFFFFF;font-size:14px;font-weight:700;text-decoration:none;border-radius:999px">${esc(button.label)}</a>
                   </td></tr></table>`
                : ""
            }
          </td>
        </tr>
        <tr>
          <td style="padding:18px 28px;background:#F7F9FD;color:#8A94A6;font-size:12px;line-height:1.6">
            ${footer ? `${esc(footer)}<br>` : ""}Lanka-Link · Smart Merchant Support Platform
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  // plain-text version for mail apps that don't show HTML
  const text = [
    `[${sev.label}] ${title}`,
    "",
    message,
    ...(details.length ? ["", ...details.map(([k, v]) => `${k}: ${v}`)] : []),
    ...(button ? ["", `${button.label}: ${button.url}`] : []),
    "",
    footer || "",
    "Lanka-Link · Smart Merchant Support Platform",
  ].join("\n");

  return { html, text };
}
