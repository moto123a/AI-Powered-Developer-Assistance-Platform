import { NextRequest, NextResponse } from "next/server";
import { jwtVerify, createRemoteJWKSet } from "jose";

/**
 * Only these routes require a valid session cookie.
 * Everything else (home, pricing, terms, etc.) is publicly accessible.
 *
 * SECURITY: the cookie holds a Firebase ID token and is VERIFIED here —
 * signature (against Google's published JWKS), issuer, audience, and expiry.
 * The previous presence-only check let any non-empty cookie value through.
 * API routes additionally re-verify with the Admin SDK; this gate keeps
 * protected page shells (including /admin) off-limits to forged cookies.
 */
const PROTECTED_PREFIXES = [
  "/real-interview",
  "/mock-interview",
  "/resume",
  "/admin",
];

const FIREBASE_PROJECT_ID =
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "copilotx-ai";

// Google's public signing keys for Firebase ID tokens (JWKS). jose caches and
// refreshes this automatically, so verification adds no per-request fetch in
// the steady state.
const FIREBASE_JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com")
);

function redirectToAuth(request: NextRequest, pathname: string) {
  // Redirect to home with auth=required flag so the auth modal opens
  // automatically. Preserve the intended path so the user can navigate
  // back after signing in.
  const url = request.nextUrl.clone();
  url.pathname = "/";
  url.searchParams.set("auth", "required");
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only apply auth check to protected routes
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();

  const sessionCookie = request.cookies.get("coopilotx_session");
  if (!sessionCookie?.value) {
    return redirectToAuth(request, pathname);
  }

  try {
    await jwtVerify(sessionCookie.value, FIREBASE_JWKS, {
      issuer:   `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`,
      audience: FIREBASE_PROJECT_ID,
    });
  } catch {
    // Invalid, expired, or forged token — clear it and send to sign-in.
    const response = redirectToAuth(request, pathname);
    response.cookies.delete("coopilotx_session");
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)",
  ],
};
