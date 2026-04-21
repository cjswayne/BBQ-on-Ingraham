import { logger } from "../utils/logger.js";

let googleReference = null;

const getGoogle = async () => {
  if (!googleReference) {
    const { google } = await import("googleapis");
    googleReference = google;
  }

  return googleReference;
};

const formatPrivateKey = (keyString = "") => {
  const cleanKey = String(keyString).replace(/\\n/g, "\n").trim();

  if (!cleanKey) {
    throw new Error("GCP_SA_PRIVATE_KEY is required");
  }

  if (cleanKey.includes("-----BEGIN") && cleanKey.includes("-----END")) {
    return cleanKey;
  }

  return `-----BEGIN PRIVATE KEY-----\n${cleanKey}\n-----END PRIVATE KEY-----`;
};

const encodeMessage = (value) => {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
};

const createHtmlBody = (payload) => {
  const {
    attendeeName,
    phone,
    food,
    guestCount,
    eventDateLabel,
    profilePhotoUrl,
    isGuest
  } = payload;

  return `<!DOCTYPE html>
  <html lang="en">
    <body style="font-family: Arial, sans-serif; color: #3b3834;">
      <h2 style="color: #2E6F95;">New BBQ On Ingraham RSVP</h2>
      <p>A new RSVP was submitted for <strong>${eventDateLabel}</strong>.</p>
      <ul>
        <li><strong>Name:</strong> ${attendeeName}</li>
        <li><strong>Phone:</strong> ${phone || "Guest RSVP"}</li>
        <li><strong>Food:</strong> ${food}</li>
        <li><strong>Guest count:</strong> ${guestCount}</li>
        <li><strong>Authenticated:</strong> ${isGuest ? "No" : "Yes"}</li>
        <li><strong>Profile photo:</strong> ${profilePhotoUrl || "Not provided"}</li>
      </ul>
    </body>
  </html>`;
};

class EmailService {
  constructor() {
    this.serviceAccountEmail = process.env.GCP_SA_EMAIL;
    this.delegationUser = process.env.DELEGATION_USER;
    this.sendAsAlias = process.env.SEND_AS_ALIAS;
    this.isReady = false;
    this.gmail = null;
  }

  async ensureReady() {
    if (this.isReady) {
      return;
    }

    if (
      !this.serviceAccountEmail ||
      !this.delegationUser ||
      !this.sendAsAlias ||
      !process.env.GCP_SA_PRIVATE_KEY
    ) {
      throw new Error("Email service is not fully configured");
    }

    const google = await getGoogle();
    const auth = new google.auth.JWT({
      email: this.serviceAccountEmail,
      key: formatPrivateKey(process.env.GCP_SA_PRIVATE_KEY),
      scopes: ["https://www.googleapis.com/auth/gmail.send"],
      subject: this.delegationUser
    });

    this.gmail = google.gmail({ version: "v1", auth });
    this.isReady = true;
  }

  async sendEmail(to, subject, htmlBody) {
    await this.ensureReady();

    const rawMessage = encodeMessage(
      [
        `From: BBQ On Ingraham <${this.sendAsAlias}>`,
        `To: ${to.join(", ")}`,
        `Subject: ${subject}`,
        'Content-Type: text/html; charset="UTF-8"',
        "MIME-Version: 1.0",
        "",
        htmlBody
      ].join("\r\n")
    );

    await this.gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: rawMessage
      }
    });
  }

  async sendRSVPNotification(rsvpData, adminEmails) {
    const recipients = adminEmails.filter(Boolean);

    if (!recipients.length) {
      return;
    }

    try {
      const htmlBody = createHtmlBody(rsvpData);
      await this.sendEmail(
        recipients,
        `New RSVP: ${rsvpData.attendeeName} for ${rsvpData.eventDateLabel}`,
        htmlBody
      );
    } catch (error) {
      logger.error("Failed to send RSVP notification email", error);
      throw error;
    }
  }
}

export const emailService = new EmailService();
