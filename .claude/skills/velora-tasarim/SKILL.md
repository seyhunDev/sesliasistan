---
name: velora-tasarim
description: Velora yeni tasarım kuralları (lacivert kokpit + sade liste). Bir sayfayı, pencereyi ya da bileşeni tasarlarken veya yeni tasarıma geçirirken önce bunu oku.
---

# Velora yeni tasarım kuralları

Ana sayfa (2026-10-21, "C · Lacivert kokpit") bu kuralların örneğidir. Yeni bir sayfa yaparken önce `src/features/home/` ve `src/features/weather/WeatherTop.jsx` dosyalarına bak, aynı parçaları kullan.

## Temel ilkeler

- Çok çok basit. Yalnız istenen değişir. Soru az sorulur.
- Açıklama/ipucu yazısı yok. Süs simgesi yok.
- Her bilgi tek yerde görünür, tekrar edilmez.
- Düğmelerin kısa bir adı olur ("Yoklama", "Günlük yaz"). Çıplak ok kullanılmaz. Ek işler "⋯" içine konur.
- Boş alan bırakılmaz, sayfa sıkı durur. Yazı taşmaz (`truncate`).
- Kısaltmalar kullanılır: Pzt, 17 Eki, ₺. Başlıklar normal harfle yazılır (büyük harf değil), yazılar semibold.
- Tek vurgu rengi mor. Yeşil yalnız bitti/ödendi için. Amber yalnız gerçek uyarı için. Renk yanıp sönmez.
- Yapay zekâ yapımı görünümden kaçın: degrade, parıltı, gölgeli süs kartları yok. Kartlar düz ve ince çizgili olur.

## Renkler (`src/app/globals.css` `:root`)

| Token | Değer | Kullanım |
|---|---|---|
| `--bg` | #f4f3ef | sıcak kırık beyaz zemin |
| `--card` | #fdfcfa | kart / liste zemini |
| `--fg` | #26282c | yazı |
| `--mut` | #74777d | ikinci yazı |
| `--line` | #e7e5df | ince çizgi |
| `--acc` | #5b4fd6 | tek vurgu (mor) |
| `--accbg` | #ecebfa | açık mor zemin |
| `--deep` | #23255e | lacivert kokpit |
| `--ok` | #4a8a64 | bitti / ödendi |
| `--warn` / `--warnbg` | #a8742a / #f6eedf | uyarı |
| `--rec` | #c8574f | kayıt / tehlike |

Tailwind'de `bg-bg`, `text-mut`, `text-acc`, `border-line` gibi sınıflarla yazılır. Konu renkleri `.tone-st` (sporcu), `.tone-sp`, `.tone-fit` (fitness, turuncu), `.tone-gen` sınıflarıyla `tone-chip` / `tone-bar` içinde kullanılır.

## Sayfa düzeni

1. **Lacivert üst (`.ck`)**: ana sayfada `Cockpit.jsx`, hava sayfasında `WeatherTop.jsx`. Solda yuvarlak geri düğmesi (`BackButton`), sayfanın adı ya da en önemli tek bilgisi büyük yazılır. Altında sayfanın ana düğmeleri durur.
2. **Açık alan**: lacivertin altından yukarı doğru yuvarlak köşeyle başlar (`-mt-6 rounded-t-[1.75rem] bg-bg`). Bölümler `space-y-6` aralıkla dizilir.
3. **Bölüm**: başlık `ListHead` ile listenin dışında durur (sağında sayı ya da "Tümü >"). İçerik `RowList` + `Row` ile gösterilir.

## Parçalar (`src/components/ui`)

