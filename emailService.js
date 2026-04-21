// emailService.mjs
import { resolve } from "path";
import { logger } from "../utils/logger.js";

try {
  const rootDir = resolve(process.cwd(), "..");
  const dotenv = await import("dotenv");
  dotenv.config({ path: resolve(rootDir, ".env.dev") });
} catch (e) {
  // dotenv not available, assume env vars are set (Heroku/Prod)
}

// Lazy-loaded googleapis reference; only imported on first actual use
let _google = null;
const getGoogle = async () => {
  if (!_google) {
    const { google } = await import("googleapis");
    _google = google;
  }
  return _google;
};

export default class EmailService {
  constructor() {
    try {
      if (process.env.NODE_ENV === "development" && process.env.EMAIL_TESTING !== "true") return null;
      this.serviceAccountEmail = process.env.GCP_SA_EMAIL;
      this.delegationUser = process.env.DELEGATION_USER;
      this.sendAsAlias = process.env.SEND_AS_ALIAS;
      this._initialized = false;
    } catch (error) {
      logger.error("Failed to initialize EmailService:", error);
      throw new Error("EmailService initialization failed: " + error.message);
    }
  }

  // Deferred auth/gmail setup — only runs when email is actually sent
  async _ensureGoogleClient() {
    if (this._initialized) return;
    const google = await getGoogle();

    const authConfig = {
      email: this.serviceAccountEmail,
      key: this.formatPrivateKey(process.env.GCP_SA_PRIVATE_KEY),
      scopes: [
        "https://www.googleapis.com/auth/gmail.send",
        "https://www.googleapis.com/auth/gmail.settings.basic",
      ],
      subject: this.delegationUser,
    };

    this.jwt = new google.auth.JWT(authConfig);
    this.gmail = google.gmail({ version: "v1", auth: this.jwt });
    this._initialized = true;
  }

  // Format private key with proper PEM headers/footers
  formatPrivateKey(keyString) {
    if (!keyString) {
      throw new Error("Private key is required");
    }

    // Clean the key string and handle escaped newlines
    let cleanKey = keyString.replace(/\\n/g, "\n").trim();

    // If key already has PEM headers, return as-is
    if (cleanKey.includes("-----BEGIN") && cleanKey.includes("-----END")) {
      return cleanKey;
    }

    // Remove any existing whitespace and format as PEM
    const keyContent = cleanKey.replace(/\s/g, "");

    // Split into 64-character lines (standard PEM format)
    const formattedContent =
      keyContent.match(/.{1,64}/g)?.join("\n") || keyContent;

    // Return properly formatted PEM key
    return `-----BEGIN PRIVATE KEY-----\n${formattedContent}\n-----END PRIVATE KEY-----`;
  }

  // Utility: URL-safe base64
  encodeMessage(str) {
    return Buffer.from(str)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  }

  // Split base64 content to standard line length
  chunkBase64(value = "") {
    return String(value).match(/.{1,76}/g)?.join("\r\n") || "";
  }

