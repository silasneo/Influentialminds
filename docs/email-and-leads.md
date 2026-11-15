# Transactional email and lead sync

When a visitor exchanges their email for a lead magnet, the API can email them
the download and add them to a [Brevo](https://www.brevo.com) contact list. The
integration is optional: with it switched off the site behaves exactly as it did
before — leads are still captured, listed in the admin console and exportable as
CSV.

---

## Modes

`EMAIL_PROVIDER` selects the behaviour.

| `EMAIL_PROVIDER` | Behaviour                                                                                      |
| ---------------- | ---------------------------------------------------------------------------------------------- |
| `disabled`       | Default. The lead is stored and nothing leaves the server. Collect subscribers via CSV export. |
| `brevo`          | Sends the lead magnet by transactional email and upserts the contact into a Brevo list.        |

With `brevo` the API refuses to boot without `BREVO_API_KEY` and
`BREVO_SENDER_EMAIL`, so a half-configured deployment fails immediately rather
than silently dropping every email.

## Settings

| Variable               | Required    | Notes                                                                                           |
| ---------------------- | ----------- | ----------------------------------------------------------------------------------------------- |
| `BREVO_API_KEY`        | yes         | **Secret.** Create it under Brevo → SMTP & API → API keys. Never commit it.                     |
| `BREVO_SENDER_EMAIL`   | yes         | Must be a sender already verified in Brevo, otherwise every send is rejected.                   |
| `BREVO_SENDER_NAME`    | no          | Defaults to `Influential Minds`.                                                                |
| `BREVO_REPLY_TO_EMAIL` | no          | Where replies land, if different from the sender.                                               |
| `BREVO_LIST_ID`        | recommended | Numeric id of the contact list. Omit it and contacts are created without being added to a list. |
| `BREVO_TEMPLATE_ID`    | no          | When set, the Brevo template owns the subject and body; otherwise the API sends its own HTML.   |
| `BREVO_BASE_URL`       | no          | Defaults to `https://api.brevo.com/v3`.                                                         |
| `BREVO_TIMEOUT_MS`     | no          | Defaults to 10 s.                                                                               |

Contacts are written with the Brevo default attributes `FNAME` and `LNAME`,
split from the single name field on the form. No custom attributes are required.

### Where the key goes

| How you run it                    | File                                           |
| --------------------------------- | ---------------------------------------------- |
| `pnpm dev` / a direct Node deploy | `apps/api/.env` (copy `apps/api/.env.example`) |
| `docker compose` preview          | `.env` in the repository root, read by Compose |

Both are gitignored, and `BREVO_API_KEY` must never be committed — in CI and
hosted environments supply it as a secret. After editing the root `.env`, apply
it with `docker compose up -d api`.

## Behaviour

- **The lead is saved first.** Email delivery happens after the database write,
  so a Brevo outage, an expired key or an unverified sender can never turn a
  captured lead into a failed submission. Failures are logged by the API and the
  visitor still gets their download link.
- **The two calls are independent.** The email and the list sync run
  concurrently; one failing does not prevent the other.
- **Repeat submissions re-send.** The same email submitted again does not create
  a duplicate lead or a duplicate contact — the contact is upserted and the
  download email is sent again, which matches the on-screen message.
- **Bots get nothing.** A submission that fills the hidden honeypot field is
  discarded before any outbound call.
- **Links are absolute.** Lead magnet files are stored as site-relative paths,
  which are useless inside an email, so the API rewrites them against `API_URL`.
  Set `API_URL` to the real public API origin in production.

## Using a Brevo template

Set `BREVO_TEMPLATE_ID` to use a template designed in Brevo instead of the
built-in HTML. The API passes these parameters, usable as `{{ params.name }}`
and so on:

| Parameter     | Value                                       |
| ------------- | ------------------------------------------- |
| `name`        | The subscriber's name as entered            |
| `title`       | The lead magnet title                       |
| `downloadUrl` | Absolute URL of the file, empty if none set |

A template carries its own subject line, so the API does not send one alongside it.

## Checking it works

1. Set the variables and restart the API.
2. Submit the form on the site with a real address you control.
3. The email should arrive within seconds, and the contact should appear in the
   Brevo list with `FNAME`/`LNAME` populated.
4. If nothing arrives, check the API logs: failures are logged as
   `Brevo transactional email failed with <status>`. A `401` means the key is
   wrong; a `400` naming the sender means it is not verified in Brevo.
