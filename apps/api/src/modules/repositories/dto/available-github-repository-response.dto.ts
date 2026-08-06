import { ApiProperty } from "@nestjs/swagger";

import { RepositoryVisibility } from "../../../generated/prisma/enums.js";

export class AvailableGitHubRepositoryResponseDto {
  @ApiProperty({ type: String })
  githubId!: string;

  @ApiProperty({ type: String })
  name!: string;

  @ApiProperty({ type: String })
  fullName!: string;

  @ApiProperty({ type: String })
  owner!: string;

  @ApiProperty({ type: String, nullable: true })
  description!: string | null;

  @ApiProperty({ type: String })
  defaultBranch!: string;

  @ApiProperty({ enum: RepositoryVisibility })
  visibility!: RepositoryVisibility;

  @ApiProperty({ type: String, nullable: true })
  language!: string | null;

  @ApiProperty({ type: Number })
  stars!: number;

  @ApiProperty({ type: Number })
  forks!: number;

  @ApiProperty({ type: Boolean })
  isArchived!: boolean;

  @ApiProperty({ type: String })
  cloneUrl!: string;

  @ApiProperty({ type: String })
  htmlUrl!: string;

  @ApiProperty({ type: String, format: "date-time" })
  githubUpdatedAt!: Date;

  @ApiProperty({ type: Boolean })
  isConnected!: boolean;

  @ApiProperty({ type: String, nullable: true })
  connectedRepositoryId!: string | null;
}

export class AvailableGitHubRepositoryListResponseDto {
  @ApiProperty({ type: () => AvailableGitHubRepositoryResponseDto, isArray: true })
  repositories!: AvailableGitHubRepositoryResponseDto[];
}