  // Build professional MIME email with anti-spam headers
  buildMime({ from, to, subject, body, replyTo, bcc, attachments = [] }) {
    const messageId = `<${Date.now()}.${Math.random()
      .toString(36)
      .substring(2)}@jadepuma.com>`;
    const currentDate = new Date().toUTCString();
    const replyToHeader = replyTo || this.sendAsAlias;
    const bccHeader = bcc ? String(bcc) : "";

    // Enhanced HTML body with proper structure
    const htmlBody = this.buildHTMLBody(body, subject);
    const baseHeaders = [
      `From: ${from}`,
      `Sender: ${this.sendAsAlias}`,
      `Reply-To: ${replyToHeader}`,
      `To: ${to}`,
      `Subject: ${subject}`,
      `Date: ${currentDate}`,
      `Message-ID: ${messageId}`,
      `Return-Path: ${this.sendAsAlias}`,
      "MIME-Version: 1.0",
      `X-Mailer: JadePuma Datify v1.0`,
      `X-Originating-IP: [127.0.0.1]`,
      `X-Priority: 3`,
      `X-MSMail-Priority: Normal`,
      `Importance: Normal`,
      `List-Unsubscribe: <mailto:unsubscribe@jadepuma.com>`,
      `List-Id: JadePuma Alerts <alerts.jadepuma.com>`,
    ];

    if (bccHeader) {
      baseHeaders.splice(4, 0, `Bcc: ${bccHeader}`);
    }

    if (!attachments.length) {
      return [
        ...baseHeaders,
        'Content-Type: text/html; charset="UTF-8"',
        "Content-Transfer-Encoding: quoted-printable",
        "",
        htmlBody,
      ].join("\r\n");
    }

    const boundary = `jp_boundary_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const parts = [
      ...baseHeaders,
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      "",
      `--${boundary}`,
      'Content-Type: text/html; charset="UTF-8"',
      "Content-Transfer-Encoding: quoted-printable",
      "",
      htmlBody,
    ];

    attachments.forEach((attachment) => {
      const filename = attachment?.filename || "attachment";
      const contentType = attachment?.contentType || "application/octet-stream";
      const contentBase64 = this.chunkBase64(attachment?.contentBase64 || "");
      parts.push(
        `--${boundary}`,
        `Content-Type: ${contentType}; name="${filename}"`,
        "Content-Transfer-Encoding: base64",
        `Content-Disposition: attachment; filename="${filename}"`,
        "",
        contentBase64
      );
    });

    parts.push(`--${boundary}--`);
    return parts.join("\r\n");
  }

  // Build properly formatted HTML email body
  buildHTMLBody(content, subject) {
    // return `<!DOCTYPE html>
    //   <html lang="en">
    //   <head>
    //       <meta charset="UTF-8">
    //       <meta name="viewport" content="width=device-width, initial-scale=1.0">
    //       <title>JadePuma Alert</title>
    //       <style>
    //           body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; }
    //           .container { max-width: 600px; margin: 0 auto; background: #fff; }
    //           .header { background: #f8f9fa; padding: 20px; border-bottom: 2px solid #dee2e6; }
    //           .content { padding: 20px; }
    //           .footer { background: #f8f9fa; padding: 15px; border-top: 1px solid #dee2e6; font-size: 12px; color: #666; }
    //           .logo { font-size: 24px; font-weight: bold; color: #007bff; }
    //       </style>
    //   </head>
    //   <body>
    //       <div class="container">
    //           <div class="header">
    //               <table style="width: 100%;">
    //                   <tr>
    //                       <td style="vertical-align: middle;">
    //                           <img src="https://jadepuma.com/cdn/shop/files/JadePuma-logo_200x.svg?v=1682267029" alt="JadePuma" style="width: 40px; height: 40px; border-radius: 50%; margin-right: 15px;" />
    //                       </td>
    //                       <td style="vertical-align: middle;">
    //                           <div class="logo">JadePuma</div>
    //                           <div style="font-size: 14px; color: #666; margin-top: 5px;">Product Management Alert</div>
    //                       </td>
    //                   </tr>
    //               </table>
    //           </div>
    //           <div class="content">
    //               ${content}
    //           </div>
    //           <div class="footer">
    //               <p>This is an automated message from JadePuma.<br>
    //               If you no longer wish to receive these alerts, please contact <a href="mailto:support@jadepuma.com">support@jadepuma.com</a></p>
    //               <p><strong>JadePuma Apps LLC</strong><br>
    //               Datify</p>
    //           </div>
    //       </div>
    //   </body>
    //   </html>`;

    return `<!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${subject}</title>
          <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; }
              .container { max-width: 600px; margin: 0 auto; background: #fff; }
              .header { background: #f8f9fa; padding: 20px; border-bottom: 2px solid #dee2e6; }
              .content { padding: 20px; }
              .footer { background: #f8f9fa; padding: 15px; border-top: 1px solid #dee2e6; font-size: 12px; color: #666; }
              .logo { font-size: 24px; font-weight: bold; color: #007bff; }
          </style>
      </head>
      <body>
              <div class="content">
                  ${content}
              </div>
          </div>
      </body>
      </html>`;
  }

  // List current send-as aliases for debugging
  async listAliases() {
    try {
      await this._ensureGoogleClient();
      const sendAsResponse = await this.gmail.users.settings.sendAs.list({
        userId: "me",
      });

      const existingAliases = sendAsResponse.data.sendAs || [];
      logger.debug("Current send-as aliases:", existingAliases.map((a) => ({
        email: a.sendAsEmail,
        verified: a.verificationStatus,
        isDefault: a.isDefault,
      })));

      return existingAliases;
    } catch (error) {
      logger.warn("Failed to list aliases:", error.message);
      return [];
    }
  }

