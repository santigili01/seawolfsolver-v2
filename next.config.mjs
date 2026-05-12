/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async redirects() {
    return [
      {
        source: "/game",
        destination: "/practice/sea-wolf",
        permanent: true,
      },
      {
        source: "/solver",
        destination: "/practice/solver",
        permanent: true,
      },
    ]
  },
}

export default nextConfig
