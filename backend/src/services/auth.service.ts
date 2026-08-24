import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma';
import { signToken } from '../utils/jwt';
import { createError } from '../middleware/errorHandler';
import type { RegisterInput, LoginInput } from '../validators/auth.validator';

export async function register(input: RegisterInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw createError(409, 'Email already registered');

  const passwordHash = await bcrypt.hash(input.password, 12);
  const orgName = input.organizationName ?? `${input.name}'s Organization`;
  const slug = orgName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');

  // Create org + user in one transaction
  const user = await prisma.$transaction(async (tx) => {
    const org = await tx.organization.create({
      data: { name: orgName, slug: `${slug}-${Date.now()}` },
    });
    return tx.user.create({
      data: {
        email: input.email,
        name: input.name,
        passwordHash,
        orgId: org.id,
        role: 'ADMIN',
      },
      include: { organization: true },
    });
  });

  const token = signToken({
    userId: user.id,
    email: user.email,
    orgId: user.orgId,
    role: user.role,
  });

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organization: (user as any).organization,
    },
  };
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    include: { organization: true },
  });

  if (!user) throw createError(401, 'Invalid email or password');

  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) throw createError(401, 'Invalid email or password');

  const token = signToken({
    userId: user.id,
    email: user.email,
    orgId: user.orgId,
    role: user.role,
  });

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organization: user.organization,
    },
  };
}
