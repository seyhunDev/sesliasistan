## Nerede kaldım
- Bilgi › Yönet bas konuş yeniden (Seyhun 2026-11-22 örnek onaylandı, "profesyonel, sade, kullanışlı"): sporcular yukarıdan aşağı liste (`TalkRow`; iPad ve yatayda sağda boydan boya panel, telefonda altta ~3 satır kayan), satıra dokununca hedef seçilir, "Hepsi" en üstte. Satırın sağında son gidenin durumu (`rowSt` / `allSt`: Gidiyor…, ✓ saat, ✓✓ saat, Görmedi, Ulaşmadı).
- Tek büyük konuş düğmesi (`PttBig`): Hazır (kime) → Mikrofon açılıyor… → Kaydediliyor · N sn (ses seviyesi çubukları) → Gönderiliyor… → ✓ İletildi / ✓✓ Görüldü; uzağa kaydırınca kırmızı "Bırak: iptal"; kısa dokunuşta "Basılı tut". Ulaşmazsa altta eski "Tekrar" satırı.
- `usePtt` yeni alanlar: `arm` (basıldı, mikrofon açılıyor), `tap` (kısa dokunuş), `lvl` (ses seviyesi, AnalyserNode). Sporcu ekranı aynı kancayı kullanır, davranışı değişmedi.
- Artık isim çipine basılı tutarak konuşulmuyor; önce satır seçilir, sonra büyük düğme.

## Sıradaki işler
- iPad ve telefonda gerçek mikrofonla denenmedi (ses seviyesi iPhone'da AudioContext açılmazsa çubuklar küçük kalır).
