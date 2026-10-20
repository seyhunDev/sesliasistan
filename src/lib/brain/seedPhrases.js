// Hazır cümle veri seti: en sık işler için insanların gerçekte nasıl söylediği.
// Başlangıç verisidir; üstüne öğrenilen cümleler eklenir (seedMatch.js `withLearned`).
// Her iş:
//   id     işin adı (tekil, değişmez; öğrenilen cümleler bu adla bağlanır)
//   title  Türkçe kısa ad
//   kind   "read" telefondaki veriden hemen cevap, "do" bir iş yapar, "talk" sohbeti yönetir
//   route  uygulamadaki yönlendirme adayı (assistRoute.js `routesOf` id'si), ya da "ai"
//   quick  true: yapay zekaya gitmeden telefonda cevaplanabilir
//   keys   yakalama kalıpları (Türkçe harfsiz, küçük harf): kelimeler sırayla, aralarında en çok 3 kelime olabilir.
//          "oku*" kelimenin başı, "a|b" seçenek, "(?!l)" gibi ekler düzenli ifade olarak kelimenin başına uygulanır.
//   say    örnek cümleler (insan ağzından; uzun paragrafın içinde de yakalanmalı)
//   not    bu işe gitmemesi gereken benzer cümleler
export const SEED_V = 1;

