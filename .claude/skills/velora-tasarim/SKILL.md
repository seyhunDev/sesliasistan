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
- Tek vurgu rengi elektrik mavisi (Velora V, 2026-11-03). Yeşil yalnız bitti/ödendi için. Amber yalnız gerçek uyarı için. Renk yanıp sönmez.
- Yapay zekâ yapımı görünümden kaçın: degrade, parıltı, gölgeli süs kartları yok. Kartlar düz ve ince çizgili olur.

## Renkler (`src/app/globals.css` `:root`): "Velora V" paleti (Seyhun 2026-11-03, logo 3: lacivert zeminde beyaz daire içinde V)
- Yarış detayı iPad (2026-11-09, örnek yaris-tasarim/ipad-detay): tam ekran; arkada canlı yayının fotoğrafı bulanık, solda soluk büyük ad + tarih, Şimdi/Hava cam satırları, en altta Canlı ekran · Yayın; sağda koyu cam panelde sekmeler. Yatayda sol menü gizli, asistan düğmesi sağ altta. Sonuç yuvarlaklarında BFD siyah, UFD beyaz, diğer cezalar kırmızı.

Logo lacivert ve beyaz. Lacivert kokpit ve `.navy` sayfalar logonun laciverti `#0b1a33` (kart `#13243f`, çizgi `#24375a`), lacivertte vurgu açık mavi `#8fb3ff`, seçili/ana iş elektrik mavisi `#3d7bff`. Açık sayfalar Apple gibi: açık gri zemin, beyaz kartlar.

