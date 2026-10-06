## Nerede kaldım
- Notta "Yapıldı" (Seyhun: "not işlevini bitirdi, silmek istemiyorum; yapıldı dediğinde arşive atılsın"; telefonda denenmedi): işi biten not silinmez, "Yapıldı" denir ve Arşiv'e gider. Notlar listesinde notu sola kaydırınca düğmeler Yapıldı · Sabitle · Sil (ayrı "Arşivle" kalktı, Yapıldı onun yerine); bildirimde "Geri al". Not ekranında "Yapıldı" kartı (basınca ekran kapanır); Arşiv'deki notu açınca "Yapıldı · tarih" ya da "Arşivde" ve "Notlara geri al". Arşiv tablosunda not durumu "Yapıldı" (yeşil) ya da eski arşivlenenler için "Arşivlendi"; satırdaki düğme "Notlara geri al". Notta yeni alanlar `done`, `doneAt` (+ `archived`, `archivedAt`; `noteDonePatch`, `noteReopenPatch`, `noteStateText`, src/lib/noteState.js). Asistan: "malzeme odası notu yapıldı", "şu notu arşivle" → yapay zeka işlemi `done_note` (onaysız hemen, "Yapıldı, Arşiv'e kaldırdım: …"); "notu geri al / arşivden çıkar" → `reopen_note`. Not göreve çevrilmez, silinmez. Veri özetinde SON NOTLAR artık yalnız açık notlar, ayrıca "ARŞİVDEKİ SON NOTLAR" (5, "| yapıldı"/"| arşivde"). Görev tanımı `noteDone` (assistTasks.js). Firestore'a ek okuma yok, kural değişikliği yok. Testleri `test:asistan` › "Not yapıldı (arşiv)".

## Sıradaki işler
0. Notu yapıldı yap: Notlar'da bir notu sola kaydır › Yapıldı; listeden kalkmalı, Arşiv › Notlar'da "Yapıldı" görünmeli, "Notlara geri al" ile dönmeli. Bir notu açıp "Yapıldı"ya bas. Asistana "… notu yapıldı" de.

## Asistan
- Not silinmez, işi bitince "Yapıldı" denir ve Arşiv'e gider (geri alınabilir); notu göreve çevirme (Seyhun'un isteği, 2026-10-06).