  // Ensure the alias is configured in Gmail settings
  async ensureAliasConfigured() {
    try {
      logger.debug(`Checking if alias ${this.sendAsAlias} is configured`);

      const existingAliases = await this.listAliases();
      const aliasExists = existingAliases.find(
        (alias) => alias.sendAsEmail === this.sendAsAlias
      );

      if (aliasExists) {
        logger.debug(`Alias ${this.sendAsAlias} is configured`, {
          status: aliasExists.verificationStatus,
          isDefault: aliasExists.isDefault,
        });

        if (aliasExists.verificationStatus !== "accepted") {
          logger.warn(`Alias ${this.sendAsAlias} verification status: ${aliasExists.verificationStatus}`);
        }
        return aliasExists;
      }

      logger.info(`Creating alias ${this.sendAsAlias}`);

      const createResponse = await this.gmail.users.settings.sendAs.create({
        userId: "me",
        requestBody: {
          sendAsEmail: this.sendAsAlias,
          displayName: "JadePuma",
          isDefault: false,
          treatAsAlias: true,
        },
      });

      logger.info(`Alias ${this.sendAsAlias} created successfully`);
      return createResponse.data;
    } catch (error) {
      logger.warn(`Failed to configure alias ${this.sendAsAlias}:`, error.message);

      if (
        error.message.includes("Insufficient Permission") ||
        error.message.includes("forbidden")
      ) {
        logger.warn(`Manual setup required: Go to Gmail settings for ${this.delegationUser}, add ${this.sendAsAlias} as a "Send mail as" address, and ensure the alias is verified`);
      }

      return null;
    }
  }

  /**
   * Send an email to one or more recipients.
   * @param {string|string[]} to - Single email or array of emails.
   * @param {string} subject
   * @param {string} body
   */
  async sendEmail(to, subject, body) {
    return this.sendEmailInternal(to, subject, body);
  }

  /**
   * Send an email with an optional Reply-To header.
   * @param {string|string[]} to - Single email or array of emails.
   * @param {string} subject
   * @param {string} body
   * @param {string} replyTo
   */
  async sendEmailWithReplyTo(to, subject, body, replyTo) {
    return this.sendEmailInternal(to, subject, body, { replyTo });
  }

  async sendEmailWithOptions(to, subject, body, options = {}) {
    return this.sendEmailInternal(to, subject, body, options);
  }

  async sendEmailInternal(to, subject, body, options = {}) {
    try {
      if (process.env.NODE_ENV === "development" && process.env.EMAIL_TESTING !== "true") return null;
      await this._ensureGoogleClient();
      // Accepts string or array for 'to'
      // Normalize to array for validation and joining
      let recipients;
      if (Array.isArray(to)) {
        recipients = to.filter(Boolean); // Remove falsy values
      } else if (typeof to === "string") {
        // Split comma-separated string, trim whitespace
        recipients = to.split(",").map(e => e.trim()).filter(Boolean);
      } else {
        recipients = [];
      }

      // Validate
      if (!recipients.length || !subject || !body) {
        throw new Error(
          "Missing required email parameters: to, subject, or body"
        );
      }

      // Join recipients for RFC2822 "To" header (comma-separated)
      const toHeader = recipients.join(", ");

      logger.debug("Attempting to send email", {
        to: toHeader,
        subject,
        delegationUser: this?.delegationUser,
        sendAsAlias: this.sendAsAlias,
      });

      // Ensure alias is set up
      await this.ensureAliasConfigured();

      // Build email with proper alias configuration
      const from = `JadePuma <${this.sendAsAlias}>`;
      const raw = this.encodeMessage(
        this.buildMime({
          from,
          to: toHeader,
          subject,
          body,
          replyTo: options?.replyTo,
          bcc: options?.bcc,
          attachments: options?.attachments,
        })
      );

      // Send the message
      const res = await this.gmail.users.messages.send({
        userId: "me",
        requestBody: { raw },
      });

      logger.info(`Email sent successfully from ${this.sendAsAlias}`, { messageId: res.data.id });
      return res.data;
    } catch (error) {
      logger.error("Email sending failed:", {
        error: error.message,
        stack: error.stack,
        to,
        subject: subject?.substring(0, 50) + "...",
      });

      // Gmail API error handling (unchanged)
      if (error.message.includes("Precondition check failed")) {
        throw new Error(`Gmail API Error: Domain-wide delegation not properly configured.`);
      }

      if (error.message.includes("invalid_grant")) {
        throw new Error(`Gmail Authentication Error: ${error.message}`);
      }

      // Re-throw with more context for the caller
      throw new Error(`Email sending failed: ${error.message}`);
    }
  }
}
