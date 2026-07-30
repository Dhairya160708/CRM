import type { Session } from "next-auth";
import { prisma } from "@/lib/prisma";
import { demoWhere } from "@/lib/demo";

export interface ProductsQueryParams {
  search?: string | null;
  page?: number;
  limit?: number;
}

export async function getProducts(session: Session, params: ProductsQueryParams = {}) {
  const { search, page = 1, limit = 100 } = params;

  const where: Record<string, unknown> = { ...demoWhere(session) };
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { casNumber: { contains: search, mode: "insensitive" } },
      { category: { contains: search, mode: "insensitive" } },
    ];
  }

  return prisma.product.findMany({
    where,
    include: { _count: { select: { orders: true, manufacturers: true } } },
    orderBy: { name: "asc" },
    skip: (page - 1) * limit,
    take: limit,
  });
}

export type ProductListItem = Awaited<ReturnType<typeof getProducts>>[number];
