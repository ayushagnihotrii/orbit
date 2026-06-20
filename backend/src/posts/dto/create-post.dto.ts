import {
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreatePostDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  body: string;

  // Local/S3 stub — only a URL reference is stored, never raw file data.
  @IsOptional()
  @IsUrl()
  imageUrl?: string;
}
