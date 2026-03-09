import { prisma } from "@/lib/prisma";
import { createNumericCode, hashCode, codeExpiryDate } from "@/lib/auth";
import { sendEmail } from "@/lib/mailer";

export async function POST(req: Request) {
  const body = await req.json();
  const email = String(body?.email ?? "").trim().toLowerCase();

  if (!email) {
    return Response.json({ error: "Email obrigatorio" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return Response.json({ ok: true });
  }

  const code = createNumericCode();
  await prisma.passwordResetCode.create({
    data: {
      userId: user.id,
      codeHash: hashCode(code),
      expiresAt: codeExpiryDate(15),
    },
  });

  await sendEmail({
    to: email,
    subject: "CookieLedger: redefinicao de senha",
    text:
      `Ola, ${user.name}.\n\n` +
      `Seu codigo para redefinir a senha e: ${code}\n\n` +
      `Este codigo expira em 15 minutos.\n` +
      `Se voce nao solicitou este codigo, ignore esta mensagem e mantenha sua conta segura.\n\n` +
      `Equipe CookieLedger`,
  });

  return Response.json({
    ok: true,
    ...(process.env.NODE_ENV !== "production" ? { debugCode: code } : {}),
  });
}
