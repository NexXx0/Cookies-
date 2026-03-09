export async function GET() {
  const hasDbUrl = Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim());

  try {
    const mod = await import("@/lib/prisma");
    const prisma = mod.prisma;
    await prisma.$queryRaw`SELECT 1`;

    return Response.json({
      ok: true,
      db: "online",
      hasDatabaseUrl: hasDbUrl,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";

    return Response.json(
      {
        ok: false,
        db: "offline",
        hasDatabaseUrl: hasDbUrl,
        error: message,
      },
      { status: 500 },
    );
  }
}
