import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

const STATUS_MAP: Record<string, "PENDENTE" | "PREPARANDO" | "SAIU_PARA_ENTREGA" | "CONCLUIDO"> = {
  PENDENTE: "PENDENTE",
  PREPARANDO: "PREPARANDO",
  SAIU_PARA_ENTREGA: "SAIU_PARA_ENTREGA",
  CONCLUIDO: "CONCLUIDO",
};

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const rawStatus = String(body?.status ?? "").trim().toUpperCase();
  const status = STATUS_MAP[rawStatus];

  if (!id || !status) {
    return Response.json({ error: "Status invalido" }, { status: 400 });
  }

  const updated = await prisma.order.updateMany({
    where: { id, userId: auth.user.id },
    data: { status },
  });

  if (updated.count === 0) {
    return Response.json({ error: "Pedido nao encontrado" }, { status: 404 });
  }

  const order = await prisma.order.findFirst({
    where: { id, userId: auth.user.id },
    include: { items: true },
  });

  return Response.json(order);
}
