## Nerede kaldım

- Asistan açılış düzeni "A · Tek kapsül" (Seyhun seçti, 2026-10-23, örnek https://claude.ai/artifact/RNzQYp8mWyHAd11vwBLGo5): yan düğmeler (× Kapat, ⌨ Yaz, Dur, Devam) kalktı. Altta tek kutu: solda Fotoğraf, ortada "Sor ya da ekle…" (dokun: yaz), sağda küçük ses düğmesi (dokun konuş, basılı tut yaz). Kod: src/features/home/TabBar.jsx AssistBox + OrbMain `small`; stil globals.css `.apill`.
- Dinlerken: solda ■ Dur, ortada "● Dinliyorum · süre". Taslakta: solda × (sil ve kapat), ortada "Düzelt", 🎤 Devam, sağda ↑ Gönder. İş/konuşma sürerken ortada noktalar.
- Kapatma: boş bulanık alana dokun ya da aşağı çek (dinlerken ve taslak varken boş alan kapatmaz). Asistan ekran testi buna göre güncellendi (120/120).

## Sıradaki işler

- Telefonda dene: kutunun belirişi, Fotoğraf, dinle/Dur/Gönder, boş alana dokununca kapanma.

## Tasarım

- Asistan açıkken yan düğme yok; her şey alttaki tek kutuda (A · Tek kapsül). Ayrı × ve klavye düğmesi geri getirilmez.
