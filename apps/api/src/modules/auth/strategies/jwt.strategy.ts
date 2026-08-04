import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";

import { AppConfigService } from "../../config/app-config.service.js";
import { UsersService } from "../../users/users.service.js";
import type { AuthenticatedUser } from "../types/authenticated-user.js";
import type { AccessTokenPayload } from "../types/jwt-payload.js";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor(
    @Inject(AppConfigService)
    config: AppConfigService,
    @Inject(UsersService)
    private readonly usersService: UsersService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.jwtAccessSecret
    });
  }

  async validate(payload: AccessTokenPayload): Promise<AuthenticatedUser> {
    const user = await this.usersService.findById(payload.sub);

    if (!user) {
      throw new UnauthorizedException("Authentication required");
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId
    };
  }
}
