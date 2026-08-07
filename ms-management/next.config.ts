import type { NextConfig } from "next";

// ── Hostinger Fix ──────────────────────────────────────────────────────────
// On Hostinger (Linux, not Vercel), MySQL must be accessed via localhost,
// NOT via the public IP (193.203.184.121). Rewrite the URL at startup.
if (
  process.platform === "linux" &&
  !process.env.VERCEL &&
  process.env.DATABASE_URL?.includes("193.203.184.121")
) {
  process.env.DATABASE_URL = process.env.DATABASE_URL.replace(
    "193.203.184.121",
    "localhost"
  );
  console.log("[next.config] Hostinger: DATABASE_URL host rewritten to localhost");
}
// ──────────────────────────────────────────────────────────────────────────

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;

