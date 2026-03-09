import { prisma } from "@/lib/prisma";
import { createNumericCode, hashCode, hashPassword, codeExpiryDate } from "@/lib/auth";
import { sendEmail } from "@/lib/mailer";

function errorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return "Erro desconhecido";
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name = String(body?.name ?? "").trim();
    const email = String(body?.email ?? "").trim().toLowerCase();
    const password = String(body?.password ?? "");

    if (!name || !email || password.length < 6) {
      return Response.json({ error: "Dados invalidos" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return Response.json({ error: "Email ja cadastrado" }, { status: 409 });
    }

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash: hashPassword(password),
      },
      select: { id: true, name: true, email: true },
    });

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
          `Ola, ${name}.\n\n` +
          `Seu codigo de verificacao de email e: ${code}\n\n` +
          `Este codigo expira em 15 minutos.\n` +
          `Para concluir o cadastro, informe esse codigo na tela de verificacao.\n\n` +
          `Equipe CookieLedger`,
      });
    } catch {
      return Response.json(
        {
          error: "Conta criada, mas nao foi possivel enviar o email agora. Tente reenviar o codigo.",
          requiresEmailVerification: true,
          ...(process.env.NODE_ENV !== "production" ? { debugCode: code } : {}),
        },
        { status: 503 },
      );
    }

    return Response.json(
      {
        user,
        requiresEmailVerification: true,
        ...(process.env.NODE_ENV !== "production" ? { debugCode: code } : {}),
      },
      { status: 201 },
    );
  } catch (error) {
    const detail = errorMessage(error);
    console.error("[AUTH_REGISTER_ERROR]", error);
    return Response.json({ error: `Falha ao autenticar: ${detail}` }, { status: 500 });
  }
}
