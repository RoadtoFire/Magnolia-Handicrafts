/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Next.js 16 added a security default that refuses to optimize any
    // image whose host resolves to a private/loopback IP (see
    // node_modules/next/dist/docs/.../image.md#dangerouslyallowlocalip) —
    // without this, every next/image render of a locally-served Django
    // media file (the filesystem fallback used whenever CLOUDINARY_URL is
    // unset, i.e. most local dev setups) 400s with "resolved to private
    // ip". Safe here: still gated by the remotePatterns allowlist below
    // (just the two known local dev hosts/ports), and production serves
    // media from Cloudinary (a public https host) where this has no effect.
    dangerouslyAllowLocalIP: true,
    remotePatterns: [
      // Cloudinary (production media storage, added by the concurrent backend work)
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        port: "",
        pathname: "/**",
      },
      // Local Django dev server media (filesystem fallback when CLOUDINARY_URL is unset)
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "8000",
        pathname: "/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "8000",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
