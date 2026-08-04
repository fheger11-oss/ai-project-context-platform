import { ApiProperty } from "@nestjs/swagger";

import { RepositoryVisibility } from "../../../generated/prisma/enums.js";

export class RepositoryResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  githubId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  fullName!: string;

  @ApiProperty()
  owner!: string;

  @ApiProperty({ nullable: true })
  description!: string | null;

  @ApiProperty()
  defaultBranch!: string;

  @ApiProperty({ enum: RepositoryVisibility })
  visibility!: RepositoryVisibility;

  @ApiProperty({ nullable: true })
  language!: string | null;

  @ApiProperty()
  stars!: number;

  @ApiProperty()
  forks!: number;

  @ApiProperty()
  isArchived!: boolean;

  @ApiProperty()
  cloneUrl!: string;

  @ApiProperty()
  htmlUrl!: string;

  @ApiProperty()
  githubUpdatedAt!: Date;

  @ApiProperty()
  lastSyncedAt!: Date;
}

export class RepositoryListResponseDto {
  @ApiProperty({ type: RepositoryResponseDto, isArray: true })
  repositories!: RepositoryResponseDto[];
}
