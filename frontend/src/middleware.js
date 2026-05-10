import { NextResponse } from "next/server";

const PUBLIC_PATHS = ["/", "/auth/login", "/auth/register", "/auth/forgot-password"];
const AGENCY_BANKING_PATH = "/dashboard/agency-banking";

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // Allow public paths through with no check
  const isPublic = PUBLIC_PATHS.some(p => pathname === p) ||
                   pathname.startsWith("/_next") ||
                   pathname.startsWith("/api") ||
                   pathname.includes(".");
  if (isPublic) return NextResponse.next();

  // All /dashboard/* routes require a token
  const token = request.cookies.get("access_token")?.value ||
                request.headers.get("authorization")?.replace("Bearer ", "");

  if (pathname.startsWith("/dashboard") && !token) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
