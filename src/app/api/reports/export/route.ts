import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit, AuditActions } from "@/lib/audit";
import { decryptIfExists } from "@/lib/encryption";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await logAudit({
    userId: session.user.id,
    action: AuditActions.EXPORT_DATA,
    entity: "Report",
    details: { type: "CSV" },
  });

  const orders = await prisma.order.findMany({
    include: { client: true, product: true, manufacturer: true },
    orderBy: { createdAt: "desc" },
  });

  const header = [
    "Order Number", "Status", "Priority", "Product", "Quantity", "Unit",
    "Specs", "Target Price", "Confirmed Price", "Currency", "Incoterms",
    "Delivery Country", "Client", "Client Country", "Manufacturer",
    "Expected Ship Date", "Actual Ship Date", "Created At",
  ].join(",");

  const rows = orders.map((o: typeof orders[number]) => {
    const cols = [
      o.orderNumber,
      o.status,
      o.priority,
      o.product.name,
      o.quantity,
      o.unit,
      o.specs ?? "",
      o.targetPrice ?? "",
      o.confirmedPrice ?? "",
      o.currency,
      o.incoterms ?? "",
      o.deliveryCountry ?? "",
      decryptIfExists(o.client.nameEncrypted),
      o.client.country,
      o.manufacturer ? decryptIfExists(o.manufacturer.nameEncrypted) : "",
      o.expectedShipDate ? o.expectedShipDate.toISOString().slice(0, 10) : "",
      o.actualShipDate ? o.actualShipDate.toISOString().slice(0, 10) : "",
      o.createdAt.toISOString().slice(0, 10),
    ];
    return cols.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",");
  });

  const csv = [header, ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="medtrade-orders-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
