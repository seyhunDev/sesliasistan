# Yayın: bugünün startları tek liste (2026-11-01)

## Nerede kaldım
- Seyhun: "sınıf/grup seçimi ile sıra ekleme birbirinden bağımsız olamaz; daha kullanıcı dostu olsun." Örnek onaylandı (project-files/samandira-donus/yayin3/ornek.png).
- Yayın sayfasında üstteki Grup/Sınıf/Bayrak çipleri kalktı. "Bugünün startları" tek liste: biten/süren startlar saatiyle, sonra bekleyenler (`raceLive.plan.order` artık `{ cls, grp, prep }`); ilk bekleyen "Sıradaki", sayacın üstünde yazar; Başlat onu `rounds[start]`'a yazıp listeden düşer. "Start ekle" satır ekler (son satırın sınıfı/bayrağıyla); satıra dokununca çipler + Yukarı / Aşağı / Çıkar / Tamam. Biten satıra dokununca düzeltme çipleri.
- Program kartı: İlk start (Bugün/Yarın + saat), "Bugün yarış yok" satırı, gün bitince yarının saati ve ekranın geçiş saati. Start ertelendi / Günü bitir liste altında.
- Herkese açık ekran `upcoming = plan.order` (yapılan start düşülmüş gelir).

## Sıradaki işler
- Bekleme ekranı yeniden tasarım (ince geri, ortada geri sayım, boş genel sıralama gizli, kartsız) — örnek bekleniyor.
