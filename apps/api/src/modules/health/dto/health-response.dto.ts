import { ApiProperty } from "@nestjs/swagger";

export class HealthResponseDto {
  @ApiProperty({ example: "ok" })
  status!: "ok";

  @ApiProperty({ example: "2026-08-04T13:00:00.000Z" })
  timestamp!: string;

  @ApiProperty({ example: "development" })
  environment!: string;
}
