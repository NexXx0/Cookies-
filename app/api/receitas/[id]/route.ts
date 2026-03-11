import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { ingredientCostPerGram, normalizeUnit } from "@/lib/units";

function toNumber(value: unknown) {
  const normalized = String(value ?? "").trim().replace(",", ".");
  const num = Number(normalized);
  return Number.isFinite(num) ? num : NaN;
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const recipeId = params.id;

  try {
    const body = await req.json();
    const name = String(body?.name ?? "").trim();
    const priceSell = toNumber(body?.priceSell);
    const yieldQuantity = Math.max(1, Math.floor(toNumber(body?.yieldQuantity)));
    const ingredients = Array.isArray(body?.ingredients) ? body.ingredients : [];

    if (!recipeId || !name || Number.isNaN(priceSell) || priceSell < 0 || ingredients.length === 0) {
      return Response.json({ error: "Dados invalidos" }, { status: 400 });
    }

    const recipe = await prisma.recipe.findFirst({ where: { id: recipeId, userId: auth.user.id }, include: { ingredients: true } });
    if (!recipe) return Response.json({ error: "Receita nao encontrada" }, { status: 404 });

    const ingredientIds = ingredients.map((i: any) => i.ingredientId);
    const dbIngredients = await prisma.ingredient.findMany({ where: { userId: auth.user.id, id: { in: ingredientIds } } });
    const map = new Map(dbIngredients.map((ing) => [ing.id, ing]));

    let cost = 0;
    for (const item of ingredients) {
      const grams = toNumber(item?.grams);
      const ing = map.get(String(item?.ingredientId));
      if (!ing || Number.isNaN(grams) || grams <= 0) {
        return Response.json({ error: "Ingredientes invalidos" }, { status: 400 });
      }
      const unit = normalizeUnit(ing.unit);
      cost += ingredientCostPerGram(ing.price, ing.quantity, unit) * grams;
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.recipeIngredient.deleteMany({ where: { recipeId } });
      const rec = await tx.recipe.update({
        where: { id: recipeId },
        data: {
          name,
          priceSell,
          yieldQuantity,
          cost: Number(cost.toFixed(4)),
          ingredients: {
            create: ingredients.map((ing: any) => ({ ingredientId: ing.ingredientId, grams: Number(ing.grams) })),
          },
        },
        include: { ingredients: { include: { ingredient: true } } },
      });
      return rec;
    });

    return Response.json(updated);
  } catch {
    return Response.json({ error: "Erro ao atualizar" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const recipeId = params.id;

  const recipe = await prisma.recipe.findFirst({ where: { id: recipeId, userId: auth.user.id } });
  if (!recipe) return Response.json({ error: "Receita nao encontrada" }, { status: 404 });

  await prisma.recipe.delete({ where: { id: recipeId } });
  return Response.json({ ok: true });
}
