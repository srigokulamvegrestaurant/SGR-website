/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  allowedDevOrigins: [
    '10.169.1.244',
    '10.169.1.244:3000',
    'localhost:3000',
    '*.local',
  ],
};

export default nextConfig;
