import {
  BadGatewayException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import { z } from "zod";

import { AppConfigService } from "../../config/app-config.service.js";

export type GitHubOAuthProfile = {
  accessToken: string;
  email: string;
  githubId: string;
  login: string;
  scope: string | null;
};

const GITHUB_REQUEST_TIMEOUT_MS = 10_000;

const tokenSchema = z.object({
  access_token: z.string().min(1),
  scope: z.string().nullable().optional()
});

const userSchema = z.object({
  id: z.number().int().positive(),
  login: z.string().min(1),
  email: z.string().email().nullable()
});

const emailSchema = z.object({
  email: z.string().email(),
  primary: z.boolean(),
  verified: z.boolean()
});

@Injectable()
export class GitHubOAuthProvider {
  constructor(@Inject(AppConfigService) private readonly config: AppConfigService) {}

  buildAuthorizationUrl(state: string) {
    const url = new URL("https://github.com/login/oauth/authorize");

    url.searchParams.set("client_id", this.config.githubClientId);
    url.searchParams.set("redirect_uri", this.config.githubCallbackUrl);
    url.searchParams.set("scope", "repo read:user user:email");
    url.searchParams.set("state", state);

    return url.toString();
  }

  async exchangeCodeForProfile(code: string): Promise<GitHubOAuthProfile> {
    const tokenResponse = await this.request("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        client_id: this.config.githubClientId,
        client_secret: this.config.githubClientSecret,
        code,
        redirect_uri: this.config.githubCallbackUrl
      })
    });
    const tokenPayload = tokenSchema.safeParse(await tokenResponse.json());

    if (!tokenPayload.success) {
      throw new UnauthorizedException("GitHub OAuth token exchange failed");
    }

    const [userResponse, emailResponse] = await Promise.all([
      this.request("https://api.github.com/user", {
        headers: this.githubHeaders(tokenPayload.data.access_token)
      }),
      this.request("https://api.github.com/user/emails", {
        headers: this.githubHeaders(tokenPayload.data.access_token)
      })
    ]);
    const userPayload = userSchema.safeParse(await userResponse.json());
    const emailsPayload = z.array(emailSchema).safeParse(await emailResponse.json());

    if (!userPayload.success || !emailsPayload.success) {
      throw new BadGatewayException("GitHub profile could not be validated");
    }

    const primaryEmail =
      emailsPayload.data.find((email) => email.primary && email.verified)?.email ??
      userPayload.data.email;

    if (!primaryEmail) {
      throw new UnauthorizedException("GitHub account does not expose a verified email");
    }

    return {
      accessToken: tokenPayload.data.access_token,
      email: primaryEmail.toLowerCase(),
      githubId: String(userPayload.data.id),
      login: userPayload.data.login,
      scope: tokenPayload.data.scope ?? null
    };
  }

  private githubHeaders(accessToken: string) {
    return {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": "ai-project-context-platform",
      "X-GitHub-Api-Version": "2022-11-28"
    };
  }

  private async request(url: string, init: RequestInit) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), GITHUB_REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal
      });

      if (response.status === 401 || response.status === 403) {
        if (response.headers.get("x-ratelimit-remaining") === "0") {
          throw new HttpException("GitHub rate limit exceeded", HttpStatus.TOO_MANY_REQUESTS);
        }

        throw new UnauthorizedException("GitHub access was rejected");
      }

      if (!response.ok) {
        throw new BadGatewayException("GitHub request failed");
      }

      return response;
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof HttpException) {
        throw error;
      }

      throw new BadGatewayException("GitHub request failed");
    } finally {
      clearTimeout(timeout);
    }
  }
}
