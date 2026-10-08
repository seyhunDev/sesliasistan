import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = defineConfig([
  ...nextVitals,
  // Tanımsız ad (silinen değişken) sayfayı çökertir; derlemede yakalanmıyor
  { files: ["src/**/*.{js,jsx,mjs}"], rules: { "no-undef": "error" } },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Android uygulaması (Capacitor kabuğu, kendi paketleri)
    "mobil/**",
  ]),
]);

export default eslintConfig;
