import { IsString, MaxLength, MinLength } from 'class-validator';

export class UserActionDto {
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason: string;
}
