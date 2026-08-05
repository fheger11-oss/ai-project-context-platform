import { ApiProperty } from "@nestjs/swagger";
import { IsString, MinLength } from "class-validator";

export class GitHubCallbackDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  code!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  state!: string;
}
