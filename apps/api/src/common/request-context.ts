import { createHash, randomBytes } from "node:crypto";
import type { Request } from "express";

/** Best-effort client IP, honouring a single trusted proxy hop. */
export function clientIp(request: Request): string {
  const forwarded = request.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0]!.trim();
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0]!.split(",")[0]!.trim();
  }
  return request.ip ?? request.socket.remoteAddress ?? "unknown";
}

/** One-way, salted hash so stored keys cannot be reversed to an IP address. */
export function hashIdentifier(value: string, salt: string): string {
  return createHash("sha256")
    .update(`${salt}:${value}`)
    .digest("hex")
    .slice(0, 64);
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

/** `YYYY-MM-DD` bucket in UTC, used for daily Ask entitlements. */
export function utcDayBucket(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function nextUtcMidnight(date = new Date()): Date {
  const next = new Date(date);
  next.setUTCHours(24, 0, 0, 0);
  return next;
}
