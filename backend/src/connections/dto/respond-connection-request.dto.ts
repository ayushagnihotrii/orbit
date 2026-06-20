import { IsBoolean } from 'class-validator';

export class RespondConnectionRequestDto {
  @IsBoolean()
  accept: boolean;
}
