import { ApiProperty } from "@nestjs/swagger";

import { Role } from "../../../generated/prisma/enums.js";

export class UserResponseDto {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ type: String, example: "founder@example.com" })
  email!: string;

  @ApiProperty({ enum: Role })
  role!: Role;

  @ApiProperty({ type: String, nullable: true })
  tenantId!: string | null;

  @ApiProperty({ type: String, format: "date-time" })
  createdAt!: Date;
}
