/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  // Add this line below to fix the Google Fonts build error
  optimizeFonts: false,

  // Fix pdfjs worker webpack error
  webpack: (config) => {
    config.module.rules.push({
      test: /pdf\.worker\.(min\.)?mjs$/,
      type: "asset/resource",
    });
    return config;
  },

  // --- ADDED THIS SECTION TO ALLOW DOWNLOADS ---
  async headers() {
    return [
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