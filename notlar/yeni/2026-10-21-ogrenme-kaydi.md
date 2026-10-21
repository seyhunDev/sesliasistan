## Nerede kaldım

- Öğrenme kaydı: yapay zeka her asistan cevabında kısa bir `learn` döndürür (iş adı, cümle kalıbı `{gün} {saat}'te {başlık} ekle`, yerlerin değerleri, ses tanıma düzeltmeleri, güven). Temizleyici `src/lib/ai/assistant.js` cleanLearn.
- Kayıt iş ✓ bitince 2 dk bekletilir; o sürede "geri al", "yanlış", "X değil Y" ya da aynı cümle yeniden söylenirse yanlış, söylenmezse doğru yazılır. Hata, ✗, vazgeç, Dur hemen yanlış.
- Saklama: aynı aylık öğrenme belgesinin `pats` dizisi (örneklerle aynı yazmada), silinen kalıplar `drop` dizisinde. Ek okuma yok, firestore.rules değişmedi.
- Kalıp 10 kez ve %90 doğruysa "hazır". Hazır cevaplar açıkken hazır kayıt ekleme kalıpları (plan/görev/not) yapay zekasız yapılır; kapalıyken yalnız birikir.
- Ayarlar › Öğrenme: "Öğrenilen kalıplar" listesi (doğru/kez, hazır, Sil, Kopyala).
- Ad düzeltmeleri (`fixes`) sttFixes'e gider (yalnız bilinen adlar).
- Telefonda denenmedi. Ek maliyet: cevap başına ~40-60 çıktı tokenı.

## Sıradaki işler

- Birkaç gün sonra Ayarlar › Öğrenme › Öğrenilen kalıplar › Kopyala çıktısına bakıp kalıpların tutarlı olup olmadığını kontrol et.
- Hazır kalıplar yalnız kayıt eklemede kullanılıyor; tamamlama, sayfa açma gibi işler sonraki adım.

## Asistan

- Öğrenme kaydı (`learn`) her yapay zeka cevabının sonunda gelir; şemada en sonda kalmalı (okunacak metin önce gelsin).
- Kalıp anahtarında yerden sonraki ek sayılmaz (`{saat}'te` = `{saat}'de`), aiPatterns.js patKey.
