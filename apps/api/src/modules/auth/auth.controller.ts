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
// Swagger decorators need this DTO as a runtime value.
import { UserResponseDto } from "../users/dto/user-response.dto.js";

@ApiTags("auth")
@Controller({
  path: "auth",
  version: "1"
})
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @Get("github")
  @Redirect()
  async loginWithGitHub() {
    return {
      url: await this.authService.createGitHubAuthorizationUrl()
    };
  }

  @Get("github/callback")
  @ApiOkResponse({ type: AuthResponseDto })
  async handleGitHubCallback(
    @Query() dto: GitHubCallbackDto,
    @Req() request: Request,
    @Res() response: Response
  ) {
    const authResponse = await this.authService.loginWithGitHub(
      dto.code,
      dto.state,
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
  @ApiCreatedResponse({ type: AuthResponseDto })
  register(@Body() dto: RegisterDto, @Req() request: Request) {
    return this.authService.register(dto, this.getSessionMetadata(request));
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: AuthResponseDto })
  login(@Body() dto: LoginDto, @Req() request: Request) {
    return this.authService.login(dto, this.getSessionMetadata(request));
  }

  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: AuthResponseDto })
  refresh(@Body() dto: RefreshTokenDto, @Req() request: Request) {
    return this.authService.refresh(dto.refreshToken, this.getSessionMetadata(request));
  }

  @Post("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async logout(@Body() dto: LogoutDto) {
    await this.authService.logout(dto.refreshToken);
  }

  @Get("me")
  @Auth()
  @ApiBearerAuth()
  @ApiOkResponse({ type: UserResponseDto })
  getCurrentUser(@CurrentUser() user: AuthenticatedUser): AuthenticatedUser {
    return user;
  }

  private getSessionMetadata(request: Request) {
    return {
      ipAddress: request.ip,
      userAgent: request.get("user-agent")
    };
  }
}
