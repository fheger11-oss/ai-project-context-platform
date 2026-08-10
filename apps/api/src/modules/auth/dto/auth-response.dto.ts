import { ApiProperty } from "@nestjs/swagger";

import { UserResponseDto } from "../../users/dto/user-response.dto.js";

export class AuthTokensDto {
  @ApiProperty({ type: String })
  accessToken!: string;

  @ApiProperty({ type: String })
  refreshToken!: string;

  @ApiProperty({ type: Number, example: 7200 })
  expiresIn!: number;
}

export class AuthResponseDto {
  @ApiProperty({ type: () => UserResponseDto })
  user!: UserResponseDto;

  @ApiProperty({ type: () => AuthTokensDto })
  tokens!: AuthTokensDto;
}
