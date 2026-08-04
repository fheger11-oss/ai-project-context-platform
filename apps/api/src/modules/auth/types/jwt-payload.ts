import type { Role } from "../../../generated/prisma/enums.js";

export type AccessTokenPayload = {
  sub: string;
  email: string;
  role: Role;
  tenantId: string | null;
};

export type RefreshTokenPayload = {
  sub: string;
  jti: string;
  type: "refresh";
};
