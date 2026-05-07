import { NextRequest, NextResponse } from "next/server";

/**
 * Only these routes require a valid session cookie.
 * Everything else (home, pricing, terms, etc.) is publicly accessible.
 * Auth for protected pages is handled client-side via Firebase + modal.
 */
const PROTECTED_PREFIXES = [
  "/real-interview",
  "/mock-interview",
  "/resume",
  "/admin",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only apply auth check to protected routes
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();

  // Check for session cookie set by AuthProvider
  const sessionCookie = request.cookies.get("coopilotx_session");
  if (!sessionCookie) {
    // No session — let the page through; client-side Firebase will show the auth modal
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)",
  ],
};