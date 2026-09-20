/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "prod-nucleus-project-thumbnail.s3.us-east-2.amazonaws.com", pathname: "/**" },
      { protocol: "https", hostname: "*.s3.us-east-2.amazonaws.com", pathname: "/**" },
      { protocol: "https", hostname: "*.s3.amazonaws.com", pathname: "/**" },
    ],
  },
};

export default nextConfig;
