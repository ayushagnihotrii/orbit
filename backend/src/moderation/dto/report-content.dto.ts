import { ContentType } from '@prisma/client';
import {
  IsEnum,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class ReportContentDto {
  @IsEnum(ContentType)
  contentType: ContentType;

  @IsUUID()
  contentId: string;

  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason: string;
}
