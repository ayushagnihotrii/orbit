import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateChatRoomDto {
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  name: string;
}
