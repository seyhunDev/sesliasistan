## Nerede kaldım

- Ortak düğme sistemi kuruldu (Seyhun onayladı, örnek /mnt/project-files/butonlar/ornek.png). Beş çeşit: ana (primary), ikincil (secondary, eski adı ghost), yazı (text), simge (icon), tehlike (danger); boy md / sm.
- Görünüm tek yerde: `src/app/globals.css` içinde `.btn`, `.btn-primary` … (`@layer components`, Tailwind sınıfları gerekirse üstüne yazar). Bileşen `src/components/ui/Button.jsx`; Link için `buttonClass()` (`src/components/ui/buttonClass.js`) + `data-press`.
- Basma hissi artık bütün uygulamada: `PressFeedback` kök düzende (`src/app/layout.jsx`), `usePress()` kök verilmezse bütün sayfayı dinler. Yalnız `data-press` taşıyan öğeler etkilenir; parmak 70 ms durunca basılı, 10 px kayınca ya da sayfa kayınca iptal. Liste satırı için `data-press="row"`: WhatsApp gibi hafif gri zemin, dalga yok.
- Ana sayfa, yoklama ve ay raporundaki ayrı `usePress(root)` çağrıları kaldırıldı (genel olan kapsıyor).

## Sıradaki işler

- Sayfaları alan alan küçük PR'larla ortak düğmeye geçirmek (yalnız düğme işaretlemesi ve sınıfları). Asistan dosyaları (AssistantSheet vb.) en sona, "Sesli asistanın çalışma sistemi" başlığıyla konuşarak.
- Liste satırlarına `data-press="row"` eklemek.

## Tasarım

- Düğmeler yalnız ortak `Button` / `buttonClass` ile yapılır; sayfada yeni renk/yükseklik/köşe yazılmaz. Basılı görünüm yalnız parmak dururken; kaydırırken hiçbir şey değişmez; renk parlaması ve dalga yok.
