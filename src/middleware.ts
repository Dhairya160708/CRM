import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // Role-based route protection
    const adminOnlyPaths = ["/reports", "/settings"];
    const managerOrAdminPaths = ["/clients", "/manufacturers"];

    const isAdminOnly = adminOnlyPaths.some((p) => path.startsWith(p));
    const isManagerOrAdmin = managerOrAdminPaths.some((p) =>
      path.startsWith(p)
    );

    if (isAdminOnly && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    if (
      isManagerOrAdmin &&
      token?.role !== "ADMIN" &&
      token?.role !== "MANAGER"
    ) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/orders/:path*",
    "/clients/:path*",
    "/manufacturers/:path*",
    "/emails/:path*",
    "/products/:path*",
    "/reports/:path*",
    "/settings/:path*",
  ],
};
