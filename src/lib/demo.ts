import { Session } from "next-auth";

export const DEMO_USER_EMAIL = "demo@medtrade.com";
export const DEMO_USER_PASSWORD = "Demo@1234";

export function isDemoSession(session: Session | null): boolean {
  return !!session?.user?.isDemo;
}

/** Prisma `where` fragment restricting demo users to demo-seeded records. */
export function demoWhere(session: Session | null): Record<string, unknown> {
  return isDemoSession(session) ? { isDemoData: true } : {};
}

/** Value to set on `isDemoData` when a demo user creates a new record. */
export function demoFlag(session: Session | null): boolean {
  return isDemoSession(session);
}
