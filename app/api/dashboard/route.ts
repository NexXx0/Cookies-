import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

type DashboardParams = {
  from?: string;
  to?: string;
};

function toDayRange(from?: string, to?: string) {
  if (!from || !to) {
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);

    const end = new Date(now);
    end.setHours(23, 59, 59, 999);

    return { start, end };
  }

  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T23:59:59.999`);
  return { start, end };
}

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatLabel(date: Date) {
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export async function GET(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const params: DashboardParams = {
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
  };

  const { start, end } = toDayRange(params.from, params.to);

  const vendas = await prisma.sale.findMany({
    where: {
      userId: auth.user.id,
      createdAt: {
        gte: start,
        lte: end,
      },
    },
    include: {
      recipe: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  let receitaTotal = 0;
  let custoTotal = 0;
  let lucroTotal = 0;
  let vendasRealizadas = 0;

  const lucroPorDia = new Map<string, { label: string; value: number }>();

  for (const venda of vendas) {
    const lucroVenda = (venda.recipe.priceSell - venda.recipe.cost) * venda.quantity;

    receitaTotal += venda.recipe.priceSell * venda.quantity;
    custoTotal += venda.recipe.cost * venda.quantity;
    lucroTotal += lucroVenda;
    vendasRealizadas += venda.quantity;

    const key = dayKey(venda.createdAt);
    const current = lucroPorDia.get(key);

    if (current) {
      current.value += lucroVenda;
      lucroPorDia.set(key, current);
    } else {
      lucroPorDia.set(key, {
        label: formatLabel(venda.createdAt),
        value: lucroVenda,
      });
    }
  }

  const lucroTrend = Array.from(lucroPorDia.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, value]) => ({
      label: value.label,
      value: Number(value.value.toFixed(2)),
    }));

  const saboresRaw = await prisma.sale.groupBy({
    by: ["recipeId"],
    _sum: { quantity: true },
    where: {
      userId: auth.user.id,
      createdAt: {
        gte: start,
        lte: end,
      },
    },
  });

  const recipeIds = saboresRaw.map((s) => s.recipeId);
  const receitas = recipeIds.length
    ? await prisma.recipe.findMany({ where: { id: { in: recipeIds }, userId: auth.user.id } })
    : [];

  const nomes = new Map(receitas.map((r) => [r.id, r.name]));

  const sabores = saboresRaw
    .map((s) => ({
      recipeId: s.recipeId,
      name: nomes.get(s.recipeId) ?? "Receita",
      quantity: s._sum.quantity ?? 0,
    }))
    .sort((a, b) => b.quantity - a.quantity);

  const estoqueBaixo = await prisma.ingredient.findMany({
    where: {
      userId: auth.user.id,
      quantity: {
        lt: 500,
      },
    },
    orderBy: {
      quantity: "asc",
    },
  });

  return Response.json({
    receitaTotal,
    custoTotal,
    lucroTotal,
    vendasRealizadas,
    sabores,
    lucroTrend,
    estoqueBaixo,
    periodo: {
      from: start.toISOString(),
      to: end.toISOString(),
    },
  });
}
