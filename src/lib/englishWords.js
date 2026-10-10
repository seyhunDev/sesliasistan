// İngilizce kelime kartı (Planlar, Notlar, Görevler sayfalarının altında): B2 seviyesinde sık kullanılan kelimeler.
// Liste uygulamaya gömülü (yapay zeka ve Firestore okuması yok). Her satır:
// [kelime, tür, Türkçe anlam, örnek cümle, örneğin Türkçesi]
// Sıra: liste sabit bir karışık sıraya dizilir, bu cihaz kaldığı yeri saklar (localStorage "sa-word-i");
// her açılışta sıradaki kelime gelir, liste bitmeden aynı kelime tekrar etmez.
export const WORDS = [
  ["achieve", "fiil", "başarmak, elde etmek", "She worked hard to achieve her goals this year.", "Bu yıl hedeflerine ulaşmak için çok çalıştı."],
  ["acknowledge", "fiil", "kabul etmek, onaylamak", "He acknowledged that he had made a mistake.", "Bir hata yaptığını kabul etti."],
  ["acquire", "fiil", "edinmek, kazanmak", "It takes time to acquire a new skill.", "Yeni bir beceri edinmek zaman alır."],
  ["adapt", "fiil", "uyum sağlamak", "Sailors must adapt quickly to changing winds.", "Yelkenciler değişen rüzgârlara hızla uyum sağlamalı."],
  ["adequate", "sıfat", "yeterli", "Make sure you get adequate sleep before the race.", "Yarıştan önce yeterince uyuduğundan emin ol."],
  ["adjust", "fiil", "ayarlamak, alışmak", "You can adjust the seat to fit your height.", "Koltuğu boyuna göre ayarlayabilirsin."],
  ["advocate", "fiil", "savunmak, desteklemek", "Many doctors advocate regular exercise.", "Birçok doktor düzenli egzersizi savunur."],
  ["affordable", "sıfat", "uygun fiyatlı", "We are looking for an affordable hotel near the marina.", "Marinaya yakın uygun fiyatlı bir otel arıyoruz."],
  ["allocate", "fiil", "ayırmak, tahsis etmek", "We allocated part of the budget to new sails.", "Bütçenin bir kısmını yeni yelkenlere ayırdık."],
  ["alter", "fiil", "değiştirmek", "The weather forced us to alter our plans.", "Hava, planlarımızı değiştirmeye zorladı."],
  ["ambitious", "sıfat", "hırslı, iddialı", "It is an ambitious project, but we can do it.", "İddialı bir proje ama başarabiliriz."],
  ["anticipate", "fiil", "öngörmek, beklemek", "We don't anticipate any problems with the delivery.", "Teslimatta bir sorun beklemiyoruz."],
  ["apparent", "sıfat", "belli, görünür", "It soon became apparent that he was tired.", "Kısa sürede yorgun olduğu belli oldu."],
  ["appreciate", "fiil", "takdir etmek, minnettar olmak", "I really appreciate your help.", "Yardımın için gerçekten minnettarım."],
  ["approach", "isim", "yaklaşım", "We need a different approach to this problem.", "Bu soruna farklı bir yaklaşım gerekiyor."],
  ["appropriate", "sıfat", "uygun", "Please wear appropriate clothes for the boat.", "Lütfen tekneye uygun kıyafet giy."],
  ["arrange", "fiil", "düzenlemek, ayarlamak", "Can you arrange a meeting for Friday?", "Cuma için bir toplantı ayarlayabilir misin?"],
  ["assess", "fiil", "değerlendirmek", "The coach will assess each sailor's progress.", "Antrenör her sporcunun gelişimini değerlendirecek."],
  ["assume", "fiil", "varsaymak", "I assume the training will start on time.", "Antrenmanın zamanında başlayacağını varsayıyorum."],
  ["attempt", "isim", "girişim, deneme", "He passed the exam on his second attempt.", "Sınavı ikinci denemesinde geçti."],
  ["attitude", "isim", "tutum", "Her positive attitude helps the whole team.", "Olumlu tutumu bütün takıma yardımcı oluyor."],
  ["available", "sıfat", "müsait, mevcut", "Are you available tomorrow morning?", "Yarın sabah müsait misin?"],
  ["aware", "sıfat", "farkında", "Are you aware of the new rules?", "Yeni kuralların farkında mısın?"],
  ["benefit", "isim", "fayda, yarar", "Swimming has many health benefits.", "Yüzmenin sağlığa birçok faydası var."],
  ["bother", "fiil", "rahatsız etmek, zahmet etmek", "Sorry to bother you, but do you have a minute?", "Rahatsız ettiğim için kusura bakma, bir dakikan var mı?"],
  ["brief", "sıfat", "kısa", "Let's have a brief meeting before we start.", "Başlamadan önce kısa bir toplantı yapalım."],
  ["capable", "sıfat", "yetenekli, -ebilecek durumda", "She is capable of winning the race.", "Yarışı kazanabilecek kapasitede."],
  ["cautious", "sıfat", "temkinli, dikkatli", "Be cautious when the wind gets stronger.", "Rüzgâr sertleşince temkinli ol."],
  ["challenge", "isim", "zorluk, meydan okuma", "Learning a new language is a real challenge.", "Yeni bir dil öğrenmek gerçek bir zorluk."],
  ["commitment", "isim", "bağlılık, taahhüt", "Success requires time and commitment.", "Başarı zaman ve bağlılık ister."],
  ["compare", "fiil", "karşılaştırmak", "Compare the prices before you buy.", "Almadan önce fiyatları karşılaştır."],
  ["concern", "isim", "endişe", "Safety is our main concern on the water.", "Suda en büyük endişemiz güvenlik."],
  ["confident", "sıfat", "kendinden emin", "I feel confident about tomorrow's race.", "Yarınki yarış konusunda kendimden eminim."],
  ["consequence", "isim", "sonuç (çoğu zaman olumsuz)", "Think about the consequences before you decide.", "Karar vermeden önce sonuçlarını düşün."],
  ["consider", "fiil", "düşünmek, göz önünde bulundurmak", "Have you considered moving to another city?", "Başka bir şehre taşınmayı düşündün mü?"],
  ["consistent", "sıfat", "tutarlı, istikrarlı", "Consistent training is the key to improvement.", "İstikrarlı antrenman gelişmenin anahtarıdır."],
  ["contribute", "fiil", "katkıda bulunmak", "Everyone contributed to the club's success.", "Herkes kulübün başarısına katkıda bulundu."],
  ["convenient", "sıfat", "uygun, elverişli", "Is ten o'clock convenient for you?", "Saat on senin için uygun mu?"],
  ["convince", "fiil", "ikna etmek", "She convinced me to join the team.", "Beni takıma katılmaya ikna etti."],
  ["crucial", "sıfat", "çok önemli, kritik", "The first minute of the race is crucial.", "Yarışın ilk dakikası çok kritik."],
  ["deadline", "isim", "son tarih", "The deadline for registration is Friday.", "Kayıt için son tarih cuma."],
  ["decline", "fiil", "azalmak; reddetmek", "The number of visitors declined in winter.", "Kışın ziyaretçi sayısı azaldı."],
  ["dedicated", "sıfat", "kendini adamış", "He is a dedicated coach who never gives up.", "Asla pes etmeyen, kendini işine adamış bir antrenör."],
  ["demanding", "sıfat", "zorlu, çok emek isteyen", "Sailing can be a physically demanding sport.", "Yelken fiziksel olarak zorlu bir spor olabilir."],
  ["determine", "fiil", "belirlemek", "The weather will determine the start time.", "Başlama saatini hava belirleyecek."],
  ["efficient", "sıfat", "verimli", "We need a more efficient way to plan our week.", "Haftamızı planlamak için daha verimli bir yola ihtiyacımız var."],
  ["effort", "isim", "çaba", "Thank you for all your effort this season.", "Bu sezonki bütün çaban için teşekkürler."],
  ["eliminate", "fiil", "ortadan kaldırmak, elemek", "Good planning eliminates many problems.", "İyi planlama birçok sorunu ortadan kaldırır."],
  ["emphasize", "fiil", "vurgulamak", "The coach emphasized the importance of safety.", "Antrenör güvenliğin önemini vurguladı."],
  ["encourage", "fiil", "cesaretlendirmek, teşvik etmek", "Parents should encourage children to play sports.", "Aileler çocukları spor yapmaya teşvik etmeli."],
  ["enhance", "fiil", "geliştirmek, artırmak", "Good sleep enhances your performance.", "İyi uyku performansını artırır."],
  ["ensure", "fiil", "sağlamak, garanti etmek", "Please ensure that all boats are tied up.", "Lütfen bütün teknelerin bağlı olduğundan emin ol."],
  ["essential", "sıfat", "temel, vazgeçilmez", "A life jacket is essential on the water.", "Suda can yeleği vazgeçilmezdir."],
  ["estimate", "fiil", "tahmin etmek", "We estimate the trip will take three hours.", "Yolculuğun üç saat süreceğini tahmin ediyoruz."],
  ["eventually", "zarf", "sonunda, eninde sonunda", "Eventually, we found the right solution.", "Sonunda doğru çözümü bulduk."],
  ["evidence", "isim", "kanıt", "There is no evidence that it works.", "İşe yaradığına dair bir kanıt yok."],
  ["exaggerate", "fiil", "abartmak", "Don't exaggerate, it wasn't that cold.", "Abartma, o kadar soğuk değildi."],
  ["expand", "fiil", "genişlemek, büyütmek", "The club plans to expand next year.", "Kulüp gelecek yıl büyümeyi planlıyor."],
  ["expectation", "isim", "beklenti", "The results were above our expectations.", "Sonuçlar beklentilerimizin üstündeydi."],
  ["familiar", "sıfat", "tanıdık, aşina", "Are you familiar with this area?", "Bu bölgeye aşina mısın?"],
  ["feature", "isim", "özellik", "This app has a lot of useful features.", "Bu uygulamanın birçok kullanışlı özelliği var."],
  ["flexible", "sıfat", "esnek", "My working hours are quite flexible.", "Çalışma saatlerim oldukça esnek."],
  ["focus", "fiil", "odaklanmak", "Focus on your technique, not on the others.", "Başkalarına değil, tekniğine odaklan."],
  ["frequent", "sıfat", "sık", "Frequent breaks help you stay fresh.", "Sık mola vermek dinç kalmana yardımcı olur."],
  ["fulfil", "fiil", "yerine getirmek, gerçekleştirmek", "She fulfilled her dream of sailing abroad.", "Yurt dışında yelken yapma hayalini gerçekleştirdi."],
  ["generous", "sıfat", "cömert", "Thank you for your generous donation.", "Cömert bağışınız için teşekkür ederiz."],
  ["gradually", "zarf", "yavaş yavaş, giderek", "The wind gradually became stronger.", "Rüzgâr yavaş yavaş sertleşti."],
  ["guarantee", "fiil", "garanti etmek", "I can't guarantee that we will win.", "Kazanacağımızı garanti edemem."],
  ["handle", "fiil", "başa çıkmak, halletmek", "Don't worry, I'll handle it.", "Merak etme, ben hallederim."],
  ["hesitate", "fiil", "tereddüt etmek", "Don't hesitate to call me if you need anything.", "Bir şeye ihtiyacın olursa beni aramaktan çekinme."],
  ["highlight", "fiil", "öne çıkarmak, vurgulamak", "The report highlights our main problems.", "Rapor ana sorunlarımızı öne çıkarıyor."],
  ["identify", "fiil", "belirlemek, tanımlamak", "We need to identify the cause of the problem.", "Sorunun nedenini belirlememiz gerekiyor."],
  ["impact", "isim", "etki", "The new coach had a big impact on the team.", "Yeni antrenörün takım üzerinde büyük etkisi oldu."],
  ["implement", "fiil", "uygulamaya koymak", "We will implement the new system next month.", "Yeni sistemi gelecek ay uygulamaya koyacağız."],
  ["impress", "fiil", "etkilemek", "Her speech impressed everyone in the room.", "Konuşması salondaki herkesi etkiledi."],
  ["improve", "fiil", "geliştirmek, iyileşmek", "Your starts have improved a lot.", "Startların çok gelişti."],
  ["inevitable", "sıfat", "kaçınılmaz", "Some mistakes are inevitable when you learn.", "Öğrenirken bazı hatalar kaçınılmazdır."],
  ["influence", "isim", "etki, nüfuz", "Parents have a strong influence on children.", "Ailelerin çocuklar üzerinde güçlü bir etkisi vardır."],
  ["initial", "sıfat", "ilk, başlangıçtaki", "Our initial plan was to leave at eight.", "İlk planımız sekizde yola çıkmaktı."],
  ["insist", "fiil", "ısrar etmek", "He insisted on paying for dinner.", "Akşam yemeğini ödemekte ısrar etti."],
  ["intend", "fiil", "niyet etmek", "I intend to finish this by Friday.", "Bunu cumaya kadar bitirmeye niyetliyim."],
  ["involve", "fiil", "içermek, dahil etmek", "The job involves a lot of travelling.", "Bu iş çok fazla seyahat içeriyor."],
  ["issue", "isim", "sorun, konu", "We discussed several issues at the meeting.", "Toplantıda birkaç konuyu konuştuk."],
  ["justify", "fiil", "haklı çıkarmak, gerekçelendirmek", "How can you justify such a high price?", "Böyle yüksek bir fiyatı nasıl açıklayabilirsin?"],
  ["likely", "sıfat", "muhtemel", "It's likely to rain this afternoon.", "Bu öğleden sonra yağmur yağması muhtemel."],
  ["maintain", "fiil", "korumak, sürdürmek; bakımını yapmak", "It is important to maintain the engine regularly.", "Motorun bakımını düzenli yapmak önemlidir."],
  ["manage", "fiil", "başarmak; yönetmek", "We managed to finish before the storm.", "Fırtınadan önce bitirmeyi başardık."],
  ["mention", "fiil", "bahsetmek", "Did he mention the time of the meeting?", "Toplantının saatinden bahsetti mi?"],
  ["motivate", "fiil", "motive etmek", "A good coach knows how to motivate people.", "İyi bir antrenör insanları nasıl motive edeceğini bilir."],
  ["negotiate", "fiil", "pazarlık etmek, müzakere etmek", "We negotiated a better price for the hotel.", "Otel için daha iyi bir fiyat pazarlık ettik."],
  ["nevertheless", "zarf", "yine de, buna rağmen", "It was cold; nevertheless, we went sailing.", "Hava soğuktu; yine de yelkene çıktık."],
  ["obvious", "sıfat", "açık, belli", "The answer seems obvious now.", "Cevap şimdi çok açık görünüyor."],
  ["occur", "fiil", "meydana gelmek, olmak", "The accident occurred near the harbour.", "Kaza limanın yakınında meydana geldi."],
  ["opportunity", "isim", "fırsat", "This race is a great opportunity for young sailors.", "Bu yarış genç yelkenciler için büyük bir fırsat."],
  ["option", "isim", "seçenek", "We have two options: stay or leave early.", "İki seçeneğimiz var: kalmak ya da erken çıkmak."],
  ["overcome", "fiil", "üstesinden gelmek", "She overcame her fear of deep water.", "Derin su korkusunun üstesinden geldi."],
  ["overall", "sıfat", "genel, toplam", "Overall, it was a successful season.", "Genel olarak başarılı bir sezondu."],
  ["participate", "fiil", "katılmak", "Twenty sailors participated in the race.", "Yarışa yirmi sporcu katıldı."],
  ["persuade", "fiil", "ikna etmek", "I persuaded him to see a doctor.", "Onu doktora gitmeye ikna ettim."],
  ["postpone", "fiil", "ertelemek", "The meeting was postponed until next week.", "Toplantı gelecek haftaya ertelendi."],
  ["potential", "isim", "potansiyel", "This young sailor has great potential.", "Bu genç sporcunun büyük bir potansiyeli var."],
  ["precise", "sıfat", "kesin, tam", "Can you give me the precise time?", "Bana tam saati verebilir misin?"],
  ["predict", "fiil", "tahmin etmek, öngörmek", "It's hard to predict the weather at sea.", "Denizde havayı tahmin etmek zordur."],
  ["prefer", "fiil", "tercih etmek", "I prefer training in the morning.", "Sabahları antrenman yapmayı tercih ederim."],
  ["previous", "sıfat", "önceki", "This year's results are better than the previous year's.", "Bu yılın sonuçları önceki yılınkinden daha iyi."],
  ["priority", "isim", "öncelik", "Safety is always our first priority.", "Güvenlik her zaman ilk önceliğimizdir."],
  ["proceed", "fiil", "devam etmek, ilerlemek", "Please proceed to the starting line.", "Lütfen start çizgisine ilerleyin."],
  ["promote", "fiil", "tanıtmak; terfi ettirmek", "We use Instagram to promote the club.", "Kulübü tanıtmak için Instagram'ı kullanıyoruz."],
  ["prove", "fiil", "kanıtlamak", "She proved that she was the best.", "En iyi olduğunu kanıtladı."],
  ["purpose", "isim", "amaç", "What is the purpose of this meeting?", "Bu toplantının amacı ne?"],
  ["pursue", "fiil", "peşinden gitmek, sürdürmek", "He decided to pursue a career in sports.", "Sporda kariyer yapmaya karar verdi."],
  ["reasonable", "sıfat", "makul", "The price seems reasonable to me.", "Fiyat bana makul görünüyor."],
  ["recover", "fiil", "iyileşmek, toparlanmak", "It took him two weeks to recover from the injury.", "Sakatlıktan iyileşmesi iki hafta sürdü."],
  ["reduce", "fiil", "azaltmak", "We need to reduce our costs.", "Masraflarımızı azaltmamız gerekiyor."],
  ["refuse", "fiil", "reddetmek", "She refused to give up.", "Pes etmeyi reddetti."],
  ["regret", "fiil", "pişman olmak", "I regret not learning English earlier.", "İngilizceyi daha erken öğrenmediğime pişmanım."],
  ["reliable", "sıfat", "güvenilir", "We need a reliable engine for the coach boat.", "Antrenör botu için güvenilir bir motora ihtiyacımız var."],
  ["rely on", "fiil", "güvenmek, bel bağlamak", "You can always rely on me.", "Bana her zaman güvenebilirsin."],
  ["remarkable", "sıfat", "dikkate değer, olağanüstü", "She made remarkable progress this year.", "Bu yıl olağanüstü bir gelişme gösterdi."],
  ["require", "fiil", "gerektirmek", "This job requires a lot of patience.", "Bu iş çok sabır gerektirir."],
  ["resolve", "fiil", "çözmek", "We resolved the problem quickly.", "Sorunu hızla çözdük."],
  ["responsible", "sıfat", "sorumlu", "Who is responsible for the equipment?", "Ekipmandan kim sorumlu?"],
  ["reveal", "fiil", "ortaya çıkarmak", "The results revealed some weak points.", "Sonuçlar bazı zayıf noktaları ortaya çıkardı."],
  ["rough", "sıfat", "dalgalı (deniz); kaba, yaklaşık", "The sea was too rough for the small boats.", "Deniz küçük tekneler için fazla dalgalıydı."],
  ["schedule", "isim", "program, takvim", "Let's check the schedule for next week.", "Gelecek haftanın programına bakalım."],
  ["significant", "sıfat", "önemli, kayda değer", "There was a significant change in the wind.", "Rüzgârda kayda değer bir değişiklik oldu."],
  ["similar", "sıfat", "benzer", "The two boats look very similar.", "İki tekne birbirine çok benziyor."],
  ["solution", "isim", "çözüm", "We finally found a solution.", "Sonunda bir çözüm bulduk."],
  ["specific", "sıfat", "belirli, özel", "Do you have a specific time in mind?", "Aklında belirli bir saat var mı?"],
  ["status", "isim", "durum", "What's the status of the new sails?", "Yeni yelkenlerin durumu ne?"],
  ["strategy", "isim", "strateji", "Our strategy is to start near the committee boat.", "Stratejimiz komite botunun yakınından start almak."],
  ["struggle", "fiil", "zorlanmak, mücadele etmek", "Many beginners struggle with tacking.", "Birçok yeni başlayan tramolada zorlanır."],
  ["sufficient", "sıfat", "yeterli", "We don't have sufficient time to finish today.", "Bugün bitirmek için yeterli zamanımız yok."],
  ["suggest", "fiil", "önermek", "I suggest we leave early.", "Erken çıkmamızı öneririm."],
  ["suitable", "sıfat", "uygun", "Is this weather suitable for beginners?", "Bu hava yeni başlayanlar için uygun mu?"],
  ["support", "fiil", "desteklemek", "Thank you for supporting our club.", "Kulübümüzü desteklediğin için teşekkürler."],
  ["suppose", "fiil", "sanmak, farz etmek", "I suppose you're right.", "Sanırım haklısın."],
  ["sustain", "fiil", "sürdürmek", "It's hard to sustain this speed for long.", "Bu hızı uzun süre sürdürmek zor."],
  ["tend to", "fiil", "eğiliminde olmak", "The wind tends to increase in the afternoon.", "Rüzgâr öğleden sonra artma eğilimindedir."],
  ["thorough", "sıfat", "titiz, kapsamlı", "We did a thorough check of all the boats.", "Bütün teknelerin kapsamlı bir kontrolünü yaptık."],
  ["tough", "sıfat", "zorlu, sert", "It was a tough race, but we finished.", "Zorlu bir yarıştı ama bitirdik."],
  ["typical", "sıfat", "tipik, olağan", "This is a typical summer day in Dikili.", "Bu, Dikili'de tipik bir yaz günü."],
  ["unexpected", "sıfat", "beklenmedik", "We had an unexpected visitor today.", "Bugün beklenmedik bir ziyaretçimiz oldu."],
  ["urgent", "sıfat", "acil", "Call me back, it's urgent.", "Beni geri ara, acil."],
  ["valuable", "sıfat", "değerli", "This was a valuable lesson for all of us.", "Bu hepimiz için değerli bir dersti."],
  ["various", "sıfat", "çeşitli", "We tried various methods.", "Çeşitli yöntemler denedik."],
  ["willing", "sıfat", "istekli", "Are you willing to help us on Saturday?", "Cumartesi bize yardım etmeye istekli misin?"],
  ["withdraw", "fiil", "çekilmek; para çekmek", "He had to withdraw from the race because of an injury.", "Sakatlık yüzünden yarıştan çekilmek zorunda kaldı."],
  ["worth", "sıfat", "değer, -meye değer", "The trip was long, but it was worth it.", "Yolculuk uzundu ama değdi."],
  ["make up your mind", "deyim", "karar vermek", "Have you made up your mind about the trip?", "Yolculuk konusunda kararını verdin mi?"],
  ["look forward to", "deyim", "dört gözle beklemek", "I'm looking forward to the summer camp.", "Yaz kampını dört gözle bekliyorum."],
  ["run out of", "deyim", "tükenmek, bitmek", "We've run out of fuel for the coach boat.", "Antrenör botunun yakıtı bitti."],
  ["keep up with", "deyim", "ayak uydurmak, geride kalmamak", "It's hard to keep up with all these messages.", "Bütün bu mesajlara yetişmek zor."],
  ["figure out", "deyim", "anlamak, çözmek", "I can't figure out how this works.", "Bunun nasıl çalıştığını çözemiyorum."],
  ["put off", "deyim", "ertelemek", "Don't put off until tomorrow what you can do today.", "Bugün yapabileceğini yarına erteleme."],
  ["come up with", "deyim", "bulmak, akla getirmek (fikir)", "She came up with a great idea for the poster.", "Afiş için harika bir fikir buldu."],
  ["take part in", "deyim", "katılmak", "Our sailors will take part in the national championship.", "Sporcularımız Türkiye şampiyonasına katılacak."],
  ["get rid of", "deyim", "kurtulmak, atmak", "We need to get rid of the old equipment.", "Eski ekipmandan kurtulmamız gerekiyor."],
  ["on the other hand", "deyim", "öte yandan", "It's expensive; on the other hand, it's very good quality.", "Pahalı; öte yandan kalitesi çok iyi."],
];

// Sabit karışık sıra (her cihazda aynı): basit karıştırıcı, tohum sabit
export function wordOrder(n = WORDS.length, seed = 20261010) {
  const a = Array.from({ length: n }, (_, i) => i);
  let s = seed >>> 0;
  const rnd = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// i'nci gösterim → kelime (liste bitince başa döner)
export const wordAt = (i, order = wordOrder()) => {
  const [w, pos, tr, ex, exTr] = WORDS[order[((i % order.length) + order.length) % order.length]];
  return { w, pos, tr, ex, exTr };
};

const KEY = "sa-word-i";
// Sıradaki kelimenin sırası; okuyunca bir ilerler (localStorage yoksa 0'dan rastgele başlar)
export function nextWordIndex(store = typeof localStorage === "undefined" ? null : localStorage) {
  let i = Math.floor(Math.random() * WORDS.length);
  try {
    const v = store?.getItem(KEY);
    if (v !== null && v !== undefined && /^\d+$/.test(v)) i = +v;
    store?.setItem(KEY, String(i + 1));
  } catch {
    /* gizli pencere */
  }
  return i;
}
