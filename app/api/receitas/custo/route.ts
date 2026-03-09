import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { ingredientCostPerGram, normalizeUnit } from "@/lib/units";

export async function POST(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  try {
    const { ingredientes } = await req.json();

    let custoTotal = 0;
    const detalhes = [];

    for (const item of ingredientes as Array<{ id: string; grams: number }>) {
      const ing = await prisma.ingredient.findFirst({
        where: { id: item.id, userId: auth.user.id },
      });

      if (ing) {
        const custoNaReceita = ingredientCostPerGram(ing.price, ing.quantity, normalizeUnit(ing.unit)) * item.grams;

        custoTotal += custoNaReceita;
        detalhes.push({
          nome: ing.name,
          custoUnitario: custoNaReceita,
        });
      }
    }

    return Response.json({ custoTotal, detalhes });
  } catch {
    return Response.json({ error: "Erro no calculo" }, { status: 500 });
  }
}
