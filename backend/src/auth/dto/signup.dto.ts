import {
  IsEmail,
  IsInt,
  IsString,
  Matches,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class SignupDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(3)
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'Username may only contain letters, numbers, and underscores.',
  })
  username: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long.' })
  password: string;

  // Self-declared age only — no DOB or government ID collected.
  @IsInt()
  @Min(13, { message: 'You must be at least 13 years old to use SafeSpace.' })
  @Max(120)
  age: number;
}
