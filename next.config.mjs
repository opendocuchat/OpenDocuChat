import { execSync } from "child_process";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer, dev }) => {
    if (isServer && !dev) {
      config.plugins.push({
        apply: (compiler) => {
          compiler.hooks.afterEmit.tapPromise("RunMigrations", async () => {
            console.log("Running database migrations...");
            try {
              execSync("node scripts/run-db-migrations.js", {
                stdio: "inherit",
              });
            } catch (error) {
              console.error("Failed to run migrations:", error);
              process.exit(1);
            }
          });
        },
      });
    }
    return config;
  },
};

export default nextConfig;
