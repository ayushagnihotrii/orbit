import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConnectionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { ConnectionsService } from './connections.service';

describe('ConnectionsService — DMs are only unlocked by an accepted connection', () => {
  let connectionsService: ConnectionsService;
  let prisma: {
    connectionRequest: { findUnique: jest.Mock };
    directMessage: {
      create: jest.Mock<
        Promise<{ id: string }>,
        [{ data: { connectionId: string; senderId: string; body: string } }]
      >;
      findMany: jest.Mock;
    };
  };
  let usersService: { findByUsername: jest.Mock };

  beforeEach(async () => {
    prisma = {
      connectionRequest: { findUnique: jest.fn() },
      directMessage: {
        create: jest.fn<
          Promise<{ id: string }>,
          [{ data: { connectionId: string; senderId: string; body: string } }]
        >(),
        findMany: jest.fn(),
      },
    };
    usersService = { findByUsername: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConnectionsService,
        { provide: PrismaService, useValue: prisma },
        { provide: UsersService, useValue: usersService },
      ],
    }).compile();

    connectionsService = module.get(ConnectionsService);
  });

  it('rejects messaging when no connection request exists between the two users', async () => {
    prisma.connectionRequest.findUnique.mockResolvedValue(null);

    await expect(
      connectionsService.sendMessage('conn-1', 'user-a', { body: 'hi' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.directMessage.create).not.toHaveBeenCalled();
  });

  it('rejects messaging while the connection request is still PENDING', async () => {
    prisma.connectionRequest.findUnique.mockResolvedValue({
      id: 'conn-1',
      requesterId: 'user-a',
      recipientId: 'user-b',
      status: ConnectionStatus.PENDING,
    });

    await expect(
      connectionsService.sendMessage('conn-1', 'user-a', { body: 'hi' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.directMessage.create).not.toHaveBeenCalled();
  });

  it('rejects a third party who is not a participant in the connection', async () => {
    prisma.connectionRequest.findUnique.mockResolvedValue({
      id: 'conn-1',
      requesterId: 'user-a',
      recipientId: 'user-b',
      status: ConnectionStatus.ACCEPTED,
    });

    await expect(
      connectionsService.sendMessage('conn-1', 'stranger', { body: 'hi' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.directMessage.create).not.toHaveBeenCalled();
  });

  it('allows messaging once the connection is ACCEPTED', async () => {
    prisma.connectionRequest.findUnique.mockResolvedValue({
      id: 'conn-1',
      requesterId: 'user-a',
      recipientId: 'user-b',
      status: ConnectionStatus.ACCEPTED,
    });
    prisma.directMessage.create.mockResolvedValue({ id: 'msg-1' });

    await connectionsService.sendMessage('conn-1', 'user-a', { body: 'hi' });

    const createArgs = prisma.directMessage.create.mock.calls[0][0];
    expect(createArgs.data.connectionId).toBe('conn-1');
    expect(createArgs.data.senderId).toBe('user-a');
    expect(createArgs.data.body).toBe('hi');
  });

  it('rejects sending a connection request to yourself', async () => {
    usersService.findByUsername.mockResolvedValue({
      id: 'user-a',
      username: 'self',
    });

    await expect(
      connectionsService.sendRequest('user-a', { recipientUsername: 'self' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
