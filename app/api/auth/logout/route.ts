import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { authConstants, hashToken } from "@/lib/auth";

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get(authConstants.SESSION_COOKIE)?.value;

  if (token) {
    await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  }

  cookieStore.delete(authConstants.SESSION_COOKIE);
  return Response.json({ ok: true });
}