- `Row.jsx`: `RowList`, `Row` (lead · başlık · alt yazı · sağ değer veya `Tag`), `ListHead`, `SkelRow`, `Tag`. Satır biçimi her listede aynıdır: öğe + durum. Satıra dokununca öğe kendi yerinde açılır. Uyarı alt yazısı amberdir.
- `Gauge.jsx`: `Gauge` (halka), `Bar` (ince çubuk). "9/14 ödedi" gibi oranlar için kullanılır.
- `ActionGrid.jsx`: kokpitteki adlı düğme ızgarası.
- `Button.jsx`: tek düğme bileşeni. Yeni düğme yazılmaz, buradan alınır. Türleri: `primary` (mor, ana iş), `secondary` (beyaz, kabarık), `text`, `icon`, `danger`, `back`, `round`. Hepsi kabarık durur ve basınca içeri göçer.
- `BackButton.jsx`: yuvarlak simge geri düğmesi (karar "A · Yuvarlak simge", #642).
- `Sheet.jsx`: alttan açılan pencere. Arka plan kaymaz (#627).

## Lacivert üstte düğmeler

- `.ck .raised`: yarı saydam beyaz kabarık düğme.
- `.act-main`: beyaz zemin, en önemli düğme ya da bugün.
- `.ck-sel`: seçili olan mor (#8b5cf6). `aria-pressed` ile birlikte kullanılır.
- `.ck-glass`: yarı saydam kutu (şerit, ikincil düğme).
- `.ck :is(.btn-round,.btn-back)`: yarı saydam yuvarlak düğme. Basınca açık renkte yanıp sönmez.

## Önemli plan

Önemli plan (`isImportant`, `src/lib/planImportant.js`: elle/sesle işaretli ya da adında son tarih geçen) satırı açık mor zeminli (`bg-accbg`), alt satırın başında `ImpTag` (mor "Önemli"); tarih kutusu mor çerçeveli. Amber kullanılmaz (amber yalnız gerçek uyarı).

## Sekmeler

Sayfanın ana bölümleri önemliyse (yarış detay) sekmeler lacivert üstte büyük `raised` düğmeler olur (3 sütun), seçili `ck-sel`; her düğmede kısa durum ("3 iş", "Hazır"), eksikse sarı. Aynı durum aşağıda ayrıca liste olarak tekrar edilmez.

## Arama ve süzgeç

Arama kutusu ve süzgeç çipleri lacivert üstte durur: kutu `ck-glass`, çip seçiliyse beyaz (`border-white bg-white text-[#141938]`), değilse `ck-glass`.

## Alttan pencereler

Örnek: `src/features/home/DayPick.jsx`. Başlık kısa olur ("Pzt 21 Eki"). İçerik bölüm bölüm `ListHead` + `RowList` ile gelir. İş düğmeleri en altta durur: solda `secondary`, sağda `primary`. Seyrek kullanılan iş `text` düğmesi olarak yazılır.

## Sayfaların durumu (2026-10-21)

Yeni tasarımda olanlar: Ana sayfa, Giriş (`/login`; lacivert tam ekran, iki adım, 2026-10-22), Testler (`/settings/tests`; GitHub sonucu ve Hepsini çalıştır / Seçilenler lacivertte, testler özellik özellik), Hava (`/weather`), gün penceresi (DayPick), Antrenman günlüğü (`/training`), Antrenman günü (`/training/day`; sayaç `Countdown dark` ile lacivertte), Yarışlar (`/athletes/races`; sıradaki yarış lacivertte), Planlar (`/plans`; bölüm başına tek liste, gün başlığı, saat + kategori çizgisi), Sporcular (`/athletes`; arama ve sınıflar lacivertte), Yoklama (`/athletes/attendance`; gün, sayılar, toplu işaret lacivertte), Yarış detay (`/athletes/races/[id]`; sekmeler lacivertte büyük düğmeler, her birinde kısa durum) ve Medya (`/media`; Antrenman / Yarış, bölüm başına 4'lü ızgara, 2026-10-22), İngilizce (`/english`; Kelimeler / Cümleler ve sayılar lacivertte, altta Sıradaki kartı, 2026-10-22). Asistan (2026-10-22, "düğmede"): tam ekran zemin yok, sayfa bulanıklaşır; alt çubuktaki düğme yerinde kalır, yanında iki adlı düğme; söylenen yazı düğmenin üstünde; mesaj, görev listesi ve kartlar kendi zeminleriyle.

Henüz eski tasarımda olanlar: archive, athletes alt sayfaları (sporcu detayı, yoklama raporu, yarış multimedya), birthdays, calendar, debts, dues, events, fitness, inventory, invoices, mail, messages, my-attendance, notes, payments, people, posts, receipts, schedule, settings, shopping, staff, tasks, wind.

Sıra (Seyhun 2026-10-21, en çok kullandıkları): Antrenman ✓ · Yarışlar ✓ · Yarış detay ✓ · Planlar ✓ · Sporcular ✓ · Yoklama ✓. Sonrası Seyhun'a sorulacak.

Bir sayfa geçince bu listeyi güncelle.

## Hareket (animasyon)

- Hareket yalnız bir şey olurken: dinleme, iş, konuşma, kayıt. Boşta ekranda sürekli dönen, nefes alan, kayan bir şey olmaz (ekran testi "Enerji (boşta)": saniyede en çok 3 stil hesabı).
- Yalnız `transform` ve `opacity` oynar. Bulanıklık (`filter`, `backdrop-filter`) hareketli öğede yok.
- Açılışta bir kez ve kısa (0,3–0,6 sn). `prefers-reduced-motion` açıksa hareket durur.
