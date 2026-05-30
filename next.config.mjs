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