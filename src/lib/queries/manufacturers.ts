import type { Session } from "next-auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";
import { demoWhere } from "@/lib/demo";
import { logAudit, AuditActions } from "@/lib/audit";

export interface ManufacturersQueryParams {
  page?: number;
  limit?: number;
}

export async function getManufacturers(session: Session, params: ManufacturersQueryParams = {}) {
  const { page = 1, limit = 100 } = params;

  const manufacturers = await prisma.manufacturer.findMany({
    where: demoWhere(session),
    select: {
      id: true,
      nameEncrypted: true,
      location: true,
      certifications: true,
      reliabilityScore: true,
      isActive: true,
      createdAt: true,
      _count: { select: { orders: true } },
    },
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * limit,
    take: limit,
  });

  const decrypted = manufacturers.map(({ nameEncrypted, ...m }) => ({
    ...m,
    name: decrypt(nameEncrypted),
  }));

  await logAudit({ userId: session.user.id, action: AuditActions.VIEW_MANUFACTURER, entity: "Manufacturer" });

  return decrypted;
}

export type ManufacturerListItem = Awaited<ReturnType<typeof getManufacturers>>[number];
