import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  try {
    const receita = await prisma.recipe.findFirst({
      where: {
        userId: auth.user.id,
        name: "Chocolate",
      },
    });

    if (!receita) {
      return Response.json({ error: "Receita nao encontrada. Crie a receita primeiro." }, { status: 404 });
    }

    const sale = await prisma.sale.create({
      data: {
        userId: auth.user.id,
        recipeId: receita.id,
        quantity: 2,
      },
    });

    return Response.json(sale);
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Erro ao criar venda" }, { status: 500 });
  }
}
