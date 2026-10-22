## Nerede kaldım

- Yalnız istenen (Seyhun 2026-10-22): "Enes'in teknesinin tamiri için plan oluştur" dedi; yapay zeka plana Hüseyin'i sorumlu yazdı (sorumluya bildirim gider), mesaj atmaya çalıştı. Artık kullanıcının cümlesinde işi birine verme sözü yoksa (ver, ata, görevlendir, sorumlu, yaptır, bırak, "Ali yapsın/halletsin", "Ali'nin görevi") yapay zekanın seçtiği sorumlu atılır; "olsun, kalsın, başlasın" atama sayılmaz. Mesaj sözü yoksa (yaz, söyle, haber, sor, ilet, mesaj, gönder, bildir) kayıt isteğine eklenen mesaj atılır. İstemde de kural var. Test: test:asistan › "Yalnız istenen (sorumlu, mesaj)". Telefonda denenmedi.

## Sıradaki işler

- "Ali'ye yarın 10'da tekne bakımı planı ekle" gibi fiilsiz yönelme artık atama sayılmıyor; Seyhun bunu atama olarak isterse söz listesine eklenir.

## Asistan

- Sorumlu ve mesaj yalnız istenirse (lib/ai/assistant.js onlyAsked, MSG_CUE).
