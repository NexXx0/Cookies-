import { prisma } from "@/lib/prisma";
import { resolveOwnerUserId } from "@/lib/owner";

export async function GET() {
  const ownerId = await resolveOwnerUserId();
  if (!ownerId) {
    return Response.json({ error: "Nenhum usuario encontrado" }, { status: 404 });
  }

  let recipes = await prisma.recipe.findMany({
    where: { userId: ownerId },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      priceSell: true,
      image: true,
    },
  });

  return Response.json(recipes);
}