| Token | Değer | Kullanım |
|---|---|---|
| `--bg` | #f5f5f7 | açık zemin |
| `--card` | #ffffff | kart / liste zemini |
| `--fg` | #26282c | yazı |
| `--mut` | #6e6e73 | ikinci yazı |
| `--line` | #e5e5ea | ince çizgi |
| `--acc` | #2563eb | tek vurgu (mavi; açık zeminde okunur tonu) |
| `--accbg` | #e8effe | açık vurgu zemini |
| `--deep` | #0b1a33 | logonun laciverti |
| `--brand` | #2f6bff → #6b9bff | yalnız asistan düğmesi |
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
- `Button.jsx`: tek düğme bileşeni. Yeni düğme yazılmaz, buradan alınır. Türleri: `primary` (vurgu rengi, ana iş), `secondary` (beyaz, kabarık), `text`, `icon`, `danger`, `back`, `round`. Hepsi kabarık durur ve basınca içeri göçer.
- `BackButton.jsx`: yuvarlak simge geri düğmesi (karar "A · Yuvarlak simge", #642).
- `Sheet.jsx`: alttan açılan pencere. Arka plan kaymaz (#627).

## Lacivert üstte düğmeler

- `.ck .raised`: yarı saydam beyaz kabarık düğme.
- `.act-main`: beyaz zemin, en önemli düğme ya da bugün.
- `.ck-sel`: seçili olan elektrik mavisi (#3d7bff). `aria-pressed` ile birlikte kullanılır.
- `.ck-glass`: yarı saydam kutu (şerit, ikincil düğme).
- `.ck :is(.btn-round,.btn-back)`: yarı saydam yuvarlak düğme. Basınca açık renkte yanıp sönmez.

## iPad ana sayfa (2026-11-11, "A · Zaman şeridi")

Geniş ekranda ana sayfa `IpadHome.jsx`: baştan sona lacivert, ince çizgili paneller (`.iph-pn`), panel başlığı küçük büyük harf (`.iph-pt`), rakamlar Space Grotesk (`.num`). Hava ve takvim ayrı panellerde; aynı saat ekseni (06–24). Rüzgâr rengi `windColor` (hafif mavi, iyi yeşil, sert sarı, çok sert kırmızı). Telefona uyarlanınca aynı dil kullanılacak.

## Önemli plan

Önemli plan (`isImportant`, `src/lib/planImportant.js`: elle/sesle işaretli ya da adında son tarih geçen) satırı açık vurgu zeminli (`bg-accbg`), alt satırın başında `ImpTag` (vurgu renginde "Önemli"); tarih kutusu vurgu renginde çerçeveli. Amber kullanılmaz (amber yalnız gerçek uyarı).

## Sekmeler

Sayfanın ana bölümleri önemliyse (yarış detay) sekmeler lacivert üstte büyük `raised` düğmeler olur (3 sütun), seçili `ck-sel`; her düğmede kısa durum ("3 iş", "Hazır"), eksikse sarı. Aynı durum aşağıda ayrıca liste olarak tekrar edilmez.

## Arama ve süzgeç

Arama kutusu ve süzgeç çipleri lacivert üstte durur: kutu `ck-glass`, çip seçiliyse beyaz (`border-white bg-white text-[#141938]`), değilse `ck-glass`.

## Alttan pencereler

Örnek: `src/features/home/DayPick.jsx`. Başlık kısa olur ("Pzt 21 Eki"). İçerik bölüm bölüm `ListHead` + `RowList` ile gelir. İş düğmeleri en altta durur: solda `secondary`, sağda `primary`. Seyrek kullanılan iş `text` düğmesi olarak yazılır.

## Sayfaların durumu (2026-10-21)

Yeni tasarımda olanlar: Ana sayfa, Giriş (`/login`; lacivert tam ekran, iki adım, 2026-10-22), Testler (`/settings/tests`; GitHub sonucu ve Hepsini çalıştır / Seçilenler lacivertte, testler özellik özellik), Hava (`/weather`), gün penceresi (DayPick), Antrenman günlüğü (`/training`), Antrenman günü (`/training/day`; 2026-11-02 açık zemin, başlıksız: sol üstte geri + Yoklama · Günlük, sayaç tek beyaz kartta, videolar yalnız Medya sekmesinde), Yarışlar (`/athletes/races`; sıradaki yarış lacivertte), Planlar (`/plans`; 2026-11-01 sade: lacivertte bugünün planları `ck-plan` kartında, süren/sıradaki büyük; altta Önemli çerçeveli kartlar ve Yaklaşan tek satırlık liste), Sporcular (`/athletes`; arama ve sınıflar lacivertte), Yoklama (`/athletes/attendance`; 2026-10-22 baştan sona lacivert: son 7 gün kutuları, tek özet çizgisi, toplu işaret / sınıf / ay raporu / ses adları ⋯ penceresinde), Yarış detay (`/athletes/races/[id]`; sekmeler lacivertte büyük düğmeler, her birinde kısa durum) ve Medya (`/media`; Antrenman / Yarış, bölüm başına 4'lü ızgara, 2026-10-22), Alışveriş (`/shopping`; lacivertte Liste / Yemek, 2026-10-22) ve Velora Yemek (`/shopping?tab=yemek`, `/yemek/[id]`, `/yemek/siparis/[id]`; kod `src/yemek/ui`, fotoğraflı kartlar: kapak, ürün, yuvarlak mutfak), İngilizce (`/english`; Kelimeler / Cümleler ve sayılar lacivertte, altta Sıradaki kartı, 2026-10-22), Fitness › Sporcular (`/fitness`; baştan sona koyu `.fit-dark`, üstte salon fotoğrafı koyulaşarak kaybolur, sporcu kartında hafta halkası ve Pzt–Paz gün kutuları, 2026-10-23; Benim ve Beslenme henüz eski; ortak parçalar `src/features/fitness/FitDark.jsx`), sporcunun Fitness sayfası (`AthleteFitness`; aynı koyu görünüm, 2026-10-25), Yoklamam (`/my-attendance`; lacivert, devam yayı + günler, 2026-10-25), Notlar (`/notes`; arama ve süzgeç lacivertte, satırda notun rengi; not tam sayfa `/notes/[id]`, kendiliğinden kaydeder, az kullanılanlar ⋯ "Not ayarları"nda, 2026-10-23), Aidatlar (`/dues`; lacivertte bu ayın alınan / beklenen tutarı ve çubuk, Ödeme ekle / Banka, arama; borcu yoksa yeşil ✓ simgesi; aylık aidat, hatırlatma, banka ⋯ "Aidat ayarları"nda, 2026-10-23), Deniz trafiği (`/sea`; lacivertte harita ve Teknem / yenileme / Acil düğmeleri, altta durum durum gemiler, 2026-10-23), Kameralar (`/cams`; lacivertte yer düğmesi ve en yakın kamera büyük, altta 2 sütun kamera kartları ve Daha fazla, 2026-10-23). Ayarlar (ana liste), Fişler ve faturalar (`/receipts`, `/invoices`; Fiş ekle / Fatura ekle lacivertte, Excel/Mail/Yazdır ⋯ içinde), Kişisel hesap (`/payments`), Görevler, Takvim (lacivertte ay ızgarası), Mesajlar listesi, Kişi grupları (`/people/[group]`), Etkinlikler, Envanter, Doğum günleri, Arşiv, Hesaplar (`/mail`) ve Instagram gönderileri (`/posts`; fotoğraf ızgarası) (2026-11-03). Çalışanlar (`/staff`), Ders programı (`/schedule`), Fitness Benim ve Beslenme, Sporcu detayı (`/athletes/[id]`), Yoklama raporu (2026-11-03 grup 4), Asistan (2026-10-22, "düğmede"): tam ekran zemin yok, sayfa bulanıklaşır; alt çubuktaki düğme yerinde kalır, yanında iki adlı düğme; söylenen yazı düğmenin üstünde; mesaj, görev listesi ve kartlar kendi zeminleriyle.

Henüz eski tasarımda olanlar: yarış multimedya (multimedya konusunun), wind (yalnız tam ekran harita).

Sıra (Seyhun 2026-10-21, en çok kullandıkları): Antrenman ✓ · Yarışlar ✓ · Yarış detay ✓ · Planlar ✓ · Sporcular ✓ · Yoklama ✓. Sonrası Seyhun'a sorulacak.

Bir sayfa geçince bu listeyi güncelle.

## Yarış sayfaları: "yarış kart" (2026-11-07)

Yarışlar listesi ve yarış detayı diğer sayfalar gibi lacivert kokpit kullanır (Seyhun 2026-11-07 "diğer sayfalardaki gibi olsun, başlık geri butonun yanında; iPad'de tıklamalar net, ortak butonlar"; örnek project-files/yaris-tasarim/sade/ust-*.png onaylı). Yayın sayfası ayrı (kendi sahibi).

- Üst lacivert (`.ck`): yuvarlak geri (`BackButton`), yanında başlık (liste "Yarışlar", detayda yarışın adı), sağda beyaz `+ Yarış` (`ck-btn`) ya da yuvarlak ⋯ (`btn btn-round`). Detayda altında tek satır: tarih · yer · kalan gün. Başlık bir kez yazılır.
- Sıradaki yarış mavi kart (`ck-plan`, Planlar'daki Bugün kartı gibi); altında Canlı ekran (beyaz) · Yayın (cam) (`RaceGo`, ortak `.btn`).
- Altı açık gri zemin, üstü yuvarlak (`.rzc-body`); satırlar beyaz kartta (`.rz-list`), satır 3.5rem (iPad'de net dokunma). Yan yana açılır satırlar (`Fold`) tek kart olur.
- Az kullanılanlar altta açılır "Diğer"de (Geçmiş yarışlar, Yarış takvimi, Siteden ekle); detayda ek işler ⋯ içinde.
- Sekmeler (`RaceSeg`) açık gövdenin başında; iPad yatayda solda lacivert, sağda gövde (`split`).
- Renk: mavi yalnız iş, yeşil tamam, sarı eksik, kırmızı yaklaşan/geçersiz.
- Parçalar `src/features/athletes/raceUi.jsx`, CSS globals.css "YARIŞ SADE" + "YARIŞ KART" (`main.rz.rzc`).

## Ortak eylemler (2026-11-09, onaylı örnek "Ortak eylemler")

- Ekle: lacivert üstte başlığın sağında `AddButton` ("+ Ürün"); pencere açar, ayrı sayfaya gitmez. Boşsa `Empty` (tek satır + ekle düğmesi).
- Pencere: `Sheet`. Telefonda yarım açılır, yukarı çekince tam boy; iPad'de ortada. İş düğmeleri `footer={<SheetActions … />}`: solda Vazgeç, sağda ana iş; düzenlemede solda kırmızı yazı "Sil". Yazı varsa `dirty` verilir.
- Seçim: `PickSheet` (iPad'de `anchor` ile düğmenin altında).
- Silme: geri alınabiliyorsa soru yok, `toast(…, { action: { label: "Geri al" } })`. Geri alınamıyorsa (para, toplu, gönderme) `useConfirm`. `window.confirm` kullanılmaz.

## Hareket (animasyon)

- Hareket yalnız bir şey olurken: dinleme, iş, konuşma, kayıt. Boşta ekranda sürekli dönen, nefes alan, kayan bir şey olmaz (ekran testi "Enerji (boşta)": saniyede en çok 3 stil hesabı).
- Yalnız `transform` ve `opacity` oynar. Bulanıklık (`filter`, `backdrop-filter`) hareketli öğede yok.
- Açılışta bir kez ve kısa (0,3–0,6 sn). `prefers-reduced-motion` açıksa hareket durur.
