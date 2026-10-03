import type { NextConfig } from "next";
import pkg from "./package.json";

/**
 * The app is a fully static export: the same `out/` folder is served by
 * Firebase Hosting on the web and bundled into the Android app by Capacitor.
 * All data goes straight to Firebase (guarded by firestore.rules); the only
 * server code is in functions/ (payments and rating aggregates).
 */
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  reactStrictMode: true,
  poweredByHeader: false,
  images: { unoptimized: true },
  env: { NEXT_PUBLIC_APP_VERSION: pkg.version },
};

export default nextConfig;
