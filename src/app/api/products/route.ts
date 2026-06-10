import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { demoWhere, demoFlag } from "@/lib/demo";
import { z } from "zod";

const ProductSchema = z.object({
  name: z.string().min(1),
  casNumber: z.string().optional(),
  category: z.string().optional(),
  unit: z.string().min(1),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search");
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "100");

  const where: Record<string, unknown> = { ...demoWhere(session) };
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { casNumber: { contains: search, mode: "insensitive" } },
      { category: { contains: search, mode: "insensitive" } },
    ];
  }

  const products = await prisma.product.findMany({
    where,
    include: { _count: { select: { orders: true, manufacturers: true } } },
    orderBy: { name: "asc" },
    skip: (page - 1) * limit,
    take: limit,
  });

  return NextResponse.json(products);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "MANAGER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = ProductSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const product = await prisma.product.create({ data: { ...parsed.data, isDemoData: demoFlag(session) } });
  return NextResponse.json(product, { status: 201 });
}
