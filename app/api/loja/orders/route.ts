import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { resolveOwnerUserId } from "@/lib/owner";

function toNumber(value: unknown) {
  const normalized = String(value ?? "").trim().replace(",", ".");
  const num = Number(normalized);
  return Number.isFinite(num) ? num : NaN;
}

type IncomingItem = {
  recipeId: string;
  quantity: number;
};

export async function POST(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const ownerId = await resolveOwnerUserId();
  if (!ownerId) {
    return Response.json({ error: "Nenhum usuario encontrado" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const customerName = String(body?.customerName ?? "").trim();
  const address = String(body?.address ?? "").trim();
  const phone = String(body?.phone ?? "").trim();
  const contactEmail = String(body?.contactEmail ?? "").trim();
  const cpf = String(body?.cpf ?? "").trim();
  const paymentMethod = String(body?.paymentMethod ?? "").trim().toUpperCase();
  const items = Array.isArray(body?.items) ? (body.items as IncomingItem[]) : [];

  if (!customerName || !address || !phone || !contactEmail || !cpf || !paymentMethod || items.length === 0) {
    return Response.json({ error: "Dados invalidos" }, { status: 400 });
  }

  const recipeIds = items.map((item) => String(item.recipeId));
  const recipes = await prisma.recipe.findMany({
    where: { userId: ownerId, id: { in: recipeIds } },
  });
  const recipeMap = new Map(recipes.map((r) => [r.id, r]));

  const orderItems = [] as Array<{ recipeId: string; recipeName: string; unitPrice: number; quantity: number }>;
  for (const item of items) {
    const recipeId = String(item.recipeId);
    const quantity = Math.max(1, Math.floor(toNumber(item.quantity)));
    const recipe = recipeMap.get(recipeId);
    if (!recipe || !Number.isFinite(quantity) || quantity <= 0) {
      return Response.json({ error: "Itens invalidos" }, { status: 400 });
    }
    orderItems.push({
      recipeId,
      recipeName: recipe.name,
      unitPrice: recipe.priceSell,
      quantity,
    });
  }

  const created = await prisma.order.create({
    data: {
      userId: ownerId,
      customerName,
      address,
      phone,
      contactEmail,
      cpf,
      paymentMethod,
      items: {
        create: orderItems,
      },
    },
    include: {
      items: true,
    },
  });

  return Response.json({ ok: true, orderId: created.id }, { status: 201 });
}