/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  optimizeFonts: false,
  // Don't advertise the framework/version in response headers (removes the
  // "X-Powered-By: Next.js" fingerprint attackers use to target known CVEs).
  poweredByHeader: false,

  webpack: (config) => {
    config.module.rules.push({
      test: /pdf\.worker\.(min\.)?mjs$/,
      type: "asset/resource",
      generator: {
        filename: "static/worker/[hash][ext][query]",
      },
    });

    // Exclude pdf worker from minification
    config.optimization.minimizer = config.optimization.minimizer.map((minimizer) => {
      if (minimizer.constructor.name === "TerserPlugin") {
        minimizer.options.exclude = /pdf\.worker\.(min\.)?mjs$/;
      }
      return minimizer;
    });

    return config;
  },

  async headers() {
    // Baseline security headers applied to every response. These are the
    // industry-standard set that hardens the site without a Content-Security
    // -Policy (a strict CSP would need to allow-list Firebase, Stripe, Google
    // Fonts and Font Awesome, and is easy to get wrong, so we omit it here and
    // rely on server-side token verification + Firestore rules for real auth).
    // camera/microphone are allowed for self because the live interview needs
    // them; everything else stays on its safe default.
    // Content-Security-Policy. Every external origin the app legitimately uses
    // is allow-listed so login (Firebase popup → Google), the live interview
    // (Speechmatics wss), Stripe, Google Fonts and Font Awesome all keep
    // working. 'unsafe-inline'/'unsafe-eval' are required by Next.js hydration
    // and the 3D/chart libs; the value still comes from restricting connect/
    // frame/object/base-uri/form-action, which blocks the main exfiltration
    // and injection vectors.
    const csp = [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'self'",
      "form-action 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://www.gstatic.com https://unpkg.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com",
      "font-src 'self' data: https://fonts.gstatic.com https://cdnjs.cloudflare.com",
      "img-src 'self' data: blob: https:",
      "media-src 'self' blob:",
      "worker-src 'self' blob: https://unpkg.com",
      "connect-src 'self' https://*.googleapis.com https://*.google.com https://*.firebaseio.com wss://*.firebaseio.com https://*.firebaseapp.com https://api.stripe.com https://mp.speechmatics.com https://*.speechmatics.com wss://*.speechmatics.com https://ipapi.co https://unpkg.com",
      "frame-src 'self' https://*.firebaseapp.com https://accounts.google.com https://apis.google.com https://*.stripe.com",
    ].join("; ");

    const securityHeaders = [
      { key: "Content-Security-Policy", value: csp },
      { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-DNS-Prefetch-Control", value: "on" },
      { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
      { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
      { key: "X-XSS-Protection", value: "0" },
      { key: "Permissions-Policy", value: "camera=(self), microphone=(self), payment=(self)" },
    ];

    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        source: "/app.msixbundle",
        headers: [
          {
            key: "Content-Type",
            value: "application/msixbundle",
          },
          {
            key: "Content-Disposition",
            value: "attachment; filename=InterviewCopilot_Installer.msixbundle",
          },
        ],
      },
    ];
  },
};

export default nextConfig;