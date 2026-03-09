import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { ingredientCostPerGram, normalizeUnit } from "@/lib/units";

type IncomingIngredient = {
  ingredientId: string;
  grams: number;
};

function toNumber(value: unknown) {
  const normalized = String(value ?? "").trim().replace(",", ".");
  const num = Number(normalized);
  return Number.isFinite(num) ? num : NaN;
}

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  try {
    const receitas = await prisma.recipe.findMany({
      where: { userId: auth.user.id },
      include: {
        ingredients: {
          include: {
            ingredient: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return Response.json(receitas);
  } catch {
    return Response.json({ error: "Erro ao buscar receitas" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  try {
    const body = await req.json();
    const name = String(body?.name ?? "").trim();
    const priceSell = toNumber(body?.priceSell);
    const yieldQuantity = Math.max(1, Math.floor(toNumber(body?.yieldQuantity)));
    const incomingIngredients = Array.isArray(body?.ingredients) ? (body.ingredients as IncomingIngredient[]) : [];

    if (!name || Number.isNaN(priceSell) || priceSell < 0 || incomingIngredients.length === 0) {
      return Response.json({ error: "Dados invalidos" }, { status: 400 });
    }

    const ingredientIds = incomingIngredients.map((item) => item.ingredientId);
    const ingredientes = await prisma.ingredient.findMany({
      where: {
        userId: auth.user.id,
        id: { in: ingredientIds },
      },
    });

    const ingredientMap = new Map(ingredientes.map((item) => [item.id, item]));

    let cost = 0;
    for (const item of incomingIngredients) {
      const grams = toNumber(item.grams);
      const ingredient = ingredientMap.get(item.ingredientId);
      if (!ingredient || Number.isNaN(grams) || grams <= 0) {
        return Response.json({ error: "Ingredientes invalidos" }, { status: 400 });
      }
      const unit = normalizeUnit(ingredient.unit);
      cost += ingredientCostPerGram(ingredient.price, ingredient.quantity, unit) * grams;
    }

    const recipe = await prisma.recipe.create({
      data: {
        userId: auth.user.id,
        name,
        priceSell,
        yieldQuantity,
        cost: Number(cost.toFixed(4)),
        ingredients: {
          create: incomingIngredients.map((ing) => ({
            ingredientId: ing.ingredientId,
            grams: Number(ing.grams),
          })),
        },
      },
      include: {
        ingredients: {
          include: {
            ingredient: true,
          },
        },
      },
    });

    return Response.json(recipe, { status: 201 });
  } catch {
    return Response.json({ error: "Erro ao salvar" }, { status: 500 });
  }
}
