## Nerede kaldım

- Sporcular (`/athletes`) ve Yoklama (`/athletes/attendance`) yeni tasarıma geçti (lacivert kokpit).
- Sporcular: lacivert üstte "+ Sporcu", Yoklama ve Yarışlar düğmeleri, arama kutusu, sınıf çipleri. Altta belge uyarısı tek satır (dokununca açılır), "SPORCU N" başlığı ve sağında "Uygulamaya ekle", sporcu listesi (sağda "Belge bitti" ya da "Uygulamada"). Arşiv düğmesi listenin altında ("Arşiv (N)" / "Arşivi gizle").
- Yoklama: lacivert üstte rapor ve ses adları düğmeleri, gün seçimi (Bugün · Çar 21 Eki), Geldi/Gelmedi/İzinli/Boş sayıları, "Hepsi geldi" ve "Kalanlar yok", sınıf çipleri. Altta sporcu satırları (`RollRows`, RollView.jsx). Antrenman penceresindeki yoklama eski düzeniyle (RollView) kaldı, satırlar ortak.
- Telefonda denenmedi.

## Sıradaki işler

- Sıradaki sayfayı Seyhun'a sor (sporcu detayı ve yoklama raporu hâlâ eski tasarımda).

## Tasarım

- Arama kutusu ve süzgeç çipleri lacivert üstte durur (`ck-glass`; seçili çip beyaz).
