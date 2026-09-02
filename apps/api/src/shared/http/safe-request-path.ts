import type { Request } from "express";

export function safeRequestPath(request: Request): string {
  return request.path || request.url.split("?")[0] || "/";
}
