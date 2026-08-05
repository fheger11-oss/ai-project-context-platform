import { ApiProperty } from "@nestjs/swagger";

import { Role } from "../../../generated/prisma/enums.js";

export class GitHubIdentityDto {
  @ApiProperty({ type: String, nullable: true })
  avatarUrl!: string | null;

  @ApiProperty({ type: String, nullable: true })
  displayName!: string | null;

  @ApiProperty({ type: String })
  username!: string;
}

export class UserResponseDto {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ type: String, example: "founder@example.com" })
  email!: string;

  @ApiProperty({ type: () => GitHubIdentityDto, nullable: true })
  github!: GitHubIdentityDto | null;

  @ApiProperty({ enum: Role })
  role!: Role;

  @ApiProperty({ type: String, nullable: true })
  tenantId!: string | null;

  @ApiProperty({ type: String, format: "date-time" })
  createdAt!: Date;
}
