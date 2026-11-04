// İngilizce kalıplar (Seyhun 2026-11-02: "kalıplarla kelimeleri öğreneceğim, tek tek kelime öğrenmek istemiyorum… kalıp bloklama").
// Her kalıp bir cümle iskeleti: baş (head) + boşluk + son (tail). Boşluğa giren parçalar (fills) kelimeleri kalıbın içinde öğretir.
// fills satırı: [boşluğa giren İngilizce, onun Türkçesi (cümledeki hâli), bütün cümlenin Türkçesi]
// tr: kalıbın Türkçe karşılığı ("…" boşluk). rule: kısa kullanım notu. near: Kur adımında karıştırılabilecek yanlış baş (çeldirici).
// Kimlik (id) değişmez: ilerleme destede bu kimlikle tutulur (englishChunkStudy.js).
export const CHUNK_TOPICS = ["Günlük konuşma", "Fikir ve duygu", "İş ve plan", "Yolculuk ve dışarıda", "Spor ve kulüp"];

const C = (id, topic, head, tail, tr, rule, near, fills) => ({ id, topic, head, tail, tr, rule, near, fills });

export const CHUNKS = [
  // ---- Günlük konuşma ----
  C("look-forward", "Günlük konuşma", "I'm looking forward to", "", "…i dört gözle bekliyorum", "look forward to + isim / -ing", "I'm used to", [
    ["seeing you", "seni görmeyi", "Seni görmeyi dört gözle bekliyorum."],
    ["the weekend", "hafta sonunu", "Hafta sonunu dört gözle bekliyorum."],
    ["working with you", "seninle çalışmayı", "Seninle çalışmayı dört gözle bekliyorum."],
    ["hearing from you", "senden haber almayı", "Senden haber almayı dört gözle bekliyorum."],
    ["the race", "yarışı", "Yarışı dört gözle bekliyorum."],
  ]),
  C("do-you-mind", "Günlük konuşma", "Do you mind if I", "?", "…sam sorun olur mu?", "Do you mind if I + fiil (kibar izin)", "Would you like to", [
    ["sit here", "buraya otursam", "Buraya otursam sorun olur mu?"],
    ["open the window", "pencereyi açsam", "Pencereyi açsam sorun olur mu?"],
    ["join you", "size katılsam", "Size katılsam sorun olur mu?"],
    ["borrow your pen", "kalemini ödünç alsam", "Kalemini ödünç alsam sorun olur mu?"],
    ["call you later", "seni sonra arasam", "Seni sonra arasam sorun olur mu?"],
  ]),
  C("used-to", "Günlük konuşma", "I'm used to", "", "…e alışkınım", "be used to + isim / -ing", "I used to", [
    ["getting up early", "erken kalkmaya", "Erken kalkmaya alışkınım."],
    ["cold water", "soğuk suya", "Soğuk suya alışkınım."],
    ["working at night", "gece çalışmaya", "Gece çalışmaya alışkınım."],
    ["strong winds", "sert rüzgâra", "Sert rüzgâra alışkınım."],
    ["the noise", "gürültüye", "Gürültüye alışkınım."],
  ]),
  C("i-used-to", "Günlük konuşma", "I used to", "", "eskiden …rdım", "used to + fiil (eskiden yapardım, artık değil)", "I'm used to", [
    ["live in Istanbul", "İstanbul'da yaşa", "Eskiden İstanbul'da yaşardım."],
    ["play football", "futbol oyna", "Eskiden futbol oynardım."],
    ["smoke", "sigara iç", "Eskiden sigara içerdim."],
    ["sail every day", "her gün yelken yap", "Eskiden her gün yelken yapardım."],
    ["hate coffee", "kahveden nefret et", "Eskiden kahveden nefret ederdim."],
  ]),
  C("how-about", "Günlük konuşma", "How about", "?", "…ya ne dersin?", "How about + isim / -ing (öneri)", "What if", [
    ["a coffee", "bir kahve", "Bir kahveye ne dersin?"],
    ["going for a walk", "yürüyüşe çıkmak", "Yürüyüşe çıkmaya ne dersin?"],
    ["Friday", "cuma", "Cumaya ne dersin?"],
    ["meeting at the club", "kulüpte buluşmak", "Kulüpte buluşmaya ne dersin?"],
    ["ordering pizza", "pizza söylemek", "Pizza söylemeye ne dersin?"],
  ]),
  C("can-you-help", "Günlük konuşma", "Could you help me", "?", "…mde bana yardım eder misin?", "help me + fiil / with + isim", "Could you tell me", [
    ["carry this", "bunu taşıma", "Bunu taşımama yardım eder misin?"],
    ["with the bags", "çantalarda", "Çantalarda bana yardım eder misin?"],
    ["find my phone", "telefonumu bulma", "Telefonumu bulmama yardım eder misin?"],
    ["fix the sail", "yelkeni onarma", "Yelkeni onarmama yardım eder misin?"],
    ["with this form", "bu formda", "Bu formda bana yardım eder misin?"],
  ]),
  C("on-my-way", "Günlük konuşma", "I'm on my way to", "", "…e gidiyorum, yoldayım", "on my way to + yer (on my way home: eve)", "I'm going to", [
    ["the club", "kulübe", "Kulübe gidiyorum."],
    ["work", "işe", "İşe gidiyorum."],
    ["the airport", "havalimanına", "Havalimanına gidiyorum."],
    ["the harbour", "limana", "Limana gidiyorum."],
    ["the meeting", "toplantıya", "Toplantıya gidiyorum."],
  ]),
  C("dont-forget", "Günlük konuşma", "Don't forget to", "", "…mayı unutma", "Don't forget to + fiil", "Don't worry about", [
    ["call me", "beni ara", "Beni aramayı unutma."],
    ["lock the door", "kapıyı kilitle", "Kapıyı kilitlemeyi unutma."],
    ["bring your life jacket", "can yeleğini getir", "Can yeleğini getirmeyi unutma."],
    ["drink water", "su iç", "Su içmeyi unutma."],
    ["send the photos", "fotoğrafları gönder", "Fotoğrafları göndermeyi unutma."],
  ]),

  // ---- Fikir ve duygu ----
  C("it-depends", "Fikir ve duygu", "It depends on", "", "…e bağlı", "depend on + isim (on, in değil)", "It's up to", [
    ["the weather", "havaya", "Havaya bağlı."],
    ["the price", "fiyata", "Fiyata bağlı."],
    ["how I feel", "nasıl hissettiğime", "Nasıl hissettiğime bağlı."],
    ["the wind", "rüzgâra", "Rüzgâra bağlı."],
    ["what you want", "ne istediğine", "Ne istediğine bağlı."],
  ]),
  C("im-not-sure", "Fikir ve duygu", "I'm not sure if", "", "…mı emin değilim", "not sure if + cümle", "I'm sure that", [
    ["I can come", "gelebilir miyim", "Gelebilir miyim emin değilim."],
    ["it's a good idea", "iyi bir fikir mi", "İyi bir fikir mi emin değilim."],
    ["they are open", "açıklar mı", "Açıklar mı emin değilim."],
    ["the race will start on time", "yarış zamanında başlar mı", "Yarış zamanında başlar mı emin değilim."],
    ["he understood", "anladı mı", "Anladı mı emin değilim."],
  ]),
  C("i-feel-like", "Fikir ve duygu", "I feel like", "", "canım … istiyor", "feel like + -ing / isim", "I look like", [
    ["going out", "dışarı çıkmak", "Canım dışarı çıkmak istiyor."],
    ["a cup of tea", "bir fincan çay", "Canım bir fincan çay istiyor."],
    ["staying home", "evde kalmak", "Canım evde kalmak istiyor."],
    ["swimming", "yüzmek", "Canım yüzmek istiyor."],
    ["doing nothing", "hiçbir şey yapmamak", "Canım hiçbir şey yapmamak istiyor."],
  ]),
  C("worried-about", "Fikir ve duygu", "I'm worried about", "", "… için endişeleniyorum", "worried about + isim / -ing", "I'm excited about", [
    ["the exam", "sınav", "Sınav için endişeleniyorum."],
    ["my mother", "annem", "Annem için endişeleniyorum."],
    ["being late", "geç kalmak", "Geç kalmaktan endişeleniyorum."],
    ["the storm", "fırtına", "Fırtına için endişeleniyorum."],
    ["money", "para", "Para konusunda endişeleniyorum."],
  ]),
  C("its-worth", "Fikir ve duygu", "It's worth", "", "…meye değer", "worth + -ing / isim", "It's time to", [
    ["trying", "denemeye", "Denemeye değer."],
    ["the money", "paraya", "Paraya değer."],
    ["waiting for", "beklemeye", "Beklemeye değer."],
    ["visiting", "gezmeye", "Gezmeye değer."],
    ["the effort", "emeğe", "Emeğe değer."],
  ]),
  C("no-point", "Fikir ve duygu", "There's no point in", "", "…menin anlamı yok", "no point in + -ing", "There's no need to", [
    ["waiting", "beklemenin", "Beklemenin anlamı yok."],
    ["arguing", "tartışmanın", "Tartışmanın anlamı yok."],
    ["going out in this wind", "bu rüzgârda çıkmanın", "Bu rüzgârda çıkmanın anlamı yok."],
    ["worrying about it", "buna kafa yormanın", "Buna kafa yormanın anlamı yok."],
    ["calling him now", "onu şimdi aramanın", "Onu şimdi aramanın anlamı yok."],
  ]),
  C("i-wish", "Fikir ve duygu", "I wish I could", "", "keşke …bilsem", "I wish I could + fiil", "I hope I can", [
    ["stay longer", "daha uzun kal", "Keşke daha uzun kalabilsem."],
    ["speak English fluently", "akıcı İngilizce konuş", "Keşke akıcı İngilizce konuşabilsem."],
    ["help you", "sana yardım ed", "Keşke sana yardım edebilsem."],
    ["come with you", "seninle gel", "Keşke seninle gelebilsem."],
    ["sleep more", "daha çok uyu", "Keşke daha çok uyuyabilsem."],
  ]),
  C("its-up-to", "Fikir ve duygu", "It's up to", "", "… kalmış, karar …in", "up to + kişi", "It depends on", [
    ["you", "sana", "Sana kalmış."],
    ["the coach", "antrenöre", "Antrenöre kalmış."],
    ["the committee", "komiteye", "Komiteye kalmış."],
    ["us", "bize", "Bize kalmış."],
    ["your parents", "annenle babana", "Annenle babana kalmış."],
  ]),

  // ---- İş ve plan ----
  C("im-trying", "İş ve plan", "I'm trying to", "", "…maya çalışıyorum", "try to + fiil", "I'm going to", [
    ["focus", "odaklan", "Odaklanmaya çalışıyorum."],
    ["finish the report", "raporu bitir", "Raporu bitirmeye çalışıyorum."],
    ["save money", "para biriktir", "Para biriktirmeye çalışıyorum."],
    ["find a solution", "bir çözüm bul", "Bir çözüm bulmaya çalışıyorum."],
    ["improve my English", "İngilizcemi geliştir", "İngilizcemi geliştirmeye çalışıyorum."],
  ]),
  C("im-in-charge", "İş ve plan", "I'm in charge of", "", "…den ben sorumluyum", "in charge of + isim / -ing", "I'm interested in", [
    ["the budget", "bütçe", "Bütçeden ben sorumluyum."],
    ["the training", "antrenman", "Antrenmandan ben sorumluyum."],
    ["booking the hotel", "oteli ayarlamak", "Oteli ayarlamaktan ben sorumluyum."],
    ["the new team", "yeni ekip", "Yeni ekipten ben sorumluyum."],
    ["safety", "güvenlik", "Güvenlikten ben sorumluyum."],
  ]),
  C("lets-make-sure", "İş ve plan", "Let's make sure", "", "…den emin olalım", "make sure + cümle", "Let's find out", [
    ["everyone knows", "herkesin bildiği", "Herkesin bildiğinden emin olalım."],
    ["we have enough time", "yeterince vaktimiz olduğu", "Yeterince vaktimiz olduğundan emin olalım."],
    ["the boats are ready", "teknelerin hazır olduğu", "Teknelerin hazır olduğundan emin olalım."],
    ["nothing is missing", "hiçbir şeyin eksik olmadığı", "Hiçbir şeyin eksik olmadığından emin olalım."],
    ["the door is locked", "kapının kilitli olduğu", "Kapının kilitli olduğundan emin olalım."],
  ]),
  C("ill-get-back", "İş ve plan", "I'll get back to you", "", "sana … dönerim", "get back to someone (dönüş yapmak)", "I'll call you back", [
    ["tomorrow", "yarın", "Sana yarın dönerim."],
    ["as soon as possible", "en kısa sürede", "Sana en kısa sürede dönerim."],
    ["after the meeting", "toplantıdan sonra", "Sana toplantıdan sonra dönerim."],
    ["on that", "o konuda", "O konuda sana dönerim."],
    ["by Friday", "cumaya kadar", "Sana cumaya kadar dönerim."],
  ]),
  C("were-running-out", "İş ve plan", "We're running out of", "", "…imiz bitiyor", "run out of + isim", "We're running late for", [
    ["time", "zaman", "Zamanımız bitiyor."],
    ["money", "para", "Paramız bitiyor."],
    ["fuel", "yakıt", "Yakıtımız bitiyor."],
    ["ideas", "fikir", "Fikirlerimiz tükeniyor."],
    ["water", "su", "Suyumuz bitiyor."],
  ]),
  C("it-takes", "İş ve plan", "It takes about", "", "yaklaşık … sürer", "It takes + süre (to + fiil)", "It costs about", [
    ["ten minutes", "on dakika", "Yaklaşık on dakika sürer."],
    ["two hours to get there", "oraya varmak iki saat", "Oraya varmak yaklaşık iki saat sürer."],
    ["a week", "bir hafta", "Yaklaşık bir hafta sürer."],
    ["half an hour to rig the boat", "tekneyi donatmak yarım saat", "Tekneyi donatmak yaklaşık yarım saat sürer."],
    ["a year to learn it well", "iyi öğrenmek bir yıl", "İyi öğrenmek yaklaşık bir yıl sürer."],
  ]),
  C("id-rather", "İş ve plan", "I'd rather", "", "…mayı tercih ederim", "I'd rather + fiil (than …)", "I'd like to", [
    ["stay here", "burada kal", "Burada kalmayı tercih ederim."],
    ["wait", "bekle", "Beklemeyi tercih ederim."],
    ["start early", "erken başla", "Erken başlamayı tercih ederim."],
    ["walk than drive", "araba yerine yürü", "Araba kullanmak yerine yürümeyi tercih ederim."],
    ["not say", "söyleme", "Söylememeyi tercih ederim."],
  ]),
  C("as-soon-as", "İş ve plan", "Let me know as soon as", "", "… hemen bana haber ver", "as soon as + cümle (geniş zaman)", "Let me know if", [
    ["you arrive", "varınca", "Varınca hemen bana haber ver."],
    ["it's ready", "hazır olunca", "Hazır olunca hemen bana haber ver."],
    ["you hear anything", "bir şey duyunca", "Bir şey duyunca hemen bana haber ver."],
    ["the wind drops", "rüzgâr düşünce", "Rüzgâr düşünce hemen bana haber ver."],
    ["they call", "onlar arayınca", "Onlar arayınca hemen bana haber ver."],
  ]),

  // ---- Yolculuk ve dışarıda ----
  C("id-like", "Yolculuk ve dışarıda", "I'd like to", "", "…mak istiyorum", "I'd like to + fiil (kibar istek)", "I'd rather", [
    ["book a table", "masa ayırt", "Masa ayırtmak istiyorum."],
    ["check in", "giriş yap", "Giriş yapmak istiyorum."],
    ["pay by card", "kartla öde", "Kartla ödemek istiyorum."],
    ["change my seat", "koltuğumu değiştir", "Koltuğumu değiştirmek istiyorum."],
    ["rent a car", "araba kirala", "Araba kiralamak istiyorum."],
  ]),
  C("is-there", "Yolculuk ve dışarıda", "Is there", "near here?", "buralarda … var mı?", "Is there a / an + isim + near here?", "Are there any", [
    ["a pharmacy", "eczane", "Buralarda eczane var mı?"],
    ["a cash machine", "bankamatik", "Buralarda bankamatik var mı?"],
    ["a good restaurant", "iyi bir restoran", "Buralarda iyi bir restoran var mı?"],
    ["a bus stop", "otobüs durağı", "Buralarda otobüs durağı var mı?"],
    ["a petrol station", "benzinlik", "Buralarda benzinlik var mı?"],
  ]),
  C("how-long-does", "Yolculuk ve dışarıda", "How long does it take to", "?", "…mak ne kadar sürer?", "How long does it take to + fiil", "How much does it cost to", [
    ["get to the airport", "havalimanına gitmek", "Havalimanına gitmek ne kadar sürer?"],
    ["walk there", "oraya yürümek", "Oraya yürümek ne kadar sürer?"],
    ["get a visa", "vize almak", "Vize almak ne kadar sürer?"],
    ["cook this", "bunu pişirmek", "Bunu pişirmek ne kadar sürer?"],
    ["fix it", "onu tamir etmek", "Onu tamir etmek ne kadar sürer?"],
  ]),
  C("can-i-have", "Yolculuk ve dışarıda", "Can I have", ", please?", "… alabilir miyim, lütfen?", "Can I have + isim (sipariş, istek)", "Can I take", [
    ["the bill", "hesabı", "Hesabı alabilir miyim, lütfen?"],
    ["a glass of water", "bir bardak su", "Bir bardak su alabilir miyim, lütfen?"],
    ["the menu", "menüyü", "Menüyü alabilir miyim, lütfen?"],
    ["a receipt", "fiş", "Fiş alabilir miyim, lütfen?"],
    ["another key", "bir anahtar daha", "Bir anahtar daha alabilir miyim, lütfen?"],
  ]),
  C("im-looking-for", "Yolculuk ve dışarıda", "I'm looking for", "", "… arıyorum", "look for + isim (aramak)", "I'm looking at", [
    ["the station", "istasyonu", "İstasyonu arıyorum."],
    ["a cheap hotel", "ucuz bir otel", "Ucuz bir otel arıyorum."],
    ["my keys", "anahtarlarımı", "Anahtarlarımı arıyorum."],
    ["the marina office", "marina ofisini", "Marina ofisini arıyorum."],
    ["a gift for my wife", "eşime bir hediye", "Eşime bir hediye arıyorum."],
  ]),
  C("whats-the-best-way", "Yolculuk ve dışarıda", "What's the best way to", "?", "…menin en iyi yolu ne?", "the best way to + fiil", "What's the reason to", [
    ["get to the old town", "eski şehre gitme", "Eski şehre gitmenin en iyi yolu ne?"],
    ["learn English", "İngilizce öğren", "İngilizce öğrenmenin en iyi yolu ne?"],
    ["save time", "zaman kazan", "Zaman kazanmanın en iyi yolu ne?"],
    ["contact you", "sana ulaş", "Sana ulaşmanın en iyi yolu ne?"],
    ["get there by bus", "oraya otobüsle git", "Oraya otobüsle gitmenin en iyi yolu ne?"],
  ]),
  C("my-flight", "Yolculuk ve dışarıda", "My flight has been", "", "uçuşum …", "has been + 3. hâl (edilgen)", "My flight is going", [
    ["delayed", "ertelendi", "Uçuşum ertelendi."],
    ["cancelled", "iptal edildi", "Uçuşum iptal edildi."],
    ["moved to tomorrow", "yarına alındı", "Uçuşum yarına alındı."],
    ["changed", "değiştirildi", "Uçuşum değiştirildi."],
    ["confirmed", "onaylandı", "Uçuşum onaylandı."],
  ]),

  // ---- Spor ve kulüp ----
  C("keep-an-eye", "Spor ve kulüp", "Keep an eye on", "", "…e göz kulak ol, …i takip et", "keep an eye on + isim", "Keep away from", [
    ["the wind", "rüzgârı", "Rüzgârı takip et."],
    ["the kids", "çocuklara", "Çocuklara göz kulak ol."],
    ["the time", "saati", "Saati takip et."],
    ["the other boats", "diğer tekneleri", "Diğer tekneleri takip et."],
    ["my bag", "çantama", "Çantama göz kulak ol."],
  ]),
  C("get-better", "Spor ve kulüp", "You're getting better at", "", "…de giderek iyileşiyorsun", "get better at + isim / -ing", "You're getting used to", [
    ["starts", "startlarda", "Startlarda giderek iyileşiyorsun."],
    ["tacking", "tramolada", "Tramolada giderek iyileşiyorsun."],
    ["reading the wind", "rüzgârı okumada", "Rüzgârı okumada giderek iyileşiyorsun."],
    ["English", "İngilizcede", "İngilizcede giderek iyileşiyorsun."],
    ["staying calm", "sakin kalmada", "Sakin kalmada giderek iyileşiyorsun."],
  ]),
  C("make-sure-you", "Spor ve kulüp", "Make sure you", "", "…diğinden emin ol", "make sure you + fiil", "Make sure not to", [
    ["wear a life jacket", "can yeleği giy", "Can yeleği giydiğinden emin ol."],
    ["check the forecast", "hava tahminine bak", "Hava tahminine baktığından emin ol."],
    ["warm up first", "önce ısın", "Önce ısındığından emin ol."],
    ["drink enough water", "yeterince su iç", "Yeterince su içtiğinden emin ol."],
    ["tie the boat", "tekneyi bağla", "Tekneyi bağladığından emin ol."],
  ]),
  C("its-time-to", "Spor ve kulüp", "It's time to", "", "…me vakti", "It's time to + fiil", "It's worth", [
    ["go", "gitme", "Gitme vakti."],
    ["start the race", "yarışı başlatma", "Yarışı başlatma vakti."],
    ["head back", "geri dönme", "Geri dönme vakti."],
    ["warm up", "ısınma", "Isınma vakti."],
    ["take a break", "mola verme", "Mola verme vakti."],
  ]),
  C("good-job-on", "Spor ve kulüp", "Well done on", "", "… için tebrikler", "well done on + isim / -ing", "Thank you for", [
    ["your start", "startın", "Startın için tebrikler."],
    ["winning the race", "yarışı kazanman", "Yarışı kazanman için tebrikler."],
    ["the new record", "yeni rekor", "Yeni rekor için tebrikler."],
    ["finishing first", "birinci bitirmen", "Birinci bitirmen için tebrikler."],
    ["your hard work", "sıkı çalışman", "Sıkı çalışman için tebrikler."],
  ]),
  C("were-short-of", "Spor ve kulüp", "We need someone to", "", "…cak birine ihtiyacımız var", "need someone to + fiil", "We want something to", [
    ["drive the coach boat", "refakat botunu kullanacak", "Refakat botunu kullanacak birine ihtiyacımız var."],
    ["take photos", "fotoğraf çekecek", "Fotoğraf çekecek birine ihtiyacımız var."],
    ["help with the kids", "çocuklara yardım edecek", "Çocuklara yardım edecek birine ihtiyacımız var."],
    ["keep the time", "süreyi tutacak", "Süreyi tutacak birine ihtiyacımız var."],
    ["open the club", "kulübü açacak", "Kulübü açacak birine ihtiyacımız var."],
  ]),
];
