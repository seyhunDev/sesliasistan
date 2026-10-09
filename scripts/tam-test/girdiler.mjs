// Test cümleleri: asistana gerçekte söylenebilecek cümleler ve beklenen sonuç.
// TEK: [cümle, beklenen yol(lar), bağlam?]  "ai" = ana yapay zeka (plan, görev, not, mesaj, soru: tasarım gereği doğru yer)
// COK: [cümle, beklenen iş türleri]  bir cümlede birden çok iş; asistan hepsini görev listesine almalı
// GERCEK: ses tanımanın / elle yazımın bozduğu, insan hatalı cümleler (elle yazıldı, her biri gerçek bir hata türü)
// Ayrıca her TEK ve COK cümle BOZUCULAR ile kendiliğinden bozulur (noktalamasız, kesmesiz, Türkçe harfsiz, dolgu sözlü, kekeme).

const AI = "ai";
export const TEK = [];
const add = (grup, want, list, o) => list.forEach((s) => TEK.push({ grup, s, want: [].concat(want), o: o || {} }));

add("Plan / takvim", AI, [
  "Yarın saat 10'da antrenman ekle.", "Cumartesi sabah 9'da iskelede buluşma, takvime koy.", "Haftaya salı 18:00 veli toplantısı ekle.",
  "15 Ekim'de saat 11'de federasyon toplantısı var, takvime yaz.", "Her salı ve perşembe 17'de Optimist antrenmanı.", "Yarınki antrenmanı 11'e al.",
  "Cuma günkü toplantıyı pazartesiye ertele.", "Yarınki antrenmanı iptal et, rüzgar çok sert.",
]);
add("Görev", AI, [
  "Ali'ye motoru kontrol etmesini hatırlat.", "Görev ekle: römork lastiklerini kontrol et.", "Gökhan'a görev ver, şamandıraları saysın, cumaya kadar.",
  "Bana cuma günü sigortayı yenilemeyi hatırlat.", "Motor yağı görevini tamamla.", "Tekneleri hazırla görevi bitti.",
]);
add("Not", AI, ["Not al: malzeme odası dolu.", "Not düş, iskele lambası yanmıyor.", "Notlara ekle: yeni telsiz şifresi değişti."]);
add("Mesaj", AI, [
  "Ali'ye yaz, yarın 9'da iskelede olsun.", "Ayşe'ye söyle toplantı ertelendi.", "Mustafa'ya mesaj at, antrenmana gelmedi diye merak ettim.",
  "Ali'ye yaz, faturayı ödedim.", "Sporculara söyle bugün antrenman iptal.", "Ekibe yaz, yarın sekizde iskelede toplanıyoruz.",
  "Velilere mesaj at, cumartesi antrenman var.", "Ali'ye WhatsApp'tan yaz, yarın gelsin.", "Velilere yaz, gelmeyenler cumartesi telafi yapacak.",
  "Gökhan'a mesaj at, marketten süt alsın.",
]);
add("Soru", AI, [
  "Yarın ne var?", "Bu hafta neler var?", "Geciken görev var mı?", "Yarın rüzgar kaç knot?", "Dün antrenmana kimler geldi?",
  "Antrenmana Ali geldi mi?", "Kaç sporcumuz var?", "Bu ay ne kadar fiş harcadım?",
]);
add("Yoklama", "attendance", [
  "Yoklama al, Ali ve Ayşe geldi.", "Bugün antrenmana Emre gelmedi.", "Bugün antrenmana Mustafa katıldı.", "Dünkü antrenmana Enes gelmedi, yoklamaya yaz.",
  "Mustafa geldi, yoklamaya ekle.", "Bugün İlay antrenmana katıldı, onu yoklamaya ekle.",
]);
add("Yoklama (yoklama sayfasında)", "attendance", ["Ali ve Zeynep geldi, Emre izinli.", "Mehmet raporlu.", "Kalanlar gelmedi."], { path: "/athletes/attendance" });
add("Antrenman günlüğü", "log", ["Dün 14 knot poyrazda start çalıştık, 2 saat sürdü.", "Antrenman günlüğüne yaz: bugün tramola çalıştık.", "Antrenman günlüğü oluştur."]);
add("Yarış", "race", [
  "29 Ekim Cumhuriyet Kupası adında yarış oluştur.", "Atatürk Kupası yarışı oluştur.", "Çeşme'de 7-11 Kasım yarış ekle, Ali ve Ayşe katılacak.",
  "Foça yarışına Mehmet'i de ekle.", "Foça yarışının bütçesine otel kişi başı 3500 ekle.",
]);
add("Yarış aç", "raceOpen", ["Foça yarışını aç.", "Sıradaki yarışı göster."]);
add("Yarış (yarış sayfasında)", ["race", "raceHere", "hotel"], ["Mehmet'i de ekle.", "Ali üçüncü oldu.", "24 tekne yarıştı."], { path: "/athletes/races/r1" });
add("Instagram", "post", [
  "Foça yarışı için Instagram gönderisi hazırla.", "29 Ekim gönderisi hazırla.", "Cumhuriyet Kupası için görsel hazırla.", "Atatürk Kupası afişini hazırla.",
]);
add("Instagram (gönderi ekranında)", "postEdit", ["Daha kısa yaz.", "Rengi mavi yap."], { path: "/posts/new" });
add("Nakit ödeme / bağış", "income", ["Ali Kaya'nın Ekim aidatı nakit 1500 alındı.", "Enes aidatını nakit verdi.", "Ahmet beyden 2000 lira bağış geldi."]);
add("Aidat", "dues", ["Bu ay kim aidat ödemedi?", "Aidat hatırlatması gönder."]);
add("Fatura", "invoice", ["Turkcell faturası ödendi.", "Elektrik faturasını ödedim."]);
add("Fiş", ["receiptCam"], ["Fiş yükle.", "Fiş fotoğrafı çek."]);
add("Sporcu", "athlete", ["Yeni sporcu ekle: Can Tekin, 2014 doğumlu.", "Ali Kaya'yı arşive al."]);
add("Kişi", "person", ["Kişi ekle: Ayşe Yılmaz, eşim, 0532 111 22 33."]);
add("Doğum günü", "birthday", ["Annemin doğum günü 12 Mart."]);
add("Alışveriş", ["shopping", "shopping(mark)"], ["Listeye süt ekle.", "Alışveriş listesine ekmek ve yumurta ekle.", "Ekmek alındı."]);
add("Envanter", "inventory", ["Envantere 3 Optimist teknesi ekle.", "Envanterden 2 şamandıra çıkar."]);
add("Etkinlik", "event", ["Kamp planı yapmak istiyorum, tavsiye ver.", "Balığa gideceğiz, ne lazım?"]);
add("Ders programı", "schedule", ["Ders programıma çarşamba 10'da kimya ekle."]);
add("Arama", "call", ["Ali'yi ara.", "Gökhan Arslan'ı arar mısın?"]);
add("Sayfa açma", "navigate", [
  "Yoklamayı aç.", "Ayarlara git.", "Aidatlar sayfasını aç.", "Hesaplarımı aç.", "Yarışlar sayfasına git.", "Instagram'ı aç.", "Sporcular sayfasını aç.",
  "Planları aç.", "Ana sayfaya dön.", "Geri dön.",
]);
add("Kapatma", "close", ["Tamam, kapat.", "Teşekkürler.", "Kapat.", "Bitir."]);
add("Kapatma (soru sonrası)", "close", ["Yok.", "Hayır, başka yok."], { askedMore: true });
add("Geri al", "undo", ["Son kaydı geri al."]);

