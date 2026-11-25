## Nerede kaldım

- Canlı kaynaklar (Seyhun 2026-11-02 "drone 1, 2, 3; birden fazla yayını alıp seçerek ekrana göndereyim; önce ben göreyim"; örnek project-files/drone-yayin/coklu/ornek.png onaylandı): Yayın › Video'da Önizleme (yalnız sayfada, veriye yazılmaz) + Ekranda iki ekran, Canlı kaynaklar kutucukları (+ Kaynak: Drone/Telefon/Kamera, bağlantı, Kaynağı sil), Kayıtlar. Veri `raceLive.stream.sources` [{id, name, kind, url}], ekranda `screen.kind "src"` + `screen.src`; eski `stream.url`/`stream.drone` Kamera 1 (c1) / Drone 1 (d1)'den dolar. "Grubun kamerası" kutucuğu (kind live) yalnız Kameralar'da grup bağlıysa görünür (yayın sohbetinin camBy'si). Yayında göstergesi `/api/yayin-durum` (YOUTUBE_API_KEY; kanal bağlantısında /live sayfasının canonical adresi, sonra videos.list 1 birim; 45 sn bellek; sayfa 45 sn'de bir sorar). Gerçek dron/telefon yayınıyla denenmedi.

## Sıradaki işler

- İlk gerçek yayında "Yayında" göstergesini dene (kanal bağlantısı canonical okuması YouTube değişirse bozulabilir; o zaman search.list'e geçilir, kota 100 birim).

## Asistan

- "ekranda drone 2'yi göster", "telefon 1'i ekrana ver" → screenCommand { kind: "src", say } → sourceBySay (lib/raceRounds.js), screenSay (liveActions.js).
