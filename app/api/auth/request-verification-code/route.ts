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
  await prisma.emailVerificationCode.create({
    data: {
      userId: user.id,
      codeHash: hashCode(code),
      expiresAt: codeExpiryDate(15),
    },
  });

  try {
    await sendEmail({
      to: email,
      subject: "CookieLedger: codigo de verificacao de email",
      text:
        `Ola, ${user.name}.\n\n` +
        `Seu codigo de verificacao de email e: ${code}\n\n` +
        `Este codigo expira em 15 minutos.\n` +
        `Se voce nao solicitou este codigo, ignore esta mensagem.\n\n` +
        `Equipe CookieLedger`,
    });
  } catch {
    return Response.json(
      {
        error: "Nao foi possivel enviar o codigo agora. Tente novamente.",
      },
      { status: 503 },
    );
  }

  return Response.json({ ok: true });
}
