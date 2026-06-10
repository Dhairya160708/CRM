import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { randomBytes } from "crypto";

const GMAIL_SCOPES = ["https://www.googleapis.com/auth/gmail.readonly", "email"].join(" ");

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "MANAGER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (session.user.isDemo) {
    return NextResponse.redirect(new URL("/settings?gmail_error=Not+available+in+demo+mode", req.url));
  }

  const clientId = process.env.GMAIL_CLIENT_ID;
  const nextAuthUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  if (!clientId) {
    return NextResponse.redirect(new URL("/settings?gmail_error=GMAIL_CLIENT_ID+not+configured", req.url));
  }

  const state = randomBytes(16).toString("hex");
  const callbackUrl = `${nextAuthUrl}/api/emails/oauth/callback/`;

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", callbackUrl);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", GMAIL_SCOPES);
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");
  authUrl.searchParams.set("state", state);

  const response = NextResponse.redirect(authUrl.toString());
  response.cookies.set("gmail_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  return response;
}
