import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { syncGmailForUser } from "@/lib/email-sync";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "MANAGER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (session.user.isDemo) {
    return NextResponse.json({ error: "Not available in demo mode" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({})) as {
    accessToken?: string;
    fullSync?: boolean;
  };

  try {
    const result = await syncGmailForUser(session.user.id, {
      accessToken: body.accessToken,
      fullSync: body.fullSync,
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gmail sync failed" },
      { status: err instanceof Error && err.message.includes("not connected") ? 400 : 500 }
    );
  }
}
