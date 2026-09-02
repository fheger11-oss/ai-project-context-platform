import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Query,
  Redirect,
  Req,
  Res
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags
} from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import type { Request } from "express";
import type { Response } from "express";

import { AuthService } from "./auth.service.js";
import { Auth } from "./decorators/auth.decorator.js";
import { CurrentUser } from "./decorators/current-user.decorator.js";
// Swagger and ValidationPipe need these DTOs as runtime values.
import { AuthResponseDto } from "./dto/auth-response.dto.js";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { GitHubCallbackDto } from "./dto/github-callback.dto.js";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { LoginDto } from "./dto/login.dto.js";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { LogoutDto } from "./dto/logout.dto.js";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { RefreshTokenDto } from "./dto/refresh-token.dto.js";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { RegisterDto } from "./dto/register.dto.js";
import type { AuthenticatedUser } from "./types/authenticated-user.js";
import { AUTH_RATE_LIMIT } from "../config/rate-limit.config.js";
// Swagger decorators need this DTO as a runtime value.
import { UserResponseDto } from "../users/dto/user-response.dto.js";

const GITHUB_OAUTH_STATE_COOKIE = "ctxaro_github_oauth_state";
const GITHUB_OAUTH_STATE_COOKIE_MAX_AGE_SECONDS = 600;

@ApiTags("auth")
@Controller({
  path: "auth",
  version: "1"
})
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @Get("github")
  @Throttle(AUTH_RATE_LIMIT)
  @Redirect()
  async loginWithGitHub(@Res({ passthrough: true }) response: Response) {
    const nonce = this.authService.createGitHubOAuthNonce();

    this.setGitHubOAuthStateCookie(response, nonce);

    return {
      url: await this.authService.createGitHubAuthorizationUrl(nonce)
    };
  }

  @Get("github/callback")
  @Throttle(AUTH_RATE_LIMIT)
  @ApiOkResponse({ type: AuthResponseDto })
  async handleGitHubCallback(
    @Query() dto: GitHubCallbackDto,
    @Req() request: Request,
    @Res() response: Response
  ) {
    const stateCookieNonce = this.readCookie(request, GITHUB_OAUTH_STATE_COOKIE);

    this.clearGitHubOAuthStateCookie(response);

    const authResponse = await this.authService.loginWithGitHub(
      dto.code,
      dto.state,
      stateCookieNonce,
      this.getSessionMetadata(request)
    );
    const redirectUrl = new URL(this.authService.webAuthCallbackUrl);

    redirectUrl.hash = new URLSearchParams({
      access_token: authResponse.tokens.accessToken,
      refresh_token: authResponse.tokens.refreshToken,
      expires_in: String(authResponse.tokens.expiresIn)
    }).toString();

    return response.redirect(redirectUrl.toString());
  }

  @Post("register")
  @Throttle(AUTH_RATE_LIMIT)
  @ApiCreatedResponse({ type: AuthResponseDto })
  register(@Body() dto: RegisterDto, @Req() request: Request) {
    return this.authService.register(dto, this.getSessionMetadata(request));
  }

  @Post("login")
  @Throttle(AUTH_RATE_LIMIT)
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: AuthResponseDto })
  login(@Body() dto: LoginDto, @Req() request: Request) {
    return this.authService.login(dto, this.getSessionMetadata(request));
  }

  @Post("refresh")
  @Throttle(AUTH_RATE_LIMIT)
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: AuthResponseDto })
  refresh(@Body() dto: RefreshTokenDto, @Req() request: Request) {
    return this.authService.refresh(dto.refreshToken, this.getSessionMetadata(request));
  }

  @Post("logout")
  @Throttle(AUTH_RATE_LIMIT)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async logout(@Body() dto: LogoutDto) {
    await this.authService.logout(dto.refreshToken);
  }

  @Get("me")
  @Auth()
  @ApiBearerAuth()
  @ApiOkResponse({ type: UserResponseDto })
  getCurrentUser(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getCurrentUser(user.id);
  }

  private getSessionMetadata(request: Request) {
    return {
      ipAddress: request.ip,
      userAgent: request.get("user-agent")
    };
  }

  private setGitHubOAuthStateCookie(response: Response, nonce: string): void {
    response.cookie(GITHUB_OAUTH_STATE_COOKIE, nonce, {
      httpOnly: true,
      maxAge: GITHUB_OAUTH_STATE_COOKIE_MAX_AGE_SECONDS * 1000,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production" || process.env.APP_ENV === "production"
    });
  }

  private clearGitHubOAuthStateCookie(response: Response): void {
    response.clearCookie(GITHUB_OAUTH_STATE_COOKIE, {
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production" || process.env.APP_ENV === "production"
    });
  }

  private readCookie(request: Request, name: string): string | null {
    const cookieHeader = request.headers.cookie;

    if (!cookieHeader) {
      return null;
    }

    for (const cookie of cookieHeader.split(";")) {
      const [rawKey, ...rawValue] = cookie.trim().split("=");

      if (rawKey === name) {
        try {
          return decodeURIComponent(rawValue.join("="));
        } catch {
          return null;
        }
      }
    }

    return null;
  }
}
