import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";

import { AppConfigModule } from "../config/app-config.module.js";
import { UsersModule } from "../users/users.module.js";
import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";
import { GitHubAccountService } from "./providers/github-account.service.js";
import { GitHubOAuthProvider } from "./providers/github-oauth.provider.js";
import { ProviderTokenCipherService } from "./providers/provider-token-cipher.service.js";
import { JwtStrategy } from "./strategies/jwt.strategy.js";

@Module({
  imports: [AppConfigModule, JwtModule.register({}), PassportModule, UsersModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    GitHubAccountService,
    GitHubOAuthProvider,
    JwtStrategy,
    ProviderTokenCipherService
  ],
  exports: [AuthService, GitHubAccountService]
})
export class AuthModule {}
