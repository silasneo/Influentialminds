import { z } from "zod";

/**
 * Every runtime setting the API needs. Parsed once at boot so a misconfigured
 * deployment fails fast instead of silently degrading.
 */
const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  API_URL: z.string().url().default("http://localhost:4000"),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  /** Comma-separated list of browser origins permitted to call the API. */
  CORS_ORIGINS: z.string().default("http://localhost:3000"),

  /** Signing secret for admin session cookies. Must be rotated per environment. */
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters"),
  AUTH_COOKIE_NAME: z.string().default("im_admin_session"),
  AUTH_SESSION_TTL_HOURS: z.coerce.number().int().min(1).max(168).default(12),
  /** Set to false only for local HTTP development. */
  AUTH_COOKIE_SECURE: z
    .enum(["true", "false"])
    .default("true")
    .transform(value => value === "true"),
  AUTH_COOKIE_DOMAIN: z.string().optional(),

  /** Salt mixed into IP hashes so stored usage keys are not reversible. */
  IP_HASH_SALT: z.string().min(16).default("influential-minds-local-salt"),

  /**
   * `mindstudio` calls the managed RAG provider. `mock` returns clearly
   * labelled development results. `disabled` turns Ask the Archive off.
   */
  AI_PROVIDER: z.enum(["mindstudio", "mock", "disabled"]).default("disabled"),
  AI_PROVIDER_API_KEY: z.string().optional(),
  AI_PROVIDER_BASE_URL: z.string().url().default("https://api.mindstudio.ai"),
  AI_PROVIDER_AGENT_ID: z.string().optional(),
  AI_PROVIDER_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .min(1000)
    .max(120000)
    .default(25000),
  /** Minimum retrieval score required before a passage is shown as a source. */
  AI_MIN_SCORE: z.coerce.number().min(0).max(1).default(0.12),
  AI_MAX_SOURCES: z.coerce.number().int().min(1).max(12).default(5),

  /** Local disk storage root for the media library in self-hosted deployments. */
  STORAGE_DRIVER: z.enum(["local"]).default("local"),
  STORAGE_LOCAL_ROOT: z.string().default("storage"),
  STORAGE_PUBLIC_PATH: z.string().default("/media"),
  STORAGE_MAX_UPLOAD_MB: z.coerce.number().int().min(1).max(200).default(25),
});

export type AppConfig = z.infer<typeof envSchema> & {
  corsOrigins: string[];
  isProduction: boolean;
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map(issue => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid API environment configuration:\n${issues}`);
  }

  const value = parsed.data;
  if (value.AI_PROVIDER === "mindstudio" && !value.AI_PROVIDER_API_KEY) {
    throw new Error("AI_PROVIDER=mindstudio requires AI_PROVIDER_API_KEY");
  }

  return {
    ...value,
    corsOrigins: value.CORS_ORIGINS.split(",")
      .map(origin => origin.trim())
      .filter(Boolean),
    isProduction: value.NODE_ENV === "production",
  };
}

export const CONFIG_TOKEN = "APP_CONFIG";
