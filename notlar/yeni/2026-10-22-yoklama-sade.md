## Nerede kaldım

- Yoklama sayfası (`/athletes/attendance`, RollPanel.jsx) Seyhun'un onayladığı "Sade yoklama" örneğine göre yeniden yapıldı: sayfa baştan sona lacivert (`navy page-navy`), üstte geri + Yoklama + ⋯; ana sayfadaki gibi son 7 günün kutuları (bugün beyaz, yoklama alınan günde yeşil nokta); tek satır özet "6 / 8 işaretli" ve renkli ince çizgi; altta sporcular. Okların, dört büyük sayının, Hepsi geldi / Kalanlar yok düğmelerinin ve sınıf çiplerinin yerine ⋯ penceresi geldi (Hepsi geldi, Kalanlar yok, Sınıf, Ay raporu, Ses adları; eksik ses adı sayısı ⋯ üzerinde kırmızı). Antrenmandaki yoklama penceresi (inSheet) değişmedi. Tarayıcıda denendi, telefonda denenmedi.

## Sıradaki işler

- Alt sekme çubuğu lacivert sayfalarda açık renk kalıyor; istenirse lacivert yapılabilir.

## Tasarım

- Lacivert tam sayfa için `<main data-theme="dark" className="navy page-navy">`; `page-navy` gövdeyi de lacivert yapar (alt boşlukta şerit kalmaz).
