import { prisma } from "@/lib/prisma";

interface AuditParams {
  userId: string;
  action: string;
  entity?: string;
  entityId?: string;
  details?: Record<string, unknown>;
  ip?: string;
}

export async function logAudit(params: AuditParams): Promise<void> {
  await prisma.auditLog.create({
    data: {
      userId: params.userId,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId,
      details: (params.details ?? undefined) as object | undefined,
      ip: params.ip,
    },
  });
}

export const AuditActions = {
  LOGIN: "LOGIN",
  LOGOUT: "LOGOUT",
  VIEW_CLIENT: "VIEW_CLIENT",
  CREATE_CLIENT: "CREATE_CLIENT",
  UPDATE_CLIENT: "UPDATE_CLIENT",
  DELETE_CLIENT: "DELETE_CLIENT",
  VIEW_MANUFACTURER: "VIEW_MANUFACTURER",
  CREATE_MANUFACTURER: "CREATE_MANUFACTURER",
  UPDATE_MANUFACTURER: "UPDATE_MANUFACTURER",
  DELETE_MANUFACTURER: "DELETE_MANUFACTURER",
  CREATE_ORDER: "CREATE_ORDER",
  UPDATE_ORDER: "UPDATE_ORDER",
  DELETE_ORDER: "DELETE_ORDER",
  EXPORT_DATA: "EXPORT_DATA",
  SYNC_EMAIL: "SYNC_EMAIL",
  PARSE_EMAIL: "PARSE_EMAIL",
  VIEW_REPORTS: "VIEW_REPORTS",
  CREATE_USER: "CREATE_USER",
  UPDATE_USER: "UPDATE_USER",
  DELETE_USER: "DELETE_USER",
} as const;
