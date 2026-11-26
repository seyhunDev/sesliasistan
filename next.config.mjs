import { execSync } from "node:child_process";

// Yayın bilgisi (src/lib/buildInfo.js): son commit başlığı ve gövdesi, kısa kimlik, derleme zamanı.
// Netlify COMMIT_REF verir; başlık git'ten okunur. Yerelde geliştirmede (next dev) boş kalır, not çıkmaz.
function git(cmd) {
  try {
    return execSync(`git ${cmd}`, { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return "";
  }
}
const dev = process.argv.includes("dev");
// Main'e alınan dal birleştirmesi ("Merge branch 'main' into …") açıklama değil: birleştirme olmayan son commit
const subject = dev ? "" : /^Merge (branch|remote-tracking)/.test(git("log -1 --format=%s")) ? git("log -1 --no-merges --format=%s%n%b") : git("log -1 --format=%s%n%b");
const BUILD_ENV = dev
  ? {}
  : {
      NEXT_PUBLIC_BUILD_AT: new Date().toISOString(),
      NEXT_PUBLIC_BUILD_SHA: (process.env.COMMIT_REF || git("rev-parse HEAD")).slice(0, 7),
      NEXT_PUBLIC_BUILD_MSG: subject.slice(0, 600),
    };

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: BUILD_ENV,
  // Telefondan HTTPS tünel adresiyle erişirken geliştirme sunucusu engellemesin
  allowedDevOrigins: ["*.trycloudflare.com", "*.ngrok-free.app", "*.ngrok-free.dev"],
  // Kamera (fiş) ve mikrofon (konuşma) bu sitede kullanılabilsin
  // Tanıtım sayfaları (Seyhun 2026-11-26 "Hepsini yap"): herkese açık, girişsiz düz HTML (public/tanitim). Sonda "Velora'ya katıl"
  // formu /api/basvuru'ya gönderir (Ayarlar › Admin › Başvurular).
  async rewrites() {
    return [
      { source: "/tanitim", destination: "/tanitim/index.html" },
      { source: "/tanitim/simulator", destination: "/tanitim/simulator/index.html" },
    ];
  },
  async headers() {
    return [
      { source: "/:path*", headers: [{ key: "Permissions-Policy", value: "camera=(self), microphone=(self)" }] },
      // Service worker her açılışta güncel sürümü alsın (tarayıcı eski sw.js'i önbellekte tutmasın)
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }] },
    ];
  },
};

export default nextConfig;
