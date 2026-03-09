import { prisma } from "./prisma";
import { amountToGrams, gramsToAmount, normalizeUnit } from "./units";

type StockCheck = {
  ok: boolean;
  ingredientName?: string;
  missingAmount?: number;
  unit?: "g" | "kg";
};

export async function validarEstoque(recipeId: string, quantidadeVendida: number, userId: string): Promise<StockCheck> {
  const recipe = await prisma.recipe.findFirst({
    where: { id: recipeId, userId },
    include: {
      ingredients: {
        include: {
          ingredient: true,
        },
      },
    },
  });

  if (!recipe) {
    return { ok: false };
  }

  const yieldQuantity = Math.max(1, recipe.yieldQuantity || 1);

  for (const item of recipe.ingredients) {
    const consumoEmGramas = (item.grams * quantidadeVendida) / yieldQuantity;
    const unit = normalizeUnit(item.ingredient.unit);
    const disponivelEmGramas = amountToGrams(item.ingredient.quantity, unit);

    if (consumoEmGramas > disponivelEmGramas + 0.0001) {
      const faltaEmGramas = consumoEmGramas - disponivelEmGramas;
      return {
        ok: false,
        ingredientName: item.ingredient.name,
        missingAmount: Number(gramsToAmount(faltaEmGramas, unit).toFixed(3)),
        unit,
      };
    }
  }

  return { ok: true };
}

export async function baixarEstoque(recipeId: string, quantidadeVendida: number, userId: string) {
  const recipe = await prisma.recipe.findFirst({
    where: { id: recipeId, userId },
    include: {
      ingredients: {
        include: {
          ingredient: true,
        },
      },
    },
  });

  if (!recipe) return;

  const yieldQuantity = Math.max(1, recipe.yieldQuantity || 1);

  for (const item of recipe.ingredients) {
    const consumoEmGramas = (item.grams * quantidadeVendida) / yieldQuantity;
    const unit = normalizeUnit(item.ingredient.unit);
    const decrementAmount = gramsToAmount(consumoEmGramas, unit);

    const novaQuantidade = Math.max(0, Number((item.ingredient.quantity - decrementAmount).toFixed(6)));

    await prisma.ingredient.updateMany({
      where: { id: item.ingredientId, userId },
      data: {
        quantity: novaQuantidade,
      },
    });
  }
}