export const COK = [
  ["Atatürk Kupası yarışı oluştur, afişini hazırla ve bugün İlay antrenmana katıldı, onu yoklamaya ekle.", ["race", "post", "attendance"]],
  ["29 Ekim Cumhuriyet yarışı oluştur. Yarış için görsel oluştur ve bugün antrenmana Mustafa katıldı, yoklamaya onu ekle.", ["race", "post", "attendance"]],
  ["Enes aidatını nakit verdi, Mehmet de geldi, yoklamaya ekle.", ["income", "attendance"]],
  ["Bugün antrenmana Ali ve Ayşe geldi. Ali Kaya'nın Ekim aidatı nakit 1500 alındı.", ["attendance", "income"]],
  ["Yoklama al, Mustafa geldi. Yarın 10'da toplantı ekle.", ["attendance", "other"]],
  ["Cumhuriyet Kupası adında yarış oluştur, Ali ve Ayşe katılacak. Instagram gönderisi hazırla.", ["race", "post"]],
  ["Foça yarışına Mehmet'i ekle, sonra Ali'ye yaz otel ayarlandı.", ["race", "other"]],
  ["Foça yarışını aç, ardından Ali'yi ara.", ["race", "call"]],
  ["Turkcell faturası ödendi. Yarın 10'da antrenman ekle.", ["invoice", "other"]],
  ["Envantere 2 telsiz ekle. Listeye süt ekle.", ["inventory", "shopping"]],
  ["Dün 14 knot poyrazda start çalıştık, antrenman günlüğüne yaz. Ali ve Ayşe geldi, yoklamaya ekle.", ["log", "attendance"]],
  ["Yeni sporcu ekle Can Tekin 2014 doğumlu. Cumhuriyet Kupası'na Can'ı da ekle.", ["athlete", "race"]],
  ["Atatürk Kupası adında bir yarış oluştur. Bugün antrenmana Mustafa geldi. Enes aidatını nakit verdi. Atatürk Kupası için Instagram görseli hazırla.", ["race", "attendance", "income", "post"]],
  ["Elektrik faturasını ödedim, Enes aidatını nakit verdi.", ["invoice", "income"]],
  ["Yoklamaya Mustafa ve Enes'i ekle, sonra Instagram'da yarış duyurusu hazırla.", ["attendance", "post"]],
  ["Listeye çay ve şeker ekle, envanterden 1 şamandıra çıkar.", ["shopping", "inventory"]],
  ["Ali'yi ara ve takvime yarın 3'te görüşme ekle.", ["call", "other"]],
  ["Aidat hatırlatması gönder, sonra aidatlar sayfasını aç.", ["athlete", "nav"]],
];

