/** @type {import('next').NextConfig} */
const nextConfig = {
  // Telefondan HTTPS tünel adresiyle erişirken geliştirme sunucusu engellemesin
  allowedDevOrigins: ["*.trycloudflare.com", "*.ngrok-free.app", "*.ngrok-free.dev"],
};

export default nextConfig;
