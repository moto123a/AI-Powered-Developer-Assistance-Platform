import { NextRequest, NextResponse } from "next/server";

const PUBLIC_ROUTES = ["/login", "/signup", "/terms", "/privacy"];

const PUBLIC_PREFIXES = [
  "/_next",
  "/api",
  "/favicon",
  "/logo",
  "/app.msixbundle",
  "/InterviewCopilotMac",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow static files and api routes
  if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  // Always allow public routes
  if (PUBLIC_ROUTES.includes(pathname)) {
    return NextResponse.next();
  }

  // Check for session cookie set by AuthProvider
  const sessionCookie = request.cookies.get("coopilotx_session");

  if (!sessionCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)",
  ],
};