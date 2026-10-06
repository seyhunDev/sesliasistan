## Nerede kaldım

- Ana sayfa sadeleşti (Seyhun: "çok fazla buton var, daha organize olsun"; Seçenek A; telefonda denenmedi): 19 düğmelik İŞLEMLER yerine KISAYOLLAR: en çok 6 düğme, varsayılan Planlar, Notlar, Sporcular, Yoklama, Toplantı, Envanter (bu kişide olmayanın yerine grupların sırasıyla tamamlanır). Altında "Tüm sayfalar" satırı: alttan açılan pencerede bütün sayfalar eskisi gibi 4 grupta (Günlük, Kulüp, Yönetim, Sosyal). Pencerede "Kısayolları düzenle" ile düğmelere dokunup kısayol seçilir (en çok 6), seçim profilde `users/{uid}.homeLinks` (`shortcutsOf`, `toggleShortcut`, `DEFAULT_SHORTCUTS`, homeTiles.js; HomeActions.jsx). ÖZET'te Fatura ve Fişler kartları birleşti: tek "Fiş / Fatura" kartı (büyük satır ayın fiş harcaması, açık fatura varsa alt satır "Fatura: 2 ödenmedi · …", sarı uyarı; `fisTile`, HomeSummary.jsx). Ekranda 26 kutu yerine 12 kutu + Tüm sayfalar. Kural değişikliği yok. Plan: `/mnt/project-files/ana-sayfa/duzen-plani.md`. Testleri `test:elle` › "Ana sayfa kartları" › "kısayollar".

## Sıradaki işler

- Ana sayfayı telefonda dene: 6 kısayol ve "Tüm sayfalar" görünüyor mu; pencerede "Kısayolları düzenle" ile bir düğmeyi çıkarıp başkasını ekle, ana sayfada değişiyor mu. Fiş / Fatura kartında açık fatura bilgisi doğru mu. Çalışan ve veli hesabıyla da bak.

## Tasarım

- Ana sayfa: üstte bilgiler (Senin için, Bugün, ÖZET kartları), altta en çok 6 KISAYOL + "Tüm sayfalar" penceresi. Özet kartı olan sayfa kısayollarda varsayılan olarak tekrar edilmez; kişi kısayollarını kendisi seçer (2026-10-06).
