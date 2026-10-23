## Nerede kaldım

- Not sayfasında Yapıldı hatası düzeltildi (Seyhun 2026-10-23 "yapıldı dedikten sonra hatalı davranışlar var"). Sahte Firebase'le tarayıcıda denendi:
  - Yeni not yazıp hemen Yapıldı'ya basınca not Yapıldı olmuyordu; liste açılmışken adres `/notes/<kimlik>` oluyordu (alandan çıkış kaydı ile Yapıldı kaydı yarışıyordu). Artık ikisi aynı yazmayı bekliyor, yazılırken eklenen harfler de kaydediliyor.
  - Yapıldı ve Sil sonrası liste `replace` ile açılıyor: geri gelince biten not yeniden açılmıyor.
  - Var olan notta Yapıldı yalnız o notu işaretliyordu (başka notlar etkilenmiyor, denendi).

## Sıradaki işler

- Not detay sayfasının yeni tasarımı (Yapıldı onayı animasyonlu); örnek Seyhun'un onayında.
