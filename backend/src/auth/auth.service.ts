import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { User } from '@prisma/client';
import * as argon2 from 'argon2';
import { SafeUser, UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async signup(
    dto: SignupDto,
  ): Promise<{ user: SafeUser; tokens: AuthTokens }> {
    const passwordHash = await argon2.hash(dto.password);
    const user = await this.usersService.create({
      email: dto.email,
      username: dto.username,
      passwordHash,
      age: dto.age,
    });

    return {
      user: this.usersService.toSafeUser(user),
      tokens: await this.issueTokens(user),
    };
  }

  async login(dto: LoginDto): Promise<{ user: SafeUser; tokens: AuthTokens }> {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user || !(await argon2.verify(user.passwordHash, dto.password))) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    return {
      user: this.usersService.toSafeUser(user),
      tokens: await this.issueTokens(user),
    };
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    let payload: { sub: string };
    try {
      payload = await this.jwtService.verifyAsync<{ sub: string }>(
        refreshToken,
        {
          secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        },
      );
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token.');
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException();
    }

    return this.issueTokens(user);
  }

  private async issueTokens(user: User): Promise<AuthTokens> {
    const payload = { sub: user.id, role: user.role };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.configService.get<string>(
        'JWT_ACCESS_EXPIRES_IN',
        '15m',
      ) as JwtSignOptions['expiresIn'],
    });
    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get<string>(
        'JWT_REFRESH_EXPIRES_IN',
        '7d',
      ) as JwtSignOptions['expiresIn'],
    });

    return { accessToken, refreshToken };
  }
}
