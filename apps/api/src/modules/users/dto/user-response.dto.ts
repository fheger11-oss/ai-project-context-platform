import { ApiProperty } from "@nestjs/swagger";

import { Role } from "../../../generated/prisma/enums.js";

export class UserResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: "founder@example.com" })
  email!: string;

  @ApiProperty({ enum: Role })
  role!: Role;

  @ApiProperty({ nullable: true })
  tenantId!: string | null;

  @ApiProperty()
  createdAt!: Date;
}
