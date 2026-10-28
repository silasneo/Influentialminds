"use client";

import { useState } from "react";
import { ArrowRight, Download } from "lucide-react";
import type {
  LeadMagnet,
  LeadSubmissionResponse,
} from "@influential-minds/contracts";
import { submitLead } from "@/lib/api";

interface LeadFormProps {
  heading: string;
  body: string;
  leadMagnet: LeadMagnet | null;
  sourcePage: string;
}

export function LeadForm({
  heading,
  body,
  leadMagnet,
  sourcePage,
}: LeadFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [company, setCompany] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LeadSubmissionResponse | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!consent) {
      setError(
        "Please confirm you are happy to receive the download by email."
      );
      return;
    }

    setPending(true);
    setError(null);
    try {
      setResult(
        await submitLead({ name, email, consent, sourcePage, company })
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "We could not save your details. Please try again."
      );
    } finally {
      setPending(false);
    }
  }

  if (result) {
    return (
      <div>
        <p className="joined-message">{result.message}</p>
        {result.downloadUrl ? (
          <a
            className="button button--cobalt"
            href={result.downloadUrl}
            target="_blank"
            rel="noreferrer noopener"
            style={{ marginTop: 20 }}
          >
            <Download size={12} aria-hidden="true" />
            Download {result.leadMagnet?.title ?? "your copy"}
          </a>
        ) : null}
      </div>
    );
  }

  return (
    <form className="newsletter-form" onSubmit={onSubmit} noValidate>
      <p className="section-kicker section-kicker--blue">{heading}</p>
      <p style={{ color: "rgba(255,255,255,.68)", maxWidth: 420 }}>{body}</p>

      <label htmlFor="lead-name">Your name</label>
      <div className="newsletter-row">
        <input
          id="lead-name"
          name="name"
          type="text"
          autoComplete="name"
          required
          value={name}
          onChange={event => setName(event.target.value)}
          placeholder="Jane Okafor"
        />
      </div>

      <label htmlFor="lead-email" style={{ marginTop: 20 }}>
        Email address
      </label>
      <div className="newsletter-row">
        <input
          id="lead-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={event => setEmail(event.target.value)}
          placeholder="you@example.com"
        />
        <button
          type="submit"
          className="button button--cobalt"
          disabled={pending}
        >
          {pending ? "Sending…" : leadMagnet ? "Get the guide" : "Subscribe"}
          <ArrowRight size={12} aria-hidden="true" />
        </button>
      </div>

      <div className="honeypot" aria-hidden="true">
        <label htmlFor="lead-company">Company</label>
        <input
          id="lead-company"
          name="company"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={company}
          onChange={event => setCompany(event.target.value)}
        />
      </div>

      <label className="newsletter-consent" htmlFor="lead-consent">
        <input
          id="lead-consent"
          type="checkbox"
          checked={consent}
          onChange={event => setConsent(event.target.checked)}
        />
        <span>
          I agree to receive the download and occasional emails about new
          conversations. You can unsubscribe at any time.
        </span>
      </label>

      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}

      {leadMagnet ? (
        <small>
          You will receive “{leadMagnet.title}” immediately after signing up.
        </small>
      ) : null}
    </form>
  );
}
