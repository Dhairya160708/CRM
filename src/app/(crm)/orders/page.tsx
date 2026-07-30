import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getOrders } from "@/lib/queries/orders";
import { OrdersTable } from "@/components/orders/orders-table";

export const metadata: Metadata = { title: "Orders" };

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: { search?: string; status?: string };
}) {
  const session = await getServerSession(authOptions);
  const status = searchParams.status && searchParams.status !== "ALL" ? searchParams.status : undefined;
  const search = searchParams.search ?? "";

  const { orders, total } = await getOrders(session!, { status, search });
  const serialized = orders.map((o) => ({
    ...o,
    updatedAt: o.updatedAt.toISOString(),
    createdAt: o.createdAt.toISOString(),
  }));

  return (
    <OrdersTable
      initialOrders={serialized}
      initialTotal={total}
      initialSearch={search}
      initialStatus={searchParams.status ?? "ALL"}
    />
  );
}