export const SEED = [
  // ---- Okuma ve sorular (telefondaki veriden) ----
  {
    id: "notes.read", title: "Notları oku", kind: "read", route: "local", quick: true,
    keys: ["not* oku(?!l)*", "not* seslendir*", "not* anlat*", "not* ne var", "not* neler", "not* goster*", "son not* ne*", "not* soyle*"],
    say: ["notlarımı oku", "bugün eklediğim notları oku", "notlarımı okur musun", "son notumu oku", "notlarımda ne var", "notlarda neler var", "notları bana anlat", "notlarımı göster", "son notum neydi", "notları seslendir", "dün aldığım notları oku", "notlarımı bir okur musun bakalım"],
    not: ["not al yarın toplantı var", "okul notlarını ekle"],
  },
  {
    id: "plans.today", title: "Bugünün planları", kind: "read", route: "local", quick: true,
    keys: ["bugun* plan(?!la(?!r))*", "bugun* program*", "bugun ne var", "bugun neler var", "bugun ne yap*", "bugun nelerimiz var", "bugun neyimiz var", "bugun* takvim*", "bugun* ajanda*", "bugun hangi plan(?!la(?!r))*"],
    say: ["bugün planlarımız ne", "bugün neler var", "bugün ne var", "bugün hangi planlarımız var", "bugünkü programım ne", "bugün ne yapıyoruz", "bugünün planlarını oku", "bugün takvimde ne var", "bugün nelerimiz var", "bugünkü planları söyle", "bugün ajandamda ne var"],
    not: ["bugün planı iptal et", "yarın neler var"],
  },
  {
    id: "plans.tomorrow", title: "Yarının planları", kind: "read", route: "local", quick: true,
    keys: ["yarin* plan(?!la(?!r))*", "yarin ne var", "yarin neler var", "yarin* program*", "yarin ne yap*", "yarin nelerimiz var", "yarin* takvim*", "yarin hangi plan(?!la(?!r))*"],
    say: ["yarın neler var", "yarın ne var", "yarınki planlar ne", "yarın programımız ne", "yarın ne yapıyoruz", "yarın takvimde ne var", "yarın hangi planlarımız var", "yarınki planları oku"],
    not: ["yarın 10'da antrenman ekle"],
  },
  {
    id: "plans.week", title: "Bu haftanın planları", kind: "read", route: "local", quick: true,
    keys: ["bu hafta* plan(?!la(?!r))*", "bu hafta ne var", "bu hafta neler", "bu hafta* program*", "hafta* ozetle*", "bu hafta* takvim*", "haftaya ne var", "haftaya neler"],
    say: ["bu hafta neler var", "bu haftaki planlar ne", "haftayı özetle", "bu hafta programımız ne", "bu hafta takvimde ne var", "haftaya neler var", "bu haftanın planlarını oku"],
    not: [],
  },
  {
    id: "tasks.list", title: "Görevleri oku", kind: "read", route: "local", quick: true,
    keys: ["gorev* oku(?!l)*", "gorev* ne*", "gorev* goster*", "gorev* soyle*", "gorev* anlat*", "yapilacak* ne*", "yapilacak* oku(?!l)*", "bekleyen is*", "geciken* gorev*", "geciken is*", "kac gorev*", "hangi gorev*"],
    say: ["görevlerimi oku", "görevlerim neler", "yapılacaklar ne", "bekleyen işler neler", "geciken görevler var mı", "kaç görevim var", "bugünkü görevleri söyle", "yapılacaklar listesini oku", "hangi görevler kaldı", "görevlerimi göster"],
    not: ["görev ekle tekneyi boya", "motor yağı görevini tamamla"],
  },
  {
    id: "messages.unread", title: "Okunmamış mesajlar", kind: "read", route: "local", quick: true,
    keys: ["okunmamis mesaj*", "yeni mesaj* var", "mesaj* oku(?!l)*", "kim yaz*", "mesaj geldi*", "mesajim var mi"],
    say: ["okunmamış mesajlarım var mı", "yeni mesaj var mı", "mesajlarımı oku", "kim yazmış", "bana kim yazdı", "mesaj geldi mi", "son mesajları oku"],
    not: [],
  },
  {
    id: "weather", title: "Hava durumu", kind: "read", route: "local", quick: true,
    keys: ["hava* nasil", "hava* durum*", "ruzgar* kac", "ruzgar* nasil", "ruzgar* var mi", "yagmur* yag*", "kac derece", "hava* ne*"],
    say: ["hava nasıl", "yarın hava nasıl olacak", "bugün rüzgâr kaç knot", "rüzgâr nasıl", "yağmur yağacak mı", "kaç derece", "hava durumu ne", "yarın rüzgâr var mı"],
    not: [],
  },
  {
    id: "birthdays", title: "Doğum günleri", kind: "read", route: "local", quick: true,
    keys: ["dogum gun* kim*", "kim* dogum gun*", "yaklasan dogum gun*", "dogum gun* var mi", "bu ay dogum gun*"],
    say: ["bu ay kimlerin doğum günü var", "yaklaşan doğum günleri", "yakında doğum günü var mı", "bu hafta kimin doğum günü"],
    not: ["Ayşe'nin doğum günü 12 Mart"],
  },
  {
    id: "race.next", title: "Sıradaki yarış", kind: "read", route: "local", quick: true,
    keys: ["siradaki yaris*", "yaklasan yaris*", "yaris* ne zaman", "sonraki yaris*", "yaris* kac gun"],
    say: ["sıradaki yarış ne zaman", "yaklaşan yarışlar neler", "yarış ne zaman", "sonraki yarış hangisi", "yarışa kaç gün kaldı"],
    not: ["Foça yarışını aç"],
  },
  {
    id: "dues.unpaid", title: "Aidat ödemeyenler", kind: "read", route: "more", quick: true,
    keys: ["aidat* odemedi*", "aidat* odemeyen*", "aidat* vermedi*", "kim aidat*", "aidat* kim*", "aidat durum*"],
    say: ["bu ay kim aidat ödemedi", "aidatını ödemeyenler kim", "kimler aidat vermedi", "aidat durumu ne", "aidatları kim ödedi"],
    not: [],
  },
  {
    id: "cash.balance", title: "Kasa", kind: "read", route: "more", quick: true,
    keys: ["kasa* ne kadar", "kasa* kac", "kasa* para", "kasa* durum*"],
    say: ["kasada ne kadar var", "kasada kaç lira var", "kasada para kaldı mı", "kasa durumu ne"],
    not: [],
  },
  {
    id: "invoices.open", title: "Ödenmemiş faturalar", kind: "read", route: "ai", quick: false,
    keys: ["odenmemis fatura*", "fatura* var mi", "fatura* odenmedi", "acik fatura*", "bekleyen fatura*"],
    say: ["ödenmemiş fatura var mı", "açık faturalar neler", "hangi faturalar ödenmedi", "bekleyen fatura var mı"],
    not: ["Turkcell faturası ödendi"],
  },
  {
    id: "shopping.read", title: "Alışveriş listesi", kind: "read", route: "local", quick: true,
    keys: ["alisveris* liste* ne*", "alisveris* liste* oku(?!l)*", "liste* ne var", "listemi oku(?!l)*", "ne alaca*", "neler alaca*", "alinacak*"],
    say: ["alışveriş listesinde ne var", "listemi oku", "ne alacaktık", "neler alacağız", "alınacaklar neler", "alışveriş listesini oku"],
    not: ["listeye süt ekle"],
  },
  {
    id: "day.summary", title: "Günün özeti", kind: "read", route: "local", quick: true,
    keys: ["gun* ozetle*", "bugun* ozetle*", "bugun* ozet*", "gunun ozet*", "bugunu anlat*"],
    say: ["günü özetle", "bugünü özetle", "bugünün özeti ne", "bugünü bana anlat", "günün özetini oku"],
    not: [],
  },

  // ---- İşler ----
  {
    id: "plan.add", title: "Plan ekle", kind: "do", route: "ai", quick: false,
    keys: ["plan* ekle*", "takvim* ekle*", "takvim* yaz*", "takvim* koy*", "plan* yap*", "planla*", "plan* olustur*", "\\d+\\p{L}* \\p{L}+ ekle*", "toplanti* ekle*", "antrenman* ekle*"],
    say: ["yarın 10'da antrenman ekle", "cuma 18:30 veli toplantısını takvime ekle", "takvime yaz yarın tekne bakımı", "pazartesi sabah 9'a plan yap", "haftaya salı kamp planla", "yarın öğleden sonra toplantı planla", "takvime koy perşembe 5'te antrenman"],
    not: ["bugün planlarımız ne"],
  },
  {
    id: "task.add", title: "Görev ekle", kind: "do", route: "ai", quick: false,
    keys: ["gorev* ekle*", "gorev* olustur*", "yapilacak* ekle*", "yapilacak* yaz*", "hatirlat*", "gorev* ver*"],
    say: ["görev ekle tekneyi boya", "yapılacaklara ekle motor yağı", "bana yarın faturayı hatırlat", "Ali'ye görev ver römorku temizlesin", "yapılacaklara yaz can yeleklerini say", "yeni görev oluştur"],
    not: ["görevlerimi oku"],
  },
  {
    id: "note.add", title: "Not al", kind: "do", route: "ai", quick: false,
    keys: ["not al*", "not dus*", "not et*", "not* ekle*", "not* yaz*", "not olarak"],
    say: ["not al yarın toplantı var", "şunu not et malzeme odası dolu", "not düş Ali'nin bedeni M", "notlara ekle yeni yelken siparişi", "notlarıma yaz kapı kodu değişti", "bunu not olarak kaydet"],
    not: ["notlarımı oku"],
  },
  {
    id: "msg.send", title: "Mesaj gönder", kind: "do", route: "ai", quick: false,
    keys: ["mesaj at*", "mesaj gonder*", "mesaj yaz*", "haber ver*", "\\p{L}+(?:y?[ae])\\s+yaz", "\\p{L}+(?:y?[ae])\\s+soyle", "whatsapp*"],
    say: ["Ali'ye mesaj at yarın 10'da gelsin", "ekibe haber ver antrenman iptal", "sporculara yaz perşembe 9.30 antrenman", "Ayşe'ye söyle ders programını göndersin", "velilere mesaj gönder", "WhatsApp grubuna gönder"],
    not: [],
  },
  {
    id: "call", title: "Ara", kind: "do", route: "more", quick: true,
    keys: ["\\p{L}+(?:y?[iu])\\s+ara(?!s|d)*", "arar misin", "arama yap*", "telefon et*"],
    say: ["Ali'yi ara", "Zeynep'i arar mısın", "Mehmet'e arama yap", "Gökhan'ı ara", "anneme telefon et"],
    not: ["bu ay ne kadar aradım"],
  },
  {
    id: "task.done", title: "Görevi tamamla", kind: "do", route: "local", quick: true,
    keys: ["gorev* tamamla*", "is* bitir*", "tamamladim", "hallettim", "bitirdim", "gorev* bitti"],
    say: ["motor yağı görevini tamamla", "tekne işini bitirdim", "römork görevini tamamladım", "yelken işini hallettim", "o görev bitti"],
    not: [],
  },
  {
    id: "record.delete", title: "Kaydı sil", kind: "do", route: "ai", quick: false,
    keys: ["plan* sil*", "gorev* sil*", "not* sil*", "toplanti* sil*", "\\p{L}+ sil$", "kaldir", "iptal et*"],
    say: ["yarınki toplantıyı sil", "motor yağı görevini sil", "o notu sil", "antrenman planını sil", "bunu kaldır", "yarınki antrenmanı iptal et"],
    not: [],
  },
  {
    id: "record.postpone", title: "Ertele ya da saat değiştir", kind: "do", route: "ai", quick: false,
    keys: ["ertele*", "\\d+\\p{L}*\\s+(?:al|cek)$", "saat* yap", "baska gun* al*", "gun* degistir*", "saat* degistir*"],
    say: ["antrenmanı yarına ertele", "toplantıyı 11'e al", "saatini 3 yap", "planı başka güne al", "saatini değiştir"],
    not: [],
  },
  {
    id: "attendance", title: "Yoklama", kind: "do", route: "attendance", quick: false,
    keys: ["yoklama*", "antrenman* gel(?!\\p{L}*\\s+m[iu](?!\\p{L}))*", "antrenman* katil*", "antrenman* gelmedi*"],
    say: ["yoklama al Ali ve Ayşe geldi", "bugün antrenmana Mustafa geldi", "Emre antrenmana gelmedi", "yoklamaya ekle Deniz katıldı", "bugün antrenmana kimse gelmedi"],
    not: ["antrenmana Ali geldi mi"],
  },
  {
    // "antrenmana kim geldi" yoklama almaya da uyar; buradaki kalıp daha uzun sayılsın diye (?!\s+…) eki var
    id: "attendance.read", title: "Yoklama sorusu", kind: "read", route: "more", quick: true,
    keys: ["kim(?!se)* (gel|katil)*", "antrenman* kim(?!se)(?!\\s+yok)* (gel|katil)*", "(gel|katil)* kim(?!se)*", "antrenman* (geldi|katildi|gelmedi|katilmadi) mi*", "(dun|bugun) (geldi|katildi|gelmedi|katilmadi) mi*", "kac (sporcu|kisi) (gel|katil)*", "kac antrenman* (gel|katil)*", "en cok kim(?!se)* (gel|devamsiz)*", "yoklama* kim(?!se)*"],
    say: ["bugünkü antrenmana kimler katıldı", "bugün antrenmana kim geldi", "dün kimler gelmedi", "dün gelmeyenler kimdi", "Ali bugün antrenmana geldi mi", "Ayşe dün katıldı mı", "bugün kaç sporcu geldi", "bu ay Ali kaç antrenmana katıldı", "bu hafta en çok kim gelmedi", "pazartesi kimler geldi", "yoklamada kimler var"],
    not: ["Ali geldi Ayşe gelmedi", "bugün antrenmana kimse gelmedi", "gelmeyenlerin velilerine haber ver"],
  },
  {
    id: "shopping.add", title: "Listeye ekle", kind: "do", route: "shopping", quick: true,
    keys: ["liste* ekle*", "liste* yaz*", "alisveris* ekle*", "liste* koy*"],
    say: ["listeye süt ekle", "alışveriş listesine ekmek yaz", "listeye çay şeker koy", "alışverişe deterjan ekle"],
    not: ["listemi oku"],
  },
  {
    id: "page.open", title: "Sayfa aç", kind: "do", route: "navigate", quick: true,
    keys: ["\\p{L}+ (?:sayfa\\p{L}*|ekran\\p{L}*) (?:ac|git|goster)\\p{L}*", "\\p{L}+(?:i|ı|u|ü|yi|yı|yu|yü|leri|lari) ac$", "\\p{L}+(?:a|e|ya|ye) git$", "geri don*"],
    say: ["planlar sayfasını aç", "fişleri aç", "yarışlara git", "ayarları aç", "mesajlar ekranına git", "geri dön"],
    not: [],
  },

  // ---- Sohbet ----
  {
    id: "close", title: "Kapat", kind: "talk", route: "close", quick: true,
    keys: ["^kapat*", "kapat$", "^tesekkur*", "tesekkurler$", "^yeter$", "^tamam kapat", "gorusuruz"],
    say: ["kapat", "tamam kapat", "teşekkürler", "teşekkür ederim kapatabilirsin", "yeter", "görüşürüz"],
    not: [],
  },
  {
    id: "stop", title: "Sus / dur", kind: "talk", route: "close", quick: true,
    keys: ["^sus$", "^dur$", "^dur dur", "okumayi kes*", "sesi kes*", "^sus artik"],
    say: ["sus", "dur", "dur dur", "okumayı kes", "sesi kes", "sus artık"],
    not: [],
  },
  {
    id: "repeat", title: "Tekrar oku", kind: "talk", route: "local", quick: true,
    keys: ["tekrar oku*", "tekrar soyle*", "bir daha soyle*", "bir daha oku*", "tekrarla*", "anlamadim"],
    say: ["tekrar oku", "bir daha söyler misin", "tekrarla", "anlamadım bir daha oku", "son cevabı tekrar söyle"],
    not: [],
  },
  {
    id: "undo", title: "Geri al", kind: "do", route: "undo", quick: true,
    keys: ["^geri al*", "son kayd* sil*", "son kayd* geri al*", "az once ekledi\\p{L}* sil*", "vazgectim"],
    say: ["geri al", "son kaydı geri al", "az önce eklediğimi sil", "vazgeçtim geri al"],
    not: ["antrenman iptalini geri al"],
  },
  {
    id: "help", title: "Yardım", kind: "talk", route: "local", quick: true,
    keys: ["neler yapabilir*", "ne yapabil*", "^yardim", "nasil kullan*"],
    say: ["neler yapabilirsin", "yardım", "ne yapabiliyorsun", "bunu nasıl kullanırım"],
    not: [],
  },
];
