import { prisma } from "@/lib/prisma";
import { hashCode } from "@/lib/auth";

export async function POST(req: Request) {
  const body = await req.json();
  const email = String(body?.email ?? "").trim().toLowerCase();
  const code = String(body?.code ?? "").trim();

  if (!email || !code) {
    return Response.json({ error: "Dados invalidos" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return Response.json({ error: "Usuario nao encontrado" }, { status: 404 });
  }

  const codeHash = hashCode(code);
  const now = new Date();

  const validCode = await prisma.emailVerificationCode.findFirst({
    where: {
      userId: user.id,
      codeHash,
      usedAt: null,
      expiresAt: {
        gt: now,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!validCode) {
    return Response.json({ error: "Codigo invalido ou expirado" }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.emailVerificationCode.update({
      where: { id: validCode.id },
      data: { usedAt: now },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: { emailVerifiedAt: now },
    }),
  ]);

  return Response.json({ ok: true });
}
