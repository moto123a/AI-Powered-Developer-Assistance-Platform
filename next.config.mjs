/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  optimizeFonts: false,

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
    const securityHeaders = [
      { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-DNS-Prefetch-Control", value: "on" },
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