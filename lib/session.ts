import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { authConstants, hashToken } from "@/lib/auth";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
};

export async function getCurrentUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(authConstants.SESSION_COOKIE)?.value;

  if (!rawToken) return null;

  const tokenHash = hashToken(rawToken);
  const now = new Date();

  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
  });

  if (!session || session.expiresAt <= now) {
    return null;
  }

  await prisma.session.update({
    where: { id: session.id },
    data: { lastSeenAt: now },
  });

  return session.user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    return { error: Response.json({ error: "Nao autenticado" }, { status: 401 }) };
  }
  return { user };
}
