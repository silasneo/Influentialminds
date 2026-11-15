import { Inject, Injectable, Logger } from "@nestjs/common";
import { CONFIG_TOKEN, type AppConfig } from "../config/configuration";

export interface LeadContact {
  name: string;
  email: string;
  consent: boolean;
  sourcePage: string | null;
}

export interface LeadMagnetDelivery {
  title: string;
  description: string | null;
  /** Absolute URL the recipient can click to download the asset. */
  downloadUrl: string | null;
  fileName: string | null;
}

export interface DeliveryOutcome {
  emailed: boolean;
  synced: boolean;
}

/**
 * Outbound email and contact-list sync. Implementations must never throw:
 * the lead has already been persisted by the time they are called, so a
 * provider outage must not turn a captured lead into a failed request.
 */
export interface MailProvider {
  readonly enabled: boolean;
  deliverLeadMagnet(
    contact: LeadContact,
    magnet: LeadMagnetDelivery | null
  ): Promise<DeliveryOutcome>;
}

export const MAIL_PROVIDER = "MAIL_PROVIDER";

/** Email is switched off; leads are still captured and exportable as CSV. */
@Injectable()
export class DisabledMailProvider implements MailProvider {
  readonly enabled = false;

  async deliverLeadMagnet(): Promise<DeliveryOutcome> {
    return { emailed: false, synced: false };
  }
}

/** Splits a single free-text name into the FNAME/LNAME pair Brevo expects. */
export function splitName(name: string): { first: string; last: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: "", last: "" };
  if (parts.length === 1) return { first: parts[0]!, last: "" };
  return { first: parts[0]!, last: parts.slice(1).join(" ") };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

@Injectable()
export class BrevoMailProvider implements MailProvider {
  readonly enabled = true;
  private readonly logger = new Logger(BrevoMailProvider.name);

  constructor(@Inject(CONFIG_TOKEN) private readonly config: AppConfig) {}

  async deliverLeadMagnet(
    contact: LeadContact,
    magnet: LeadMagnetDelivery | null
  ): Promise<DeliveryOutcome> {
    // The two calls are independent, so a failing list sync still lets the
    // download email through, and vice versa.
    const [email, sync] = await Promise.allSettled([
      this.sendEmail(contact, magnet),
      this.syncContact(contact),
    ]);

    return {
      emailed: email.status === "fulfilled" && email.value,
      synced: sync.status === "fulfilled" && sync.value,
    };
  }

  private async sendEmail(
    contact: LeadContact,
    magnet: LeadMagnetDelivery | null
  ): Promise<boolean> {
    const body: Record<string, unknown> = {
      sender: {
        name: this.config.BREVO_SENDER_NAME,
        email: this.config.BREVO_SENDER_EMAIL,
      },
      to: [{ email: contact.email, name: contact.name }],
      params: {
        name: contact.name,
        title: magnet?.title ?? "",
        downloadUrl: magnet?.downloadUrl ?? "",
      },
    };

    if (this.config.BREVO_REPLY_TO_EMAIL) {
      body.replyTo = { email: this.config.BREVO_REPLY_TO_EMAIL };
    }

    // A Brevo template carries its own subject and body, so only supply our
    // own HTML when no template is configured.
    if (this.config.BREVO_TEMPLATE_ID) {
      body.templateId = this.config.BREVO_TEMPLATE_ID;
    } else {
      body.subject = magnet?.title
        ? `Your download: ${magnet.title}`
        : "Welcome to Influential Minds";
      body.htmlContent = this.renderHtml(contact, magnet);
    }

    return this.request("/smtp/email", body, "transactional email");
  }

  private async syncContact(contact: LeadContact): Promise<boolean> {
    const { first, last } = splitName(contact.name);
    const body: Record<string, unknown> = {
      email: contact.email,
      attributes: {
        FNAME: first,
        LNAME: last,
      },
      // Repeat submissions are expected, so upsert instead of failing with
      // "Contact already exist".
      updateEnabled: true,
    };

    if (this.config.BREVO_LIST_ID) {
      body.listIds = [this.config.BREVO_LIST_ID];
    }

    return this.request("/contacts", body, "contact sync");
  }

  private renderHtml(
    contact: LeadContact,
    magnet: LeadMagnetDelivery | null
  ): string {
    const name = escapeHtml(contact.name);
    const title = escapeHtml(magnet?.title ?? "");
    const description = magnet?.description
      ? `<p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">${escapeHtml(magnet.description)}</p>`
      : "";
    const action = magnet?.downloadUrl
      ? `<p style="margin:0 0 28px;"><a href="${escapeHtml(magnet.downloadUrl)}" style="background:#1F4FD8;color:#ffffff;padding:14px 22px;text-decoration:none;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;font-size:12px;display:inline-block;">Download ${title || "your guide"}</a></p>`
      : `<p style="margin:0 0 28px;color:#475569;font-size:15px;line-height:1.6;">We will be in touch with the next conversation from the archive.</p>`;

    return [
      '<!doctype html><html><body style="margin:0;padding:0;background:#F8FAFC;">',
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;padding:32px 0;"><tr><td align="center">',
      '<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;padding:40px;font-family:Helvetica,Arial,sans-serif;">',
      '<tr><td><p style="margin:0 0 8px;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#1F4FD8;font-weight:700;">Influential Minds</p>',
      `<h1 style="margin:0 0 20px;font-size:24px;line-height:1.3;color:#0F172A;">Thank you, ${name}.</h1>`,
      title
        ? `<p style="margin:0 0 12px;color:#0F172A;font-size:16px;">Here is <strong>${title}</strong>.</p>`
        : "",
      description,
      action,
      '<p style="margin:0;color:#94A3B8;font-size:12px;line-height:1.6;">You are receiving this because you requested a resource from the Influential Minds archive.</p>',
      "</td></tr></table></td></tr></table></body></html>",
    ].join("");
  }

  /** Reports success instead of throwing; callers must not fail on email. */
  private async request(
    path: string,
    body: unknown,
    label: string
  ): Promise<boolean> {
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      this.config.BREVO_TIMEOUT_MS
    );

    try {
      const response = await fetch(
        `${this.config.BREVO_BASE_URL.replace(/\/$/, "")}${path}`,
        {
          method: "POST",
          headers: {
            accept: "application/json",
            "content-type": "application/json",
            "api-key": this.config.BREVO_API_KEY ?? "",
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        }
      );

      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        this.logger.error(
          `Brevo ${label} failed with ${response.status}: ${detail.slice(0, 300)}`
        );
        return false;
      }
      return true;
    } catch (error) {
      this.logger.error(
        `Brevo ${label} request failed: ${error instanceof Error ? error.message : String(error)}`
      );
      return false;
    } finally {
      clearTimeout(timer);
    }
  }
}
