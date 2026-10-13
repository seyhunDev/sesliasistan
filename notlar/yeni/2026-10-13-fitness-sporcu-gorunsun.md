## Nerede kaldım

- Fitness'ta + ve Sporcular satırı görünmüyordu (Seyhun: "fitness sayfasında artı butonu göremedim, kimin için oluşturacağımızı belirleyeceğimiz"): kendi programı olmayan ana hesapta sayfa tanıtım ekranıyla açılıyordu, + ve Sporcular orada yoktu. Artık uygulamada hesabı olan sporcu varsa tanıtım yerine normal Fitness sayfası açılır: sağ üstte +, "Henüz programın yok", Sporcular satırı (FitnessHome.jsx). Sporcu yoksa tanıtım eskisi gibi. Telefonda denenmedi.

## Sıradaki işler

- GitHub'dan Netlify yayını çalışmıyor: "Netlify yayın" iş akışı gizli bilgiler (`NETLIFY_AUTH_TOKEN`, `NETLIFY_SITE_ID`) olmadığı için adımları atlıyor. Eklenene kadar Mac'ten `netlify deploy --build --prod`.
