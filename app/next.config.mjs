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
  async redirects() {
    return [
      {
        source: '/menu',
        destination: '/#menu',
        permanent: true,
      },
      {
        source: '/specials',
        destination: '/#specials',
        permanent: true,
      },
      {
        source: '/special',
        destination: '/#specials',
        permanent: true,
      },
      {
        source: '/our-specials',
        destination: '/#specials',
        permanent: true,
      },
      {
        source: '/our-special',
        destination: '/#specials',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
