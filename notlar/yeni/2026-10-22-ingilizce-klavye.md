## Nerede kaldım
- İngilizce sayfası açılınca klavye açılıyordu (Seyhun: "klavyelik bir şey yok"; telefonda denenmedi): Ekle penceresindeki yazı alanında `autoFocus` vardı, pencere kapalıyken de sayfada durduğu için sayfa açılır açılmaz odaklanıyordu. Kaldırıldı; klavye yalnız Ekle › yazı alanına dokununca açılır. Dosya `src/app/(app)/english/page.jsx`.
