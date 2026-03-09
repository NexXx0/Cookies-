import { prisma } from "@/lib/prisma";
import { baixarEstoque, validarEstoque } from "@/lib/estoque";
import { requireUser } from "@/lib/session";

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const vendas = await prisma.sale.findMany({
    where: { userId: auth.user.id },
    include: { recipe: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return Response.json(vendas);
}

export async function POST(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const body = await req.json();
  const recipeId = String(body?.recipeId ?? "").trim();
  const quantity = Number(body?.quantity);

  if (!recipeId || Number.isNaN(quantity) || quantity <= 0) {
    return Response.json({ error: "Dados invalidos" }, { status: 400 });
  }

  const recipe = await prisma.recipe.findFirst({ where: { id: recipeId, userId: auth.user.id } });

  if (!recipe) {
    return Response.json({ error: "Receita nao encontrada" }, { status: 404 });
  }

  const stockCheck = await validarEstoque(recipeId, quantity, auth.user.id);
  if (!stockCheck.ok) {
    if (stockCheck.ingredientName && stockCheck.missingAmount !== undefined && stockCheck.unit) {
      return Response.json(
        {
          error: `Estoque insuficiente de ${stockCheck.ingredientName}. Faltam ${stockCheck.missingAmount} ${stockCheck.unit}.`,
        },
        { status: 400 },
      );
    }

    return Response.json({ error: "Estoque insuficiente para registrar a venda." }, { status: 400 });
  }

  const sale = await prisma.sale.create({
    data: {
      userId: auth.user.id,
      recipeId,
      quantity,
    },
  });

  await baixarEstoque(recipeId, quantity, auth.user.id);

  return Response.json(sale, { status: 201 });
}
