## Nerede kaldım

- Dokunma vurgusu kaldırıldı (Seyhun: "ayarlarda kaydırırken elim nereye değerse o butonun arka planı değişiyor, kaldıralım; tıklanınca da gerek yok"; telefonda denenmedi): artık hiçbir sayfada düğme/satır basılıyken ya da kaydırırken koyulaşmaz, renk veya boyut değiştirmez. Nedeni: NavProgress'teki boş `touchstart` dinleyicisi iPhone'da `:active`'i her dokunuşta (kaydırma başlangıcı dahil) açıyordu, üstüne globals.css'teki `filter: brightness(.92)` ve satırlardaki `active:bg-bg`, `active:scale-95` gibi sınıflar çalışıyordu. Dinleyici ve parlaklık kuralı silindi, Tailwind'in `active:` değişkeni hiçbir öğeye uymayan seçiciye bağlandı (`@custom-variant active`, globals.css); sayfalardaki sınıflara ve düzene dokunulmadı. Geri istenirse o satır silinir. iOS'un gri dokunma vurgusu zaten kapalı (`-webkit-tap-highlight-color: transparent`).

## Tasarım

- Dokunma/basılı tutma vurgusu yok: düğme ve satırlar basılıyken değişmez (Seyhun'un isteği, 2026-10-08). Yeni bileşenlere `:active` efekti eklenmez.
