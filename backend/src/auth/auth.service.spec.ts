import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { Role, User } from '@prisma/client';
import * as argon2 from 'argon2';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

interface CreateUserArgs {
  email: string;
  username: string;
  passwordHash: string;
  age: number;
}

const baseUser: User = {
  id: 'user-1',
  email: 'student@example.com',
  username: 'student1',
  passwordHash: '',
  age: 16,
  role: Role.STUDENT,
  isPrivate: true,
  isSuspended: false,
  createdAt: new Date(),
};

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: {
    findByEmail: jest.Mock;
    findById: jest.Mock;
    create: jest.Mock<User, [CreateUserArgs]>;
    toSafeUser: jest.Mock;
  };

  beforeEach(async () => {
    usersService = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      create: jest.fn<User, [CreateUserArgs]>(),
      toSafeUser: jest.fn((user: User) => ({
        id: user.id,
        email: user.email,
        username: user.username,
        age: user.age,
        role: user.role,
        isPrivate: user.isPrivate,
        isSuspended: user.isSuspended,
        createdAt: user.createdAt,
      })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        JwtService,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: (key: string) => `test-${key}`,
            get: (_key: string, fallback: string) => fallback,
          },
        },
      ],
    }).compile();

    authService = module.get(AuthService);
  });

  describe('signup', () => {
    it('hashes the password and never stores it in plaintext', async () => {
      usersService.create.mockImplementation((args: CreateUserArgs) => ({
        ...baseUser,
        passwordHash: args.passwordHash,
      }));

      const result = await authService.signup({
        email: 'student@example.com',
        username: 'student1',
        password: 'correct-horse-battery',
        age: 16,
      });

      const createdArgs = usersService.create.mock.calls[0][0];
      expect(createdArgs.passwordHash).not.toBe('correct-horse-battery');
      expect(
        await argon2.verify(createdArgs.passwordHash, 'correct-horse-battery'),
      ).toBe(true);
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
      expect(result.user).not.toHaveProperty('passwordHash');
    });
  });

  describe('login', () => {
    it('rejects an unknown email', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        authService.login({
          email: 'nobody@example.com',
          password: 'whatever123',
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects an incorrect password', async () => {
      const passwordHash = await argon2.hash('correct-password');
      usersService.findByEmail.mockResolvedValue({ ...baseUser, passwordHash });

      await expect(
        authService.login({
          email: baseUser.email,
          password: 'wrong-password',
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('issues tokens for a correct password', async () => {
      const passwordHash = await argon2.hash('correct-password');
      usersService.findByEmail.mockResolvedValue({ ...baseUser, passwordHash });

      const result = await authService.login({
        email: baseUser.email,
        password: 'correct-password',
      });

      expect(result.tokens.accessToken).toBeDefined();
      expect(result.user.email).toBe(baseUser.email);
    });
  });
});
