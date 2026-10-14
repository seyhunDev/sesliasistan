## Nerede kaldım

- Asistan aşağı çekilince küçülüyor (Seyhun: "asistanı indirince çalışıyorsa sağ altta küre olarak dursun, dinlemeye devam etsin, kapanmasın"; örnek `/mnt/project-files/asistan/kucuk-kure-ornek.png` onaylandı; telefonda denenmedi): asistan dinlerken, çalışırken ya da konuşurken aşağı çekilirse kapanmaz; tam ekran kalkar, sağ altta sekme çubuğunun üstünde durum renginde küçük küre kalır (kırmızı dinliyor, kehribar çalışıyor, mavi konuşuyor, yeşil bitti). Yanında tek satır: dinlerken söylenen, çalışırken o anki iş, sonra son cevap. Sayfalarda gezinilebilir, asistan dinlemeye ve işe devam eder. Küreye ya da satıra dokununca tam ekran döner, küreye basılı tutunca kapanır. Ortadaki asistan düğmesine dokunmak da tam ekranı açar. Boştayken aşağı çekmek eskisi gibi kapatır (`mini`, `MiniOrb`, TabBar.jsx; `miniText`, `pullAction`, src/lib/miniOrb.js). Küçükken onay kartları görünmez; sesle "evet/hayır" denebilir ya da küreye dokunulur. Testi `test:asistan` › "Küçülen asistan küresi".
- iPhone sınırı: uygulama arka plana geçince ya da ekran kilitlenince Safari mikrofonu kapatır; küre yalnız uygulama açıkken dinler.

## Sıradaki işler

- Telefonda dene: asistana konuşurken aşağı çek, küre sağ altta kalmalı; başka sayfaya geç, cevap küre yanında görünmeli; küreye dokun, tam ekran gelmeli; basılı tut, kapanmalı.
