import { prisma } from "./prisma";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;

export async function isLoginRateLimited(email: string): Promise<boolean> {
  const since = new Date(Date.now() - WINDOW_MS);
  const failures = await prisma.loginAttempt.count({
    where: {
      email: email.toLowerCase(),
      success: false,
      createdAt: { gte: since },
    },
  });
  return failures >= MAX_FAILURES;
}

export async function recordLoginAttempt(
  email: string,
  success: boolean,
  ip = ""
) {
  await prisma.loginAttempt.create({
    data: {
      email: email.toLowerCase(),
      success,
      ip,
    },
  });
}
