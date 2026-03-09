import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  authConstants,
  createNumericCode,
  createSessionToken,
  hashCode,
  hashPassword,
  hashToken,
  sessionExpiryDate,
  verifyPassword,
} from "@/lib/auth";
import { sendEmail } from "@/lib/mailer";

const DEFAULT_ADMIN_EMAIL = "duetocookies@gmail.com";
const DEFAULT_ADMIN_PASSWORD = "duetocookie";
const DEFAULT_ADMIN_NAME = "Admin DuetoCookies";

function errorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return "Erro desconhecido";
}

async function ensureDefaultAdmin() {
  return prisma.user.upsert({
    where: { email: DEFAULT_ADMIN_EMAIL },
    update: {
      name: DEFAULT_ADMIN_NAME,
      passwordHash: hashPassword(DEFAULT_ADMIN_PASSWORD),
      emailVerifiedAt: new Date(),
    },
    create: {
      name: DEFAULT_ADMIN_NAME,
      email: DEFAULT_ADMIN_EMAIL,
      passwordHash: hashPassword(DEFAULT_ADMIN_PASSWORD),
      emailVerifiedAt: new Date(),
    },
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body?.email ?? "").trim().toLowerCase();
    const password = String(body?.password ?? "");

    if (!email || !password) {
      return Response.json({ error: "Dados invalidos" }, { status: 400 });
    }

    let user = await prisma.user.findUnique({ where: { email } });

    if (email === DEFAULT_ADMIN_EMAIL && password === DEFAULT_ADMIN_PASSWORD) {
      user = await ensureDefaultAdmin();
    }

    if (!user || !verifyPassword(password, user.passwordHash)) {
      return Response.json({ error: "Credenciais invalidas" }, { status: 401 });
    }

    if (!user.emailVerifiedAt) {
      const code = createNumericCode();
      await prisma.emailVerificationCode.create({
        data: {
          userId: user.id,
          codeHash: hashCode(code),
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        },
      });

      try {
        await sendEmail({
          to: email,
          subject: "CookieLedger: confirme seu email",
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
            error: "Email nao verificado e nao foi possivel reenviar o codigo agora.",
            requiresEmailVerification: true,
            ...(process.env.NODE_ENV !== "production" ? { debugCode: code } : {}),
          },
          { status: 503 },
        );
      }

      return Response.json(
        {
          error: "Email nao verificado. Enviamos um novo codigo.",
          requiresEmailVerification: true,
          ...(process.env.NODE_ENV !== "production" ? { debugCode: code } : {}),
        },
        { status: 403 },
      );
    }

    const token = createSessionToken();
    await prisma.session.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(token),
        expiresAt: sessionExpiryDate(),
      },
    });

    const appUrl = (process.env.APP_URL || "").trim().toLowerCase();
    const useSecureCookie = process.env.NODE_ENV === "production" && appUrl.startsWith("https://");

    const cookieStore = await cookies();
    cookieStore.set(authConstants.SESSION_COOKIE, token, {
      httpOnly: true,
      secure: useSecureCookie,
      sameSite: "lax",
      path: "/",
      maxAge: authConstants.SESSION_TTL_DAYS * 24 * 60 * 60,
    });

    return Response.json({ user: { id: user.id, name: user.name, email: user.email } });
  } catch (error) {
    const detail = errorMessage(error);
    console.error("[AUTH_LOGIN_ERROR]", error);
    return Response.json({ error: `Falha ao autenticar: ${detail}` }, { status: 500 });
  }
}
