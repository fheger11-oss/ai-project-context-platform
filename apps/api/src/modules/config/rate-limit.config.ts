import type { Throttle } from "@nestjs/throttler";

const DEFAULT_AUTH_RATE_LIMIT_TTL_SECONDS = 60;
const DEFAULT_AUTH_RATE_LIMIT_MAX = 10;
const DEFAULT_EXPENSIVE_RATE_LIMIT_TTL_SECONDS = 60;
const DEFAULT_EXPENSIVE_RATE_LIMIT_MAX = 5;

type ThrottleOptions = Parameters<typeof Throttle>[0];

export const AUTH_RATE_LIMIT: ThrottleOptions = {
  default: {
    ttl: () =>
      readPositiveInteger("RATE_LIMIT_AUTH_TTL_SECONDS", DEFAULT_AUTH_RATE_LIMIT_TTL_SECONDS) *
      1000,
    limit: () => readPositiveInteger("RATE_LIMIT_AUTH_MAX", DEFAULT_AUTH_RATE_LIMIT_MAX)
  }
};

export const EXPENSIVE_OPERATION_RATE_LIMIT: ThrottleOptions = {
  default: {
    ttl: () =>
      readPositiveInteger(
        "RATE_LIMIT_EXPENSIVE_TTL_SECONDS",
        DEFAULT_EXPENSIVE_RATE_LIMIT_TTL_SECONDS
      ) * 1000,
    limit: () => readPositiveInteger("RATE_LIMIT_EXPENSIVE_MAX", DEFAULT_EXPENSIVE_RATE_LIMIT_MAX)
  }
};

function readPositiveInteger(name: string, fallback: number) {
  const value = process.env[name];

  if (!value) {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}
