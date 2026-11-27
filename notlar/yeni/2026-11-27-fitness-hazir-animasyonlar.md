## Nerede kaldım
- Fitness hareket animasyonları Higgsfield'da (Claude bağlayıcısı, Kling 3.0 Omni, 5 sn, sessiz, 5 kredi) hazır programın fotoğraflarından üretiliyor (Seyhun 2026-11-27). Ayakta yapılanlarda solda kız sağda erkek yan yana; yerde yapılanlarda tek kişi, hareketten harekete kız/erkek sırayla. Erkek önce GPT Image 2.6 ile kız fotoğrafından çizilir (1 kredi).
- Videolar Higgsfield sandbox'ında küçültülür (≈0,2–0,4 MB) ve Higgsfield'ın kalıcı adresine konur; liste `src/lib/fitness/animList.js` (ANIMS: id, name). Hareketler › "Animasyonlar N" (yalnız eksik varsa görünür, ana hesap): `/api/fitness-anim` action "import" videoyu indirip Storage'a (orgs/{org}/fitMedia) yazar, harekete `{ a: true, hf: id }` eklenir (eskisinin yerine), alınan tekrar alınmaz. storage.rules değişmedi.
- İlk 3: Sırt çantalı squat (yan yana), Sırt çantalı split squat (yan yana), Side plank kısa kol (kız). Dead bug 3 denemede olmadı (çapraz kol/bacak), fotoğrafla kaldı. İlerleme ve adresler: proje dosyaları `fitness-animasyon/liste.md`.

## Sıradaki işler
- Seyhun Hareketler › Animasyonlar'a bassın, antrenmanda videonun oynadığını telefonda görsün.
- Kalan hareketler tek tek üretilecek (her birinde Seyhun "devam" der, harcanan kredi yazılır); her yeni video animList.js'e eklenir.
