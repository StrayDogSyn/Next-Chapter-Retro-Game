/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === "production";

const nextConfig = {
  output: "export",
  basePath: isProd ? "/Next-Chapter-Retro-Game" : "",
  assetPrefix: isProd ? "/Next-Chapter-Retro-Game/" : "",
  env: {
    NEXT_PUBLIC_BASE_PATH: isProd ? "/Next-Chapter-Retro-Game" : "",
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
