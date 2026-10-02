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
  Res,
  UnauthorizedException
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
import { RegisterDto } from "./dto/register.dto.js";
import type { AuthenticatedUser } from "./types/authenticated-user.js";
import { AUTH_RATE_LIMIT } from "../config/rate-limit.config.js";
// Swagger decorators need this DTO as a runtime value.
import { UserResponseDto } from "../users/dto/user-response.dto.js";

const GITHUB_OAUTH_STATE_COOKIE = "ctxaro_github_oauth_state";
const REFRESH_TOKEN_COOKIE = "ctxaro_refresh_token";
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
    this.setRefreshTokenCookie(response, authResponse.tokens.refreshToken);
    const redirectUrl = new URL(this.authService.webAuthCallbackUrl);

    redirectUrl.hash = new URLSearchParams({
      access_token: authResponse.tokens.accessToken,
      expires_in: String(authResponse.tokens.expiresIn)
    }).toString();

    return response.redirect(redirectUrl.toString());
  }

  @Post("register")
  @Throttle(AUTH_RATE_LIMIT)
  @ApiCreatedResponse({ type: AuthResponseDto })
  async register(
    @Body() dto: RegisterDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response
  ) {
    const session = await this.authService.register(dto, this.getSessionMetadata(request));
    return this.publishSession(response, session);
  }

  @Post("login")
  @Throttle(AUTH_RATE_LIMIT)
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: AuthResponseDto })
  async login(
    @Body() dto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response
  ) {
    const session = await this.authService.login(dto, this.getSessionMetadata(request));
    return this.publishSession(response, session);
  }

  @Post("refresh")
  @Throttle(AUTH_RATE_LIMIT)
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: AuthResponseDto })
  async refresh(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const refreshToken = this.readCookie(request, REFRESH_TOKEN_COOKIE);
    if (!refreshToken) {
      throw new UnauthorizedException("Invalid refresh token");
    }
    const session = await this.authService.refresh(refreshToken, this.getSessionMetadata(request));
    return this.publishSession(response, session);
  }

  @Post("logout")
  @Throttle(AUTH_RATE_LIMIT)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const refreshToken = this.readCookie(request, REFRESH_TOKEN_COOKIE);
    this.clearRefreshTokenCookie(response);
    if (refreshToken) await this.authService.logout(refreshToken);
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

  private publishSession(response: Response, session: Awaited<ReturnType<AuthService["login"]>>) {
    this.setRefreshTokenCookie(response, session.tokens.refreshToken);
    return {
      user: session.user,
      tokens: {
        accessToken: session.tokens.accessToken,
        expiresIn: session.tokens.expiresIn
      }
    };
  }

  private setRefreshTokenCookie(response: Response, refreshToken: string): void {
    response.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {
      httpOnly: true,
      maxAge: this.authService.refreshTokenCookieMaxAgeMilliseconds,
      path: "/",
      sameSite: "lax",
      secure: this.authService.secureCookies
    });
  }

  private clearRefreshTokenCookie(response: Response): void {
    response.clearCookie(REFRESH_TOKEN_COOKIE, {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: this.authService.secureCookies
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
