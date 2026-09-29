/** @type {import('next').NextConfig} */
const nextConfig = {
  // Geliştirmede sol alttaki Next.js "N" göstergesini gizle
  devIndicators: false,
  // Telefondan HTTPS tünel adresiyle erişirken geliştirme sunucusu engellemesin
  allowedDevOrigins: ["*.trycloudflare.com", "*.ngrok-free.app", "*.ngrok-free.dev"],
  // Kamera (fiş) ve mikrofon (konuşma) bu sitede kullanılabilsin
  async headers() {
    return [
      { source: "/:path*", headers: [{ key: "Permissions-Policy", value: "camera=(self), microphone=(self)" }] },
      // Service worker her açılışta güncel sürümü alsın (tarayıcı eski sw.js'i önbellekte tutmasın)
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }] },
    ];
  },
};

export default nextConfig;
