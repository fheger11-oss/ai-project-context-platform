import { IsString, Matches, MaxLength, MinLength } from "class-validator";

export class RepositoryParamsDto {
  @IsString()
  @MinLength(10)
  @MaxLength(32)
  @Matches(/^[a-z0-9]+$/i)
  id!: string;
}
