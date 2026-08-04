import { z } from "zod";

const environmentSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_ENV: z.enum(["development", "test", "staging", "production"]).default("development"),
  API_HOST: z.string().min(1).default("0.0.0.0"),
  API_PORT: z.coerce.number().int().positive().max(65_535).default(3000),
  API_PREFIX: z.string().min(1).default("api"),
  API_VERSION: z.string().regex(/^\d+$/).default("1"),
  SWAGGER_PATH: z.string().min(1).default("docs"),
  CORS_ORIGINS: z.string().min(1).default("http://localhost:5173,http://127.0.0.1:5173"),
  DATABASE_URL: z.string().url()
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
