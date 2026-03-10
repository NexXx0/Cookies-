import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const orders = await prisma.order.findMany({
    where: { userId: auth.user.id },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });

  return Response.json(orders);
}