// Elle yazılmış gerçek hatalar: [cümle, beklenen yol ya da iş türleri (dizi = çok iş), hata türü, bağlam?]
export const GERCEK = [
  // Seyhun'un 9 Ekim'de söylediği cümle (yalnız yoklama yapılmıştı)
  ["Atatürk Kupası yarışı oluru afişini hazirla ve bugün İlay antrenmana katıldı. onu yoklamaya ekle", ["race", "post", "attendance"], "yanlış duyulan fiil (oluru, hazirla)"],
  ["ataturk kupasi yarisi oluru afisini hazirla ve bugun ilay antremana katildi onu yoklamaya ekle", ["race", "post", "attendance"], "aynı cümle, Türkçe harfsiz ve noktasız"],
  ["yarış oluru atatürk kupası sonra instagram afişi hazirla", ["race", "post"], "yanlış duyulan fiil + sonra"],
  ["bugun ilay antremana katildi yoklamaya ekle ve ataturk kupasi afisini hazirla", ["attendance", "post"], "Türkçe harfsiz, antreman"],
  ["enes aidatini nakit verdi mehmet de geldi yoklamaya ekle", ["income", "attendance"], "noktasız, Türkçe harfsiz"],
  ["foca yarisina mehmeti ekle sonra aliye yaz otel ayarlandi", ["race", "other"], "kesmesiz, Türkçe harfsiz"],
  ["yeni sporcu ekle can tekin ve bugün antremana geldi yoklamaya yaz", ["athlete", "attendance"], "antreman"],
  ["yarin saat onda antreman ekle", "ai", "sayı yazıyla, antreman"],
  ["bugun antremana mustafa geldi", "attendance", "Türkçe harfsiz, antreman"],
  ["yok lamaya aliyi ekle geldi", "attendance", "kelime bölünmüş (yok lama)"],
  ["yoklama al alive ayşe geldi", "attendance", "\"Ali ve\" birleşik duyulmuş"],
  ["foca yarisini ac", "raceOpen", "Türkçe harfsiz"],
  ["insta icin cumhuriyet kupasi gonderisi hazirla", "post", "insta, Türkçe harfsiz"],
  ["29 ekim gönderisini hazırlarmısın", "post", "bitişik soru eki"],
  ["aliye vatsaptan yaz yarin gelsin", "ai", "vatsap"],
  ["gokhana mesaj at motoru getirsin", "ai", "kesmesiz, Türkçe harfsiz"],
  ["turkcel faturasi odendi", "invoice", "marka adı eksik harf"],
  ["listeye sut ekle", "shopping", "Türkçe harfsiz"],
  ["envantere iki telsiz ekle", "inventory", "sayı yazıyla"],
  ["dün 12 not poyrazda start çalıştık", "log", "knot → not"],
  ["dunku antremanda 12 knot poyraz vardi start calistik", "log", "Türkçe harfsiz, antreman"],
  ["tamam teşekkür ederim", "close", "kapatma sözü"],
  ["tamam tesekkurler", "close", "Türkçe harfsiz kapatma"],
  ["kapat şunu", "close", "kapatma + söz"],
  ["sporcu ekle can tekin iki bin on dört doğumlu", "athlete", "yıl yazıyla"],
  ["planlar sayfasını açarmısın", "navigate", "bitişik soru eki"],
  ["ayarlara gir", "navigate", "git yerine gir"],
  ["yarışlara git", "navigate", "kısa sayfa adı"],
  ["cumhuriyet kupasına mustafayla enesi ekle", "race", "kesmesiz, -yla"],
  ["aidat hatırlatması yolla", "dues", "gönder yerine yolla"],
  ["bu ay kimler aidat vermedi", "dues", "ödemedi yerine vermedi"],
  ["alinin ekim aidati nakit bin beş yüz alındı", "income", "tutar yazıyla, kesmesiz"],
  ["aliyi ararmısın", "call", "kesmesiz, bitişik soru eki"],
  ["yarın ki toplantıyı sil", "ai", "\"ki\" ayrı yazılmış"],
  ["kamp planı yapcaz ne lazım", "event", "konuşma dili (yapcaz)"],
  ["ders programima carsamba 10da kimya ekle", "schedule", "Türkçe harfsiz"],
  ["ekibe yazz yarın 8de iskelede", "ai", "yazım hatası (yazz)"],
  ["velilere mesaj at cumartesi antreman var", "ai", "mesaj, yoklama sanılmamalı"],
  ["bugün antremana kimler geldi", "ai", "soru, yoklama yazılmamalı"],
  ["mustafa geldi mi antrenmana", "ai", "soru, yoklama yazılmamalı"],
  ["aliye söyle teşekkürler", "ai", "mesaj, kapatma sanılmamalı"],
  ["optimus antremanı ekle yarın 5te", "ai", "optimist → optimus"],
  ["ali ve zeynep geldi emre izinli", "attendance", "noktasız (yoklama sayfasında)", { path: "/athletes/attendance" }],
  ["daha kısa yazz", "postEdit", "yazım hatası (gönderi ekranında)", { path: "/posts/new" }],
];

// Bozucular: aynı cümleyi insan/ses tanıma hatasıyla yeniden yazar. Beklenen sonuç değişmez.
const lower = (s) => s.toLocaleLowerCase("tr-TR");
const flat = (s) => s.replace(/\s+/g, " ").trim();
const ASCII = { ı: "i", İ: "I", ş: "s", Ş: "S", ğ: "g", Ğ: "G", ç: "c", Ç: "C", ö: "o", Ö: "O", ü: "u", Ü: "U" };
export const BOZUCULAR = [
  { ad: "noktalamasız", f: (s) => flat(s.replace(/[.,!?;:]/g, " ")) },
  { ad: "küçük harf, kesme işaretsiz", f: (s) => flat(lower(s).replace(/[.,!?;:]/g, " ").replace(/['’]/g, "")) },
  { ad: "Türkçe harfsiz (klavye)", f: (s) => s.replace(/[ıİşŞğĞçÇöÖüÜ]/g, (c) => ASCII[c]) },
  { ad: "dolgu sözlü (şey, ııı)", f: (s) => `şey ııı ${s}` },
  { ad: "kekeme (ilk söz iki kez)", f: (s) => { const w = s.split(" "); return [w[0], ...w].join(" "); } },
];
