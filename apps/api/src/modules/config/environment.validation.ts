import { z } from "zod";

const LOCALHOST_HOSTNAMES = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);

const environmentSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    APP_ENV: z.enum(["development", "test", "staging", "production"]).default("development"),
    API_HOST: z.string().min(1).default("0.0.0.0"),
    API_PORT: z.coerce.number().int().positive().max(65_535).default(3000),
    API_PREFIX: z.string().min(1).default("api"),
    API_VERSION: z.string().regex(/^\d+$/).default("1"),
    SWAGGER_PATH: z.string().min(1).default("docs"),
    CORS_ORIGINS: z.string().min(1).default("http://localhost:5173,http://127.0.0.1:5173"),
    DATABASE_URL: z.string().url(),
    JWT_ACCESS_SECRET: z.string().min(32),
    JWT_REFRESH_SECRET: z.string().min(32),
    JWT_ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(7200),
    JWT_REFRESH_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(2_592_000),
    GITHUB_CLIENT_ID: z.string().min(1),
    GITHUB_CLIENT_SECRET: z.string().min(1),
    GITHUB_CALLBACK_URL: z.string().url(),
    WEB_AUTH_CALLBACK_URL: z.string().url().default("http://localhost:5173/auth/callback"),
    PROVIDER_TOKEN_ENCRYPTION_KEY: z.string().min(32)
  })
  .superRefine((config, context) => {
    const isProduction = config.NODE_ENV === "production" || config.APP_ENV === "production";

    if (!isProduction) {
      return;
    }

    if (config.NODE_ENV !== "production") {
      context.addIssue({
        code: "custom",
        path: ["NODE_ENV"],
        message: "NODE_ENV must be production when APP_ENV is production"
      });
    }

    if (config.APP_ENV !== "production") {
      context.addIssue({
        code: "custom",
        path: ["APP_ENV"],
        message: "APP_ENV must be production when NODE_ENV is production"
      });
    }

    if (config.CORS_ORIGINS === "*") {
      context.addIssue({
        code: "custom",
        path: ["CORS_ORIGINS"],
        message: "Wildcard CORS is not allowed in production"
      });
    }

    for (const origin of config.CORS_ORIGINS.split(",").map((value) => value.trim())) {
      assertProductionUrl(context, "CORS_ORIGINS", origin);
    }

    assertProductionUrl(context, "GITHUB_CALLBACK_URL", config.GITHUB_CALLBACK_URL);
    assertProductionUrl(context, "WEB_AUTH_CALLBACK_URL", config.WEB_AUTH_CALLBACK_URL);
    assertProductionUrl(context, "DATABASE_URL", config.DATABASE_URL);
  });

export type Environment = z.infer<typeof environmentSchema>;

export function validateEnvironment(config: Record<string, unknown>) {
  const parsed = environmentSchema.safeParse(config);

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");

    throw new Error(`Invalid environment configuration: ${details}`);
  }

  return parsed.data;
}

function assertProductionUrl(
  context: z.RefinementCtx,
  field: "CORS_ORIGINS" | "DATABASE_URL" | "GITHUB_CALLBACK_URL" | "WEB_AUTH_CALLBACK_URL",
  value: string
) {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    context.addIssue({
      code: "custom",
      path: [field],
      message: `${field} must be a valid URL`
    });
    return;
  }

  const isValidProtocol =
    field === "DATABASE_URL"
      ? url.protocol === "postgresql:" || url.protocol === "postgres:"
      : url.protocol === "https:";

  if (!isValidProtocol) {
    context.addIssue({
      code: "custom",
      path: [field],
      message:
        field === "DATABASE_URL"
          ? "DATABASE_URL must use PostgreSQL in production"
          : `${field} must use HTTPS in production`
    });
  }

  if (LOCALHOST_HOSTNAMES.has(url.hostname)) {
    context.addIssue({
      code: "custom",
      path: [field],
      message: `${field} cannot use localhost in production`
    });
  }
}
