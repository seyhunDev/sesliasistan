## Nerede kaldım
- Yayın › Parkur'da sesle giriş "dokun, konuş, gönder" oldu (CourseTalk.jsx): asistan düğmesine bir dokunuş → alt pencere dinler (90 sn'ye kadar, sessizlikte kendiliğinden bitmez), yazı akar; Gönder ya da sonda "gönder" deyince courseVoice çözer, applyCourseVoice hemen yazar, değişen kutular bir an mavi parlar. Düğmeler: dinlerken İptal · Gönder; işlerken Vazgeç · Çözümlüyorum (dönen halka); bitince Geri al · Devam konuş; hata İptal · Tekrar dene (yazı silinmez).
- Uzun anlatım (120 harf üstü ya da çok cümle) önce parkur yapay zekâsına gider: /api/course-parse artık kart türü (card), rota (route), grubun kartı (grp) ve sağanak (gust) da döndürür; uzun metinde 1200 belirteç, 9 sn. Kısa cümlede eskisi gibi önce telefondaki kurallar.
- Geri al: parkur yazımdan önceki hâline döner (saveCourse, tek adım). Ana asistan (courseView.apply) da aynı yazıcıyı kullanır.

## Sıradaki işler
- Telefonda denenmedi; iPhone'da uzun kayıt çevirisi (/api/transcribe) 9,5 sn sınırına takılabilir, uzun konuşmada bakılmalı.
