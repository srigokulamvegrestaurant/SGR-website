/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  allowedDevOrigins: [
    '10.169.1.244',
    '10.169.1.244:3000',
    'localhost:3000',
    '*.local',
  ],
  experimental: {
    cpus: 2,
  },
};

export default nextConfig;
