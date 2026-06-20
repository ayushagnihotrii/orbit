import { ConflictException, Injectable } from '@nestjs/common';
import { Role, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type SafeUser = Omit<User, 'passwordHash'>;

interface CreateUserInput {
  email: string;
  username: string;
  passwordHash: string;
  age: number;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  toSafeUser(user: User): SafeUser {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      age: user.age,
      role: user.role,
      isPrivate: user.isPrivate,
      createdAt: user.createdAt,
    };
  }

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findByUsername(username: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { username } });
  }

  async create(input: CreateUserInput): Promise<User> {
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email: input.email }, { username: input.username }] },
    });
    if (existing) {
      throw new ConflictException('Email or username is already in use.');
    }

    return this.prisma.user.create({
      data: {
        email: input.email,
        username: input.username,
        passwordHash: input.passwordHash,
        age: input.age,
        role: Role.STUDENT,
        isPrivate: true,
      },
    });
  }

  async findAllSafe(): Promise<SafeUser[]> {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return users.map((user) => this.toSafeUser(user));
  }
}
