import { Injectable } from "@nestjs/common";
import { Inject } from "@nestjs/common";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

import { AppConfigService } from "../../config/app-config.service.js";

type EncryptedToken = {
  accessTokenEncrypted: string;
  accessTokenIv: string;
  accessTokenAuthTag: string;
};

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;

@Injectable()
export class ProviderTokenCipherService {
  private readonly key: Buffer;

  constructor(@Inject(AppConfigService) config: AppConfigService) {
    this.key = createHash("sha256").update(config.providerTokenEncryptionKey).digest();
  }

  encrypt(token: string): EncryptedToken {
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);

    return {
      accessTokenEncrypted: encrypted.toString("base64"),
      accessTokenIv: iv.toString("base64"),
      accessTokenAuthTag: cipher.getAuthTag().toString("base64")
    };
  }

  decrypt(encryptedToken: EncryptedToken): string {
    const decipher = createDecipheriv(
      ALGORITHM,
      this.key,
      Buffer.from(encryptedToken.accessTokenIv, "base64")
    );

    decipher.setAuthTag(Buffer.from(encryptedToken.accessTokenAuthTag, "base64"));

    return Buffer.concat([
      decipher.update(Buffer.from(encryptedToken.accessTokenEncrypted, "base64")),
      decipher.final()
    ]).toString("utf8");
  }
}
