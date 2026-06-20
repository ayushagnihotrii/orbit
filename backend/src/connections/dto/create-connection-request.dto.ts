import { IsString, MinLength } from 'class-validator';

export class CreateConnectionRequestDto {
  @IsString()
  @MinLength(3)
  recipientUsername: string;
}
