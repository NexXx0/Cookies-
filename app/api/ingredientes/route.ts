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

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const ingredientes = await prisma.ingredient.findMany({
    where: { userId: auth.user.id },
    orderBy: { name: "asc" },
  });
  return Response.json(ingredientes);
}

export async function POST(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const body = await req.json();
  const name = String(body?.name ?? "").trim();
  const price = parseDecimal(body?.price);
  const quantity = parseDecimal(body?.quantity);
  const unit = normalizeUnit(body?.unit);

  if (!name || Number.isNaN(price) || Number.isNaN(quantity) || price < 0 || quantity <= 0) {
    return Response.json({ error: "Dados invalidos" }, { status: 400 });
  }

  const ingrediente = await prisma.ingredient.create({
    data: {
      userId: auth.user.id,
      name,
      price,
      quantity,
      unit,
    },
  });

  return Response.json(ingrediente, { status: 201 });
}

