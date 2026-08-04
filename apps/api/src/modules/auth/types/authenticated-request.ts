import type { Request } from "express";

import type { AuthenticatedUser } from "./authenticated-user.js";

export type AuthenticatedRequest = Request & {
  user: AuthenticatedUser;
};
