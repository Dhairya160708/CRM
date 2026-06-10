import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ connected: false });

  const token = await prisma.gmailToken.findUnique({
    where: { userId: session.user.id },
    select: { expiresAt: true, scope: true },
  });

  return NextResponse.json({
    connected: !!token,
    expired: token?.expiresAt ? token.expiresAt < new Date() : false,
  });
}

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.gmailToken.deleteMany({ where: { userId: session.user.id } });
  return NextResponse.json({ success: true });
}
