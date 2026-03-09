import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { normalizeUnit } from "@/lib/units";

function parseDecimal(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return NaN;

  const normalized = raw.includes(",")
    ? raw.replace(/\./g, "").replace(",", ".")
    : raw;

  const num = Number(normalized);
  return Number.isFinite(num) ? num : NaN;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const body = await req.json();

  const name = String(body?.name ?? "").trim();
  const price = parseDecimal(body?.price);
  const quantity = parseDecimal(body?.quantity);
  const unit = normalizeUnit(body?.unit);

  if (!id || !name || Number.isNaN(price) || Number.isNaN(quantity) || price < 0 || quantity <= 0) {
    return Response.json({ error: "Dados invalidos" }, { status: 400 });
  }

  const updated = await prisma.ingredient.updateMany({
    where: { id, userId: auth.user.id },
    data: { name, price, quantity, unit },
  });

  if (updated.count === 0) {
    return Response.json({ error: "Ingrediente nao encontrado" }, { status: 404 });
  }

  const ingrediente = await prisma.ingredient.findFirst({ where: { id, userId: auth.user.id } });
  return Response.json(ingrediente);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const { id } = await params;

  const deleted = await prisma.ingredient.deleteMany({
    where: { id, userId: auth.user.id },
  });

  if (deleted.count === 0) {
    return Response.json({ error: "Ingrediente nao encontrado" }, { status: 404 });
  }

  return Response.json({ ok: true });
}

