import { afterEach, describe, expect, it, vi } from "vitest";
import {
  BrevoMailProvider,
  DisabledMailProvider,
  splitName,
} from "../src/mail/mail.provider";
import type { AppConfig } from "../src/config/configuration";

function config(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    EMAIL_PROVIDER: "brevo",
    BREVO_API_KEY: "test-key",
    BREVO_BASE_URL: "https://api.brevo.com/v3",
    BREVO_SENDER_EMAIL: "hello@influentialminds.test",
    BREVO_SENDER_NAME: "Influential Minds",
    BREVO_LIST_ID: 7,
    BREVO_TIMEOUT_MS: 10000,
    ...overrides,
  } as AppConfig;
}

const contact = {
  name: "Ada Lovelace",
  email: "ada@example.com",
  consent: true,
  sourcePage: "/",
};

const magnet = {
  title: "The reading list",
  description: "Ten books.",
  downloadUrl: "https://cdn.example.com/guide.pdf",
  fileName: "guide.pdf",
};

function okFetch() {
  return vi
    .fn()
    .mockResolvedValue({ ok: true, status: 201, text: async () => "" });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("splitName", () => {
  it("splits a first and last name", () => {
    expect(splitName("Ada Lovelace")).toEqual({
      first: "Ada",
      last: "Lovelace",
    });
  });

  it("keeps compound surnames together", () => {
    expect(splitName("Ann Christine Duhaime")).toEqual({
      first: "Ann",
      last: "Christine Duhaime",
    });
  });

  it("tolerates a single name and stray whitespace", () => {
    expect(splitName("  Prince  ")).toEqual({ first: "Prince", last: "" });
    expect(splitName("   ")).toEqual({ first: "", last: "" });
  });
});

describe("DisabledMailProvider", () => {
  it("reports nothing was sent", async () => {
    const provider = new DisabledMailProvider();
    expect(provider.enabled).toBe(false);
    await expect(provider.deliverLeadMagnet()).resolves.toEqual({
      emailed: false,
      synced: false,
    });
  });
});

describe("BrevoMailProvider", () => {
  it("sends the email and syncs the contact in one delivery", async () => {
    const fetchMock = okFetch();
    vi.stubGlobal("fetch", fetchMock);

    const result = await new BrevoMailProvider(config()).deliverLeadMagnet(
      contact,
      magnet
    );

    expect(result).toEqual({ emailed: true, synced: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const [emailUrl, emailInit] = fetchMock.mock.calls.find(call =>
      String(call[0]).endsWith("/smtp/email")
    )!;
    expect(emailUrl).toBe("https://api.brevo.com/v3/smtp/email");
    expect(emailInit.headers["api-key"]).toBe("test-key");
    const emailBody = JSON.parse(emailInit.body);
    expect(emailBody.sender).toEqual({
      name: "Influential Minds",
      email: "hello@influentialminds.test",
    });
    expect(emailBody.to).toEqual([
      { email: "ada@example.com", name: "Ada Lovelace" },
    ]);
    expect(emailBody.subject).toBe("Your download: The reading list");
    expect(emailBody.htmlContent).toContain(
      "https://cdn.example.com/guide.pdf"
    );

    const [, contactInit] = fetchMock.mock.calls.find(call =>
      String(call[0]).endsWith("/contacts")
    )!;
    const contactBody = JSON.parse(contactInit.body);
    expect(contactBody).toMatchObject({
      email: "ada@example.com",
      listIds: [7],
      // Repeat submissions must upsert rather than fail.
      updateEnabled: true,
    });
    expect(contactBody.attributes).toEqual({
      FNAME: "Ada",
      LNAME: "Lovelace",
    });
  });

  it("uses a Brevo template instead of inline HTML when one is configured", async () => {
    const fetchMock = okFetch();
    vi.stubGlobal("fetch", fetchMock);

    await new BrevoMailProvider(
      config({ BREVO_TEMPLATE_ID: 42 })
    ).deliverLeadMagnet(contact, magnet);

    const [, init] = fetchMock.mock.calls.find(call =>
      String(call[0]).endsWith("/smtp/email")
    )!;
    const body = JSON.parse(init.body);
    expect(body.templateId).toBe(42);
    expect(body.subject).toBeUndefined();
    expect(body.htmlContent).toBeUndefined();
    // Params still flow so the template can render the download button.
    expect(body.params.downloadUrl).toBe("https://cdn.example.com/guide.pdf");
  });

  it("omits listIds when no list is configured", async () => {
    const fetchMock = okFetch();
    vi.stubGlobal("fetch", fetchMock);

    await new BrevoMailProvider(
      config({ BREVO_LIST_ID: undefined })
    ).deliverLeadMagnet(contact, magnet);

    const [, init] = fetchMock.mock.calls.find(call =>
      String(call[0]).endsWith("/contacts")
    )!;
    expect(JSON.parse(init.body).listIds).toBeUndefined();
  });

  it("still emails when the contact sync is rejected", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) =>
      url.endsWith("/contacts")
        ? Promise.resolve({
            ok: false,
            status: 400,
            text: async () => '{"code":"invalid_parameter"}',
          })
        : Promise.resolve({ ok: true, status: 201, text: async () => "" })
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      new BrevoMailProvider(config()).deliverLeadMagnet(contact, magnet)
    ).resolves.toEqual({ emailed: true, synced: false });
  });

  it("never throws when Brevo is unreachable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("ECONNREFUSED"))
    );

    await expect(
      new BrevoMailProvider(config()).deliverLeadMagnet(contact, magnet)
    ).resolves.toEqual({ emailed: false, synced: false });
  });

  it("falls back to a welcome email when no lead magnet is active", async () => {
    const fetchMock = okFetch();
    vi.stubGlobal("fetch", fetchMock);

    await new BrevoMailProvider(config()).deliverLeadMagnet(contact, null);

    const [, init] = fetchMock.mock.calls.find(call =>
      String(call[0]).endsWith("/smtp/email")
    )!;
    const body = JSON.parse(init.body);
    expect(body.subject).toBe("Welcome to Influential Minds");
    expect(body.htmlContent).toContain("next conversation");
  });

  it("escapes recipient-controlled values in the HTML body", async () => {
    const fetchMock = okFetch();
    vi.stubGlobal("fetch", fetchMock);

    await new BrevoMailProvider(config()).deliverLeadMagnet(
      { ...contact, name: '<script>alert("x")</script>' },
      magnet
    );

    const [, init] = fetchMock.mock.calls.find(call =>
      String(call[0]).endsWith("/smtp/email")
    )!;
    const body = JSON.parse(init.body);
    expect(body.htmlContent).not.toContain("<script>");
    expect(body.htmlContent).toContain("&lt;script&gt;");
  });
});
