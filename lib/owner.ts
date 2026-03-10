import { prisma } from "@/lib/prisma";

export async function resolveOwnerUserId() {
  const ownerEmail = process.env.APP_OWNER_EMAIL?.trim().toLowerCase();
  if (ownerEmail) {
    const user = await prisma.user.findUnique({ where: { email: ownerEmail } });
    if (user) return user.id;
  }

  const firstUser = await prisma.user.findFirst({ orderBy: { email: "asc" } });
  return firstUser?.id ?? null;
}
