import { prisma } from "@/lib/prisma";
import { hashCode, hashPassword } from "@/lib/auth";

export async function POST(req: Request) {
  const body = await req.json();
  const email = String(body?.email ?? "").trim().toLowerCase();
  const code = String(body?.code ?? "").trim();
  const newPassword = String(body?.newPassword ?? "");

  if (!email || !code || newPassword.length < 6) {
    return Response.json({ error: "Dados invalidos" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return Response.json({ error: "Usuario nao encontrado" }, { status: 404 });
  }

  const now = new Date();
  const codeHash = hashCode(code);

  const validCode = await prisma.passwordResetCode.findFirst({
    where: {
      userId: user.id,
      codeHash,
      usedAt: null,
      expiresAt: { gt: now },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!validCode) {
    return Response.json({ error: "Codigo invalido ou expirado" }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.passwordResetCode.update({
      where: { id: validCode.id },
      data: { usedAt: now },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: hashPassword(newPassword) },
    }),
    prisma.session.deleteMany({
      where: { userId: user.id },
    }),
  ]);

  return Response.json({ ok: true });
}
