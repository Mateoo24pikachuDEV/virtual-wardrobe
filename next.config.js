// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        // Reemplaza [TU-PROJECT-REF] con el ref de tu proyecto Supabase
        // Lo encuentras en Settings → General → Reference ID
        hostname: 'xjiizdkbwhhjmgcncqsr.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
}

module.exports = nextConfig