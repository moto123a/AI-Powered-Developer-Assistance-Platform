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
  if (!sessionCookie?.value) {
    // No session cookie  -  redirect to home with auth=required flag so the
    // auth modal opens automatically. Preserve the intended path so the user
    // can navigate back after signing in.
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.set("auth", "required");
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)",
  ],
};