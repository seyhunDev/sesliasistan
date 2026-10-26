// İngilizce kelime kartı (Planlar, Notlar, Görevler sayfalarının altında): B2 seviyesinde sık kullanılan kelimeler.
// Gömülü liste destenin tohumudur: ana hesapta deste Firestore'da tek belgededir (orgs/{orgId}/english/deck,
// features/words/wordData.js), ilk açılışta bu listeyle dolar. Her satır:
// [kelime, tür, Türkçe anlam, örnek cümle, örneğin Türkçesi]
// Sıra: liste sabit bir karışık sıraya dizilir, bu cihaz kaldığı yeri saklar (localStorage "sa-word-i");
// her açılışta sıradaki kelime gelir, liste bitmeden aynı kelime tekrar etmez. Çalışılan kelimeler (aşağıda "Deste") önce gelir.
import { PHRASES, PHRASE_TOPICS } from "@/lib/englishPhrases";

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
  // Günlük konuşmada en sık geçenler (2026-10-22 eklendi)
  ["actually", "zarf", "aslında", "I actually prefer tea to coffee.", "Aslında çayı kahveye tercih ederim."],
  ["afford", "fiil", "parası yetmek, karşılayabilmek", "We can't afford a new boat this year.", "Bu yıl yeni bir tekneye paramız yetmez."],
  ["although", "bağlaç", "-e rağmen, gerçi", "Although it was windy, we went sailing.", "Rüzgârlı olmasına rağmen yelkene çıktık."],
  ["anyway", "zarf", "neyse, yine de", "It was raining, but we went out anyway.", "Yağmur yağıyordu ama yine de dışarı çıktık."],
  ["borrow", "fiil", "ödünç almak", "Can I borrow your pen for a minute?", "Bir dakika kalemini ödünç alabilir miyim?"],
  ["bring up", "deyim", "(konuyu) açmak, gündeme getirmek", "She brought up the budget at the meeting.", "Toplantıda bütçe konusunu açtı."],
  ["by the way", "deyim", "bu arada", "By the way, did you call the hotel?", "Bu arada, oteli aradın mı?"],
  ["check out", "deyim", "göz atmak; otelden çıkmak", "Check out this new photo from the race.", "Yarıştan bu yeni fotoğrafa bir bak."],
  ["deal with", "deyim", "ilgilenmek, halletmek", "I'll deal with the paperwork tomorrow.", "Evraklarla yarın ben ilgilenirim."],
  ["definitely", "zarf", "kesinlikle", "I'll definitely be there on Saturday.", "Cumartesi kesinlikle orada olacağım."],
  ["depend on", "deyim", "-e bağlı olmak", "It depends on the weather.", "Havaya bağlı."],
  ["enough", "sıfat", "yeterli, yeter", "Do we have enough life jackets?", "Yeterince can yeleğimiz var mı?"],
  ["exactly", "zarf", "tam olarak, aynen", "That's exactly what I meant.", "Tam olarak bunu demek istedim."],
  ["find out", "deyim", "öğrenmek, keşfetmek", "Let's find out what time the race starts.", "Yarışın saat kaçta başladığını öğrenelim."],
  ["get along with", "deyim", "iyi geçinmek", "He gets along well with his teammates.", "Takım arkadaşlarıyla iyi geçinir."],
  ["give up", "deyim", "vazgeçmek, bırakmak", "Don't give up, you are almost there.", "Vazgeçme, neredeyse geldin."],
  ["go on", "deyim", "devam etmek; olmak", "What's going on here?", "Burada neler oluyor?"],
  ["hang out", "deyim", "takılmak, vakit geçirmek", "We usually hang out at the marina after training.", "Antrenmandan sonra genelde marinada takılırız."],
  ["however", "zarf", "ancak, fakat", "The plan is good; however, it is expensive.", "Plan iyi; ancak pahalı."],
  ["instead", "zarf", "yerine", "Let's walk instead of taking a taxi.", "Taksiye binmek yerine yürüyelim."],
  ["keep in mind", "deyim", "aklında tutmak", "Keep in mind that the shop closes at six.", "Dükkânın altıda kapandığını aklında tut."],
  ["lately", "zarf", "son zamanlarda", "I've been very busy lately.", "Son zamanlarda çok meşgulüm."],
  ["look after", "deyim", "bakmak, ilgilenmek", "Can you look after the kids for an hour?", "Bir saat çocuklara bakabilir misin?"],
  ["look for", "deyim", "aramak", "I'm looking for my car keys.", "Araba anahtarlarımı arıyorum."],
  ["mean", "fiil", "kastetmek, anlamına gelmek", "What does this word mean?", "Bu kelime ne anlama geliyor?"],
  ["mind", "fiil", "sakıncası olmak", "Do you mind if I open the window?", "Pencereyi açmamın sakıncası var mı?"],
  ["miss", "fiil", "kaçırmak; özlemek", "Hurry up or we'll miss the bus.", "Acele et yoksa otobüsü kaçıracağız."],
  ["pick up", "deyim", "almak (birini/bir şeyi)", "I'll pick you up at eight.", "Seni sekizde alırım."],
  ["probably", "zarf", "muhtemelen", "It will probably rain tomorrow.", "Yarın muhtemelen yağmur yağacak."],
  ["realize", "fiil", "fark etmek", "I didn't realize it was so late.", "Bu kadar geç olduğunu fark etmemiştim."],
  ["remind", "fiil", "hatırlatmak", "Please remind me to call the coach.", "Lütfen antrenörü aramamı hatırlat."],
  ["set up", "deyim", "kurmak, ayarlamak", "Let's set up a meeting for next week.", "Gelecek hafta için bir toplantı ayarlayalım."],
  ["show up", "deyim", "gelmek, ortaya çıkmak", "Only five sailors showed up today.", "Bugün sadece beş sporcu geldi."],
  ["sort out", "deyim", "çözmek, halletmek", "Don't worry, we'll sort it out.", "Merak etme, hallederiz."],
  ["take care of", "deyim", "ilgilenmek, bakmak", "I'll take care of the tickets.", "Biletlerle ben ilgilenirim."],
  ["though", "zarf", "yine de, ama", "It was a hard day. It was fun, though.", "Zor bir gündü. Yine de eğlenceliydi."],
  ["turn out", "deyim", "çıkmak, ortaya çıkmak", "The weather turned out better than expected.", "Hava beklenenden iyi çıktı."],
  ["used to", "deyim", "eskiden ... -erdi", "I used to sail every weekend.", "Eskiden her hafta sonu yelken yapardım."],
  ["whether", "bağlaç", "-ip -mediği", "I'm not sure whether he is coming.", "Gelip gelmediğinden emin değilim."],
  ["work out", "deyim", "spor yapmak; çözmek", "I work out three times a week.", "Haftada üç kez spor yapıyorum."],
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

// ---- Deste: çalışılan kelimeler (aralıklı tekrar) ----
// deck = { words: [kelime], gaps: [gün], seedV }
// kelime = { en, type, tr, ex, exTr, kind: "word" | "phrase", topic, status: "list" | "study" | "known", box, due (YYYY-MM-DD), at, kd (öğrenildiği gün) }
// kind "phrase": İngilizce sayfası › Cümleler (englishPhrases.js, konu konu); kelime kartı ve widget listeden yalnız kelime seçer.
// "study": kullanıcı "çalıştır" dedi; öğrenene kadar gösterilir. İlk gün hemen, sonra gaps aralıklarıyla
// (varsayılan 1, 2, 4, 7, 14 gün; son aralık "öğrendim" denene kadar tekrar eder). "known": öğrendim, artık gelmez.
export const GAPS = [1, 2, 4, 7, 14];
export const SEED_V = 3; // gömülü liste büyüyünce artar: eksik kelimeler desteye eklenir
const S = (v, n) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);
const DAY = /^\d{4}-\d{2}-\d{2}$/;
export const wordKey = (en) => S(en, 160).toLocaleLowerCase("en-US");

export function cleanWord(w = {}) {
  const status = ["study", "known"].includes(w.status) ? w.status : "list";
  return {
    en: S(w.en, 160),
    type: S(w.type, 20),
    tr: S(w.tr, 120),
    ex: S(w.ex, 200),
    exTr: S(w.exTr, 200),
    kind: w.kind === "phrase" ? "phrase" : "word",
    topic: S(w.topic, 40),
    status,
    box: Math.max(0, Math.min(20, Math.round(Number(w.box) || 0))),
    due: DAY.test(String(w.due || "")) ? w.due : "",
    at: S(w.at, 30),
    kd: DAY.test(String(w.kd || "")) ? w.kd : "",
    ...moreOf(w),
  };
}
// Yapay zekanın bir kez hazırladığı ek örnekler (İngilizce sayfası): ex2 en çok 3 cümle, dlg en çok 4 satırlık diyalog
// (A, B, A… sırayla); her biri { e: İngilizce, t: Türkçe }. Boşsa alan hiç yazılmaz (belge küçük kalır).
const lines = (a, n) =>
  (Array.isArray(a) ? a : [])
    .map((x) => ({ e: S(x?.e, 200), t: S(x?.t, 200) }))
    .filter((x) => x.e)
    .slice(0, n);
function moreOf(w) {
  const ex2 = lines(w.ex2, 3);
  const dlg = lines(w.dlg, 4);
  return { ...(ex2.length ? { ex2 } : {}), ...(dlg.length ? { dlg } : {}) };
}
export const cleanGaps = (g) => {
  const a = (Array.isArray(g) ? g : []).map((n) => Math.round(Number(n))).filter((n) => n >= 1 && n <= 365).slice(0, 10);
  return a.length ? a : [...GAPS];
};
export function cleanDeck(d = {}) {
  const seen = new Set();
  const words = (Array.isArray(d?.words) ? d.words : [])
    .map(cleanWord)
    .filter((w) => w.en && w.tr && !seen.has(wordKey(w.en)) && seen.add(wordKey(w.en)))
    .slice(0, 2000);
  return { words, gaps: cleanGaps(d?.gaps), seedV: Math.max(0, Math.round(Number(d?.seedV) || 0)) };
}

const fromRow = ([en, type, tr, ex, exTr]) => ({ en, type, tr, ex, exTr, kind: "word", status: "list", box: 0, due: "", at: "" });
const SEED = [...WORDS.map(fromRow), ...Object.entries(PHRASES).flatMap(([topic, rows]) => rows.map(([en, tr]) => ({ en, type: "cümle", tr, ex: "", exTr: "", kind: "phrase", topic, status: "list" })))];
// Gömülü listede olup destede olmayanlar eklenir (deste yoksa tamamı); { deck, changed }
export function seedDeck(d) {
  const deck = cleanDeck(d);
  if (deck.seedV >= SEED_V) return { deck, changed: false };
  const have = new Set(deck.words.map((w) => wordKey(w.en)));
  const add = SEED.filter((w) => !have.has(wordKey(w.en)));
  return { deck: { ...deck, words: [...deck.words, ...add], seedV: SEED_V }, changed: true };
}

const addDays = (day, n) => {
  const d = new Date(`${day}T12:00:00`);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
const dayNo = (day) => Math.floor(new Date(`${day}T12:00:00Z`).getTime() / 86400000);

export const studyList = (deck) => (deck?.words || []).filter((w) => w.status === "study");
// Bugün tekrarı gelen çalışma kelimeleri (en eskisi önce)
export const dueWords = (deck, today) => studyList(deck).filter((w) => !w.due || w.due <= today).sort((a, b) => (a.due || "").localeCompare(b.due || ""));

// Desteyi kelimeye göre değiştirir
const mapWord = (deck, en, fn) => ({ ...deck, words: deck.words.map((w) => (wordKey(w.en) === wordKey(en) ? cleanWord(fn(w)) : w)) });
export const findWord = (deck, en) => (deck?.words || []).find((w) => wordKey(w.en) === wordKey(en)) || null;

// Kart gösterildi: tekrar günüyse bir sonraki aralığa geçer (aynı gün ikinci gösterim saymaz)
export function reviewWord(deck, en, today) {
  const w = findWord(deck, en);
  if (!w || w.status !== "study" || (w.due && w.due > today)) return deck;
  const gaps = cleanGaps(deck.gaps);
  const g = gaps[Math.min(w.box, gaps.length - 1)];
  return mapWord(deck, en, (x) => ({ ...x, box: x.box + 1, due: addDays(today, g) }));
}
// Çalışmaya al: yoksa eklenir (w: { en, type, tr, ex, exTr }), bugün hemen gösterilir, kutu baştan
export function studyWord(deck, w, today, at = "") {
  const cur = findWord(deck, w.en);
  if (cur) return mapWord(deck, w.en, (x) => ({ ...x, ...Object.fromEntries(Object.entries(w).filter(([, v]) => v)), status: "study", box: 0, due: today, at: at || x.at }));
  const nw = cleanWord({ ...w, status: "study", box: 0, due: today, at });
  return nw.en && nw.tr ? { ...deck, words: [nw, ...deck.words] } : deck;
}
export const knowWord = (deck, en, today = "") => mapWord(deck, en, (x) => ({ ...x, status: "known", due: "", kd: today }));
// Sınavda yanlış: çalışmaya girer (ya da kalır), kutu baştan, yarın yeniden gelir
export const missWord = (deck, w, today) => mapWord(studyWord(deck, w, today), w.en, (x) => ({ ...x, box: 0, due: addDays(today, 1) }));
// Ek örnekleri kaydeder (more: { ex2, dlg })
export const setMore = (deck, en, more) => mapWord(deck, en, (x) => ({ ...x, ...more }));
export const hasMore = (w) => !!(w?.ex2?.length || w?.dlg?.length);
export const unstudyWord = (deck, en) => mapWord(deck, en, (x) => ({ ...x, status: "list", box: 0, due: "" }));

const card = (w, study) => ({ en: w.en, type: w.type, tr: w.tr, ex: w.ex, exTr: w.exTr, study });
const isWord = (w) => w.kind !== "phrase";
// Uygulamadaki kart: tekrarı gelen çalışma kelimesi önce, yoksa listeden sıradaki (i: nextWordIndex)
export function pickCard(deck, today, i = 0) {
  const due = dueWords(deck, today)[0];
  if (due) return card(due, true);
  const list = (deck?.words || []).filter((w) => w.status === "list" && isWord(w));
  if (!list.length) return null;
  const o = wordOrder(list.length);
  return card(list[o[((i % o.length) + o.length) % o.length]], false);
}

// ---- Cihazdaki kopya (widget ve çevrimdışı; ana hesap dışındakilerin destesi de burada) ----
export const DECK_KEY = "sa-words-deck";
const LS = () => (typeof localStorage === "undefined" ? null : localStorage);
export function cachedDeck(store = LS()) {
  try {
    const raw = store?.getItem(DECK_KEY);
    if (raw) return seedDeck(JSON.parse(raw)).deck;
  } catch {
    /* bozuk kopya */
  }
  return seedDeck(null).deck;
}
export function keepDeck(deck, store = LS()) {
  try {
    store?.setItem(DECK_KEY, JSON.stringify(cleanDeck(deck)));
  } catch {
    /* dolu ya da gizli pencere */
  }
}

const isoDay = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
// iPhone widget'ı için günün kartı: { en, type, tr, ex, exTr, study }. Önce tekrarı gelen çalışma kelimesi, yoksa diğer
// çalışma kelimeleri (gün gün sırayla), o da yoksa listeden günün kelimesi. Gün boyunca aynı kelime; desteyi değiştirmez.
export function widgetWord(deck = cachedDeck(), today = isoDay()) {
  const due = dueWords(deck, today)[0];
  if (due) return card(due, true);
  const st = studyList(deck);
  if (st.length) return card(st[dayNo(today) % st.length], true);
  return pickCard(deck, today, dayNo(today));
}

// ---- Asistan cümleleri ----
// "resilient kelimesini ekle", "bana X kelimesini çalıştır", "X kelimesini öğrendim", "X kelimesini çalışmadan çıkar",
// "çalıştığım kelimeler neler", "kelimeleri her gün göster", "kelime tekrarını 1 3 7 gün yap"
// "İngilizce could you give me a hand cümlesini ekle" (kind "phrase": İngilizce sayfası › Cümleler)
// → { op: "study" | "known" | "drop" | "ask" | "gaps", word, gaps, kind? }
const low = (s) => String(s || "").toLocaleLowerCase("tr-TR").replace(/[.!…]+$/u, "").replace(/\s+/g, " ").trim();
const WORD_OF = /^(.+?)\s+(?:ingilizce\s+)?(?:kelimesi\p{L}*|kelimeyi|sözcüğ\p{L}*|deyimi\p{L}*)(?:\s|$)/u;
const NUM = { bir: 1, iki: 2, üç: 3, dört: 4, beş: 5, altı: 6, yedi: 7, sekiz: 8, dokuz: 9, on: 10, "on beş": 15, otuz: 30 };
const PHRASE_OF = /^(.+?)\s+(?:ingilizce\s+)?(?:cümlesi\p{L}*|cümleyi|kalıbı\p{L}*)(?:\s|$)/u;
function opOf(t, word) {
  if (/öğrendim|biliyorum|ezberledim/u.test(t)) return { op: "known", word };
  if (/(çalışma\p{L}*dan|listeden) (çıkar|kaldır|sil)|çalışmayı bırak|(çıkar|kaldır|sil)\p{L}*$/u.test(t)) return { op: "drop", word };
  if (/(ekle|çalıştır|çalış\p{L}*|öğret|ezberlet|kaydet|listeme|listeye|göster)/u.test(t)) return { op: "study", word };
  return null;
}
export function wordCommand(raw) {
  const t = low(raw);
  // Cümle: İngilizce söylenen (ya da "İngilizce" denen) en az iki kelimelik kalıp; "bu cümleyi not al" gibi Türkçe cümleler değil
  const pm = /cümle|kalıb/u.test(t) ? t.match(PHRASE_OF) : null;
  if (pm) {
    const ph = pm[1].replace(/^(bana |ingilizce |şu |yeni )+/u, "").replace(/^["“'‘]|["”'’]$/gu, "").trim();
    const latin = /^[a-z][a-z'’ ,?!.-]*$/i.test(ph) && ph.split(" ").length >= 2;
    if (ph && ph.split(" ").length <= 12 && (latin || /ingilizce/u.test(t))) {
      const r = opOf(t, ph);
      return r ? { ...r, kind: "phrase" } : null;
    }
  }
  if (!/(kelime|sözcü|deyim)/u.test(t)) return null;
  if (/(kelime|sözcük)\p{L}* (tekrar\p{L}*|aralı\p{L}*|sıklı\p{L}*)|kelimeleri (her|\d+|bir|iki|üç) /u.test(t)) {
    let gaps = [];
    if (/her gün/u.test(t)) gaps = [1];
    else {
      const m = t.match(/(\d+|bir|iki|üç|dört|beş|altı|yedi) günde bir/u);
      if (m) gaps = [Number(m[1]) || NUM[m[1]]];
      else gaps = [...t.matchAll(/\d+/g)].map((x) => Number(x[0]));
    }
    gaps = gaps.filter((n) => n >= 1 && n <= 365);
    if (gaps.length) return { op: "gaps", gaps };
  }
  if (/(çalıştığım|çalışılan|çalışacağım|öğrendiğim) (ingilizce )?(kelime|sözcük)|kelime listem|kaç kelime/u.test(t)) return { op: "ask", known: /öğrendiğim/u.test(t) };
  const m = t.match(WORD_OF);
  let word = m ? m[1].replace(/^(bana |ingilizce |şu |bu |yeni )+/u, "").replace(/['’].*$/u, "").replace(/^["“]|["”]$/gu, "").trim() : "";
  // "kelime ekle: resilient", "çalışma listeme resilient ekle"
  if (!word) {
    const k = t.match(/(?:kelime|sözcük) (?:ekle|çalıştır)\p{L}*[: ]+(.+)$/u);
    word = k ? k[1].trim() : "";
  }
  if (!word || word.split(" ").length > 5) return null;
  return opOf(t, word);
}

// ---- İngilizce sayfası (/english): Kelimeler / Cümleler ----
export const ofKind = (deck, kind) => (deck?.words || []).filter((w) => (kind === "phrase") === (w.kind === "phrase"));
// Üstteki sayılar: { study, known, list }
export function deckCounts(deck, kind) {
  const l = ofKind(deck, kind);
  const n = (st) => l.filter((w) => w.status === st).length;
  return { study: n("study"), known: n("known"), list: n("list") };
}
// Cümle konuları: [{ topic, known, total }] (hazır konular sırayla, sonra kendi eklediklerin)
export function topicStats(deck) {
  const l = ofKind(deck, "phrase");
  const names = [...new Set([...PHRASE_TOPICS, ...l.map((w) => w.topic || "Eklediklerim")])];
  return names
    .map((topic) => {
      const t = l.filter((w) => (w.topic || "Eklediklerim") === topic);
      return { topic, known: t.filter((w) => w.status === "known").length, total: t.length };
    })
    .filter((t) => t.total);
}
// Sıradaki kart: tekrarı gelen çalışma kelimesi, sonra diğer çalışılanlar, sonra liste (kelimeler karışık sırayla, cümleler konu sırasıyla).
// skip: "Sonraki" ile geçilenler (bu açılışta); hepsi geçildiyse baştan. Dönüş: kelime ya da null
export function pageCard(deck, { kind = "word", today, topic = "", skip = [] } = {}) {
  const all = ofKind(deck, kind).filter((w) => !topic || (w.topic || "Eklediklerim") === topic);
  const due = dueWords({ words: all }, today);
  const rest = all.filter((w) => w.status === "study" && !due.includes(w));
  let list = all.filter((w) => w.status === "list");
  if (kind !== "phrase") {
    const o = wordOrder(list.length);
    list = o.map((i) => list[i]);
  }
  const order = [...due, ...rest, ...list];
  const sk = new Set(skip.map(wordKey));
  return order.find((w) => !sk.has(wordKey(w.en))) || order[0] || null;
}
// Öğrendiklerim: en son öğrenilen önce
export const knownList = (deck, kind) =>
  ofKind(deck, kind)
    .filter((w) => w.status === "known")
    .sort((a, b) => (b.kd || "").localeCompare(a.kd || ""));
// Çalışılanlar: en yakın tekrar önce
export const studyRows = (deck, kind) =>
  ofKind(deck, kind)
    .filter((w) => w.status === "study")
    .sort((a, b) => (a.due || "").localeCompare(b.due || ""));

// Kartın örnek cümleleri: kendi örneği önce, sonra yapay zekanınkiler (aynısı tekrar etmez), en çok 3
export function sentencesOf(w) {
  const all = [...(w?.ex ? [{ e: w.ex, t: w.exTr }] : []), ...(w?.ex2 || [])];
  const seen = new Set();
  return all.filter((x) => x.e && !seen.has(x.e.toLowerCase()) && seen.add(x.e.toLowerCase())).slice(0, 3);
}

// Sına (Seyhun 2026-10-26: "öyle hemen öğrendim… neyi öğrendin?"): üç soru. Kelimede 1) anlamını seç, 2) cümledeki boşluğu
// doldur (kelime örnek cümlede geçmiyorsa Türkçesinden İngilizcesini seç), 3) dinle, anlamını seç. Cümlede 1) anlamını seç,
// 2) Türkçesinden İngilizcesini seç, 3) dinle, anlamını seç. Şıklar aynı türden başka kartlardan, dördü farklı.
// Soru: { kind: "mean" | "blank" | "en" | "listen", ask, say, opts, ok } (ok doğru şıkkın sırası). rnd: test için.
const esc = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function pick(pool, n, rnd, not) {
  const seen = new Set(not.map((x) => x.toLowerCase()));
  const out = [];
  const p = [...pool];
  while (out.length < n && p.length) {
    const v = p.splice(Math.floor(rnd() * p.length), 1)[0];
    if (v && !seen.has(v.toLowerCase())) seen.add(v.toLowerCase()) && out.push(v);
  }
  return out;
}
function ask(kind, askText, say, right, pool, rnd) {
  const opts = [right, ...pick(pool, 3, rnd, [right])];
  for (let i = opts.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [opts[i], opts[j]] = [opts[j], opts[i]];
  }
  return { kind, ask: askText, say, opts, ok: opts.indexOf(right) };
}
export function quizFor(deck, w, rnd = Math.random) {
  const phrase = w.kind === "phrase";
  const same = ofKind(deck, phrase ? "phrase" : "word").filter((x) => wordKey(x.en) !== wordKey(w.en));
  const trs = same.map((x) => x.tr);
  const ens = same.map((x) => x.en);
  const qs = [ask("mean", w.en, w.en, w.tr, trs, rnd)];
  const re = new RegExp(`\\b${esc(w.en)}\\w*`, "i");
  const s = !phrase && sentencesOf(w).find((x) => re.test(x.e));
  if (s) {
    const hit = s.e.match(re)[0];
    qs.push(ask("blank", s.e.replace(re, "___"), s.e, hit, ens, rnd));
  } else qs.push(ask("en", w.tr, "", w.en, ens, rnd));
  qs.push(ask("listen", "", w.en, w.tr, trs, rnd));
  return qs;
}
