import { json, urlencoded } from "express";

export function createRequestBodyParsers(limitBytes: number) {
  return [json({ limit: limitBytes }), urlencoded({ extended: false, limit: limitBytes })] as const;
}
