import { IsString, MaxLength, MinLength } from "class-validator";

export class DocumentParamsDto {
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  documentId!: string;
}
