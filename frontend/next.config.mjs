// Basic security headers on every page (no CSP here: Google Maps and the theme script
// would need a careful allow-list — listed as future work).
const securityHeaders = [
  { key: "X-Frame-Options", value: "SAMEORIGIN" }, // no clickjacking via iframes
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
