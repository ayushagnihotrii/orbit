// Dev-only seed script: wipes and repopulates the database with synthetic
// test data — including a few toxic samples — so the moderation pipeline has
// something to show immediately after a fresh `pnpm run seed`.
//
// All seeded "users" are adult (18+) testers, not simulated minors. The 13+
// age gate itself is already exercised by the Phase 2 auth tests, not by
// fixture data here.
import {
  PrismaClient,
  ModerationStatus,
  ModerationActionType,
  ConnectionStatus,
  Role,
} from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();
const SEED_PASSWORD = 'Password123!';

async function wipe() {
  await prisma.moderationAction.deleteMany();
  await prisma.report.deleteMany();
  await prisma.directMessage.deleteMany();
  await prisma.connectionRequest.deleteMany();
  await prisma.chatMessage.deleteMany();
  await prisma.chatRoom.deleteMany();
  await prisma.postVote.deleteMany();
  await prisma.post.deleteMany();
  await prisma.communityMembership.deleteMany();
  await prisma.community.deleteMany();
  await prisma.user.deleteMany();
}

async function main() {
  console.log('Wiping existing data...');
  await wipe();

  const passwordHash = await argon2.hash(SEED_PASSWORD);

  console.log('Creating users...');
  const admin = await prisma.user.create({
    data: {
      email: 'admin@safespace.dev',
      username: 'admin',
      passwordHash,
      age: 24,
      role: Role.ADMIN,
    },
  });
  const mod = await prisma.user.create({
    data: {
      email: 'mod@safespace.dev',
      username: 'mod_taylor',
      passwordHash,
      age: 22,
      role: Role.MODERATOR,
    },
  });
  const alice = await prisma.user.create({
    data: {
      email: 'alice@safespace.dev',
      username: 'alice',
      passwordHash,
      age: 19,
    },
  });
  const bob = await prisma.user.create({
    data: {
      email: 'bob@safespace.dev',
      username: 'bob',
      passwordHash,
      age: 20,
    },
  });
  const charlie = await prisma.user.create({
    data: {
      email: 'charlie@safespace.dev',
      username: 'charlie',
      passwordHash,
      age: 18,
    },
  });
  const dana = await prisma.user.create({
    data: {
      email: 'dana@safespace.dev',
      username: 'dana',
      passwordHash,
      age: 21,
    },
  });
  const erin = await prisma.user.create({
    data: {
      email: 'erin@safespace.dev',
      username: 'erin',
      passwordHash,
      age: 19,
    },
  });

  console.log('Creating communities...');
  const robotics = await prisma.community.create({
    data: {
      name: 'Robotics Club',
      slug: 'robotics-club',
      description: 'Build, code, and compete. All skill levels welcome.',
      createdById: alice.id,
      chatRooms: { create: { name: 'general' } },
      memberships: {
        create: [
          { userId: alice.id },
          { userId: bob.id },
          { userId: charlie.id },
          { userId: mod.id },
        ],
      },
    },
    include: { chatRooms: true },
  });

  const bookClub = await prisma.community.create({
    data: {
      name: 'Book Lovers',
      slug: 'book-lovers',
      description: 'Monthly picks, spoiler-free discussion threads.',
      createdById: dana.id,
      chatRooms: { create: { name: 'general' } },
      memberships: {
        create: [
          { userId: dana.id },
          { userId: erin.id },
          { userId: alice.id },
        ],
      },
    },
    include: { chatRooms: true },
  });

  console.log(
    'Creating posts (including toxic samples for the moderation queue)...',
  );
  await prisma.post.create({
    data: {
      communityId: robotics.id,
      authorId: bob.id,
      body: 'Just finished wiring up our line-following sensor array — demo video this weekend!',
      moderationStatus: ModerationStatus.APPROVED,
      toxicityScore: 0.01,
    },
  });

  const toxicPost = await prisma.post.create({
    data: {
      communityId: robotics.id,
      authorId: charlie.id,
      body: 'fuck this team, you are all useless idiots and I quit',
      moderationStatus: ModerationStatus.PENDING,
      toxicityScore: 0.93,
    },
  });

  const removedPost = await prisma.post.create({
    data: {
      communityId: robotics.id,
      authorId: charlie.id,
      body: 'go kill yourself nobody wants you here',
      moderationStatus: ModerationStatus.REMOVED,
      toxicityScore: 0.97,
    },
  });

  await prisma.post.create({
    data: {
      communityId: bookClub.id,
      authorId: erin.id,
      body: "This month's pick made me cry on the train. 10/10 would recommend with tissues.",
      moderationStatus: ModerationStatus.APPROVED,
      toxicityScore: 0.02,
    },
  });

  console.log('Creating chat messages...');
  await prisma.chatMessage.create({
    data: {
      chatRoomId: robotics.chatRooms[0].id,
      authorId: alice.id,
      body: 'Meeting moved to Thursday 5pm, same room.',
      moderationStatus: ModerationStatus.APPROVED,
      toxicityScore: 0.01,
    },
  });
  const flaggedChatMessage = await prisma.chatMessage.create({
    data: {
      chatRoomId: robotics.chatRooms[0].id,
      authorId: charlie.id,
      body: "shut up you idiot, that's a stupid idea",
      moderationStatus: ModerationStatus.PENDING,
      toxicityScore: 0.81,
    },
  });

  console.log('Creating connections and direct messages...');
  const accepted = await prisma.connectionRequest.create({
    data: {
      requesterId: alice.id,
      recipientId: dana.id,
      status: ConnectionStatus.ACCEPTED,
      respondedAt: new Date(),
    },
  });
  await prisma.directMessage.createMany({
    data: [
      {
        connectionId: accepted.id,
        senderId: alice.id,
        body: 'Hey! Loved your review of the robotics club post.',
      },
      {
        connectionId: accepted.id,
        senderId: dana.id,
        body: 'Thanks! Are you joining book club too?',
      },
    ],
  });
  await prisma.connectionRequest.create({
    data: {
      requesterId: erin.id,
      recipientId: bob.id,
      status: ConnectionStatus.PENDING,
    },
  });

  console.log('Creating reports and moderation audit history...');
  await prisma.report.create({
    data: {
      reporterId: bob.id,
      contentType: 'POST',
      contentId: toxicPost.id,
      reason: 'Targeted insults at the whole team.',
    },
  });
  await prisma.report.create({
    data: {
      reporterId: alice.id,
      contentType: 'CHAT_MESSAGE',
      contentId: flaggedChatMessage.id,
      reason: 'Being hostile in the group chat.',
    },
  });

  // A moderator already reviewed and removed the worst post — shows up in the audit log,
  // not the live queue, since its report was marked REVIEWED as part of that action.
  await prisma.report.create({
    data: {
      reporterId: bob.id,
      contentType: 'POST',
      contentId: removedPost.id,
      reason: 'Self-harm-adjacent harassment.',
      status: 'REVIEWED',
    },
  });
  await prisma.moderationAction.create({
    data: {
      moderatorId: mod.id,
      action: ModerationActionType.REMOVE,
      contentType: 'POST',
      contentId: removedPost.id,
      reason: 'Violates harassment policy — removed and author warned.',
    },
  });
  await prisma.moderationAction.create({
    data: {
      moderatorId: mod.id,
      action: ModerationActionType.WARN,
      targetUserId: charlie.id,
      reason: 'First warning for harassment in Robotics Club.',
    },
  });

  console.log('\nSeed complete. Test accounts (all use the password below):');
  console.log(`  Password for every seeded account: ${SEED_PASSWORD}\n`);
  console.table([
    { username: admin.username, role: admin.role },
    { username: mod.username, role: mod.role },
    { username: alice.username, role: alice.role },
    { username: bob.username, role: bob.role },
    { username: charlie.username, role: charlie.role },
    { username: dana.username, role: dana.role },
    { username: erin.username, role: erin.role },
  ]);
  console.log(
    'Log in as "mod_taylor" or "admin" to see the moderation queue with live flagged content.',
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
