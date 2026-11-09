## Nerede kaldım
- Yarış ekleme üç yol (Seyhun 2026-11-09 "TFF'den seç, manuel, talimatla"; örnek e3/yp "Yap"): "+ Yarış" penceresi ve /athletes/races/new sayfası aynı gövde (RaceAddSheet.jsx › RaceAdd): üstte TFF'den seç · Talimatla · Elle.
- TFF'den seç: federasyon listesi (ana hesap), son 14 günde sitede ilk görülenlerde "Yeni" (loadSiteList yanıtı fresh). Talimatla: NoticeRows (Dosya seç, Metin yapıştır; kart/ikon/açıklama yok). Elle: yurt içi/dışı, ad, tarih, il/ilçe, "Yarışı ekle".
- Pencerede Talimatla/Elle işi raceDraft.js ile yeni yarış sayfasına aktarılır (RaceEditor açılışta alır). Yeni yarış sayfası lacivert (globals.css main:has(.ra-page)).
- TFF listesi her açılışta siteden okunur (sunucu kaydı en çok 3 saat), saatte bir yeni yarış taraması bildirim gönderir.

## Sıradaki işler
- "Sitede yeni yarış" bildirimi /athletes/races/new'e yönlendirilebilir (Belge çalışması).
