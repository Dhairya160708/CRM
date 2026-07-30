import type { Session } from "next-auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";
import { demoWhere } from "@/lib/demo";
import { logAudit, AuditActions } from "@/lib/audit";

export interface ClientsQueryParams {
  page?: number;
  limit?: number;
}

export async function getClients(session: Session, params: ClientsQueryParams = {}) {
  const { page = 1, limit = 100 } = params;

  const clients = await prisma.client.findMany({
    where: demoWhere(session),
    select: {
      id: true,
      nameEncrypted: true,
      company: true,
      country: true,
      language: true,
      tags: true,
      isActive: true,
      createdAt: true,
      _count: { select: { orders: true } },
    },
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * limit,
    take: limit,
  });

  const decrypted = clients.map(({ nameEncrypted, ...c }) => ({
    ...c,
    name: decrypt(nameEncrypted),
  }));

  await logAudit({ userId: session.user.id, action: AuditActions.VIEW_CLIENT, entity: "Client" });

  return decrypted;
}

export type ClientListItem = Awaited<ReturnType<typeof getClients>>[number];
