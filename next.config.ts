import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Le simulateur est lu sur le disque par src/app/route.ts : il doit être embarqué dans la fonction.
  outputFileTracingIncludes: { "/": ["./private/**"], "/version": ["./private/**"] },
  headers: async () => [
    {
      source: "/:path*",
      headers: [
        { key: "X-Robots-Tag", value: "noindex, nofollow" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      ],
    },
  ],
}

export default nextConfig
