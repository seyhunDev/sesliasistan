/** @type {import('next').NextConfig} */
const nextConfig = {
  // Telefondan HTTPS tünel adresiyle erişirken geliştirme sunucusu engellemesin
  allowedDevOrigins: ["*.trycloudflare.com", "*.ngrok-free.app", "*.ngrok-free.dev"],
  // Kamera (fiş) ve mikrofon (konuşma) bu sitede kullanılabilsin
  async headers() {
    return [{ source: "/:path*", headers: [{ key: "Permissions-Policy", value: "camera=(self), microphone=(self)" }] }];
  },
};

export default nextConfig;
