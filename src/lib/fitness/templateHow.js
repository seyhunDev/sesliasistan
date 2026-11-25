// Hazır programların hareket anlatımı (Seyhun 2026-11-25): kısa, konuşma dilinde; adım adım ekranda yazılı görünür ve
// sesli anlatımda okunur. setup: hareketten önce hazırlık (yalnız gerekiyorsa). how: nasıl yapılır, önemli noktalar.
// Her cümle noktayla biter; ekranda her cümle bir adım.
export const HOW = {
  // ---- Günlük reset ----
  "Uzun verişli burun nefesi": {
    setup: "Yere bağdaş kur ya da sandalyeye otur.",
    how: "Sırtın dik, bir elin göğsünde, bir elin karnında. Burundan dört saniye nefes al, karnın şişsin. Ağızdan ya da burundan altı saniyede yavaşça ver. Omuzların kalkmasın.",
  },
  "Ayak tabanı ve baldır mobilitesi": {
    setup: "Yanına küçük bir top al, duvarın önüne geç.",
    how: "Önce ayak tabanını topun üstünde yavaşça ileri geri yuvarla. Sonra ellerinle duvara yaslan, arka bacağın düz, topuğun yerde. Baldırında hafif gerilme hisset, zorlamadan bekle.",
  },
  "90 90 kalça geçişi": {
    how: "Yere otur, iki dizin de doksan derece bükülü olsun. Ellerin arkada destek versin, gövden dik. Dizlerini yavaşça bir yandan öbür yana devir. Hareket kalçadan gelsin, acele etme.",
  },
  "Open book": {
    setup: "Yan yat, başının altına küçük bir yastık koy.",
    how: "Dizlerin bükülü ve üst üste, kolların önde birleşik. Üstteki kolunu kitap açar gibi arkaya aç, gözlerin elini takip etsin. Dizlerin ayrılmasın. Nefes vererek aç, nefes alarak geri kapat.",
  },
  "Wall slide": {
    setup: "Sırtını duvara daya, ayakların bir adım önde.",
    how: "Kollarını W şeklinde duvara yasla. Kollarını duvardan ayırmadan yukarı kaydır, sonra geri indir. Belin duvardan kopmasın. Omuzların kulaklarına kalkmasın.",
  },
  "Dead bug": {
    setup: "Mata sırtüstü yat.",
    how: "Kolların tavana, dizlerin doksan derecede havada. Belini yere bastır. Bir kolunu ve karşı bacağını yavaşça uzat, sonra geri getir, diğer yana geç. Belin yerden kalkarsa hareketi kısalt.",
  },
  "Child pose yan uzanma": {
    setup: "Dizlerinin üstüne geç, kalçanı topuklarına oturt.",
    how: "Kollarını önde uzat, alnını yere bırak. İki elini birlikte bir yana kaydır, karşı yanında gerilmeyi hisset. Rahat nefes al, sonra diğer yana geç.",
  },
  "Bacaklar yukarı sakin nefes": {
    setup: "Kalçan duvara yakın, sırtüstü uzan.",
    how: "Bacaklarını duvara dayayıp yukarı uzat. Ellerin karnında. Burundan yavaş al, uzun ver. Her nefeste biraz daha gevşe.",
  },
  // ---- Kuvvet A hazırlık ----
  "90 90 nefes": {
    setup: "Sırtüstü yat, ayaklarını duvara ya da sandalyeye koy.",
    how: "Kalçan ve dizlerin doksan derece bükülü. Belini hafifçe yere bastır. Burundan al, kaburgaların yana açılsın. Uzun ver, kaburgalar aşağı insin.",
  },
  "Kedi deve": {
    setup: "Dört ayak pozisyonuna geç: eller omuz altında, dizler kalça altında.",
    how: "Nefes verirken sırtını kedi gibi yukarı yuvarla, başın aşağı. Nefes alırken göğsünü öne aç, sırtını hafifçe çukurlaştır. Yavaş ve kontrollü, omurgayı tek tek hareket ettir.",
  },
  "Ayak bileği knee to wall": {
    setup: "Duvara karşı yarım diz çök, öndeki ayağın duvardan bir karış uzakta.",
    how: "Topuğunu yerden kaldırmadan dizini duvara doğru it. Diz ikinci parmağın üstünden gitsin. Bir saniye dokun, geri gel.",
  },
  "Adductor rock back": {
    setup: "Dört ayak pozisyonuna geç, bir bacağını yana düz uzat.",
    how: "Sırtın düz kalsın. Kalçanı topuklarına doğru geri it, uzattığın bacağın iç kısmında gerilme hisset. Sonra yavaşça öne gel.",
  },
  "Glute bridge": {
    setup: "Sırtüstü yat, dizlerin bükülü, ayakların kalça genişliğinde.",
    how: "Topuklarınla yere bas, kalçanı kaldır. Üstte kalçanı sık, bir saniye bekle. Beli değil kalçayı kullan. Yavaşça in.",
  },
  "Bodyweight split squat": {
    setup: "Çantasız. Bir ayak önde, bir ayak geride, uzun bir adım aç.",
    how: "Gövden dik. Arka dizini yere doğru indir. Ön dizin ikinci parmağın üstünde. Ön topuktan iterek kalk.",
  },
  "Ana harekete prova": {
    how: "Birazdan yapacağın ilk ana hareketi yükte değil, kolay ve yavaş yap. Duruşu ve hareket yolunu hisset. Yorulmadan bitir.",
  },
  // ---- Kuvvet A ana ----
  "Sırt çantalı split squat": {
    setup: "Sırt çantasına birkaç kitap ya da su şişesi koy, iki askısını da tak.",
    how: "Bir ayak önde, bir ayak geride uzun adım. Gövden dik. Arka dizini kontrollü indir. Ön dizin ikinci parmağın üstünden gitsin, içe kaçmasın. Ön topuktan iterek kalk.",
  },
  "Tek bacak Romanian deadlift": {
    setup: "Çantayı ya da su şişesini elinde tut.",
    how: "Tek bacak üstünde dur, diz hafif bükülü. Kalçanı geriye it, gövdeni öne eğ, arka bacağın geriye uzansın. Pelvis düz kalsın, yana açılmasın. Kalçadan iterek dik dur.",
  },
  "Band row": {
    setup: "Bandı kapı koluna ya da sağlam bir yere göğüs hizasında bağla.",
    how: "Dik otur ya da dur, kolların önde. Dirseklerini gövdene yakın tutarak bandı karnına çek. Kürek kemiklerini birbirine yaklaştır. Omuzların kulaktan uzak. Yavaşça bırak.",
  },
  "Eğimli şınav": {
    setup: "Ellerini sağlam bir masaya ya da tezgâha koy.",
    how: "Vücudun baştan topuğa düz bir çizgi. Göğsünü masaya doğru indir, dirsekler hafif geride. Kalçan düşmesin. Ellerinle iterek geri gel.",
  },
  "Tek bacak calf raise": {
    setup: "Duvarın önünde dur, elinle hafif destek al.",
    how: "Tek ayak üstünde parmak ucuna yüksel. Üstte bir saniye bekle. Yavaşça in, topuğun yere değsin. Dizin kilitlenmesin.",
  },
  "Side plank kısa kol": {
    setup: "Yan yat, dirseğin omzunun altında.",
    how: "Kalçanı kaldır, baştan ayağa düz bir çizgi olsun. Kalça ve omuz aynı hatta, kalçan geriye kaçmasın. Nefesini tutma.",
  },
  // ---- Kuvvet B hazırlık ----
  "Crocodile breathing": {
    setup: "Yüzüstü yat, alnını ellerinin üstüne koy.",
    how: "Burundan nefes al, karnını ve belini yere doğru şişir. Yavaşça ver, gevşe. Omuzların kalkmasın.",
  },
  "Hip hinge drill": {
    setup: "Ayakların kalça genişliğinde, ellerin kalçanda.",
    how: "Dizlerin hafif bükülü. Kalçanı geriye it, gövdeni sırtın düz kalarak öne eğ. Hareket kalçadan katlanma. Kalçanı öne itip dik dur.",
  },
  "Squat to reach": {
    how: "Ayakların omuz genişliğinde. Derin çömel, dirseklerinle dizlerini hafifçe dışa it. Kalkarken kollarını tavana uzat, göğsünü aç. Topukların yerde kalsın.",
  },
  "Scapular push up": {
    setup: "Şınav pozisyonuna geç, kolların düz.",
    how: "Dirseklerini bükme. Sadece kürek kemiklerini birbirine yaklaştırarak göğsünü indir. Sonra yeri iterek sırtını hafifçe yuvarla. Küçük ve kontrollü bir hareket.",
  },
  "Band pull apart": {
    setup: "Bandı iki elinle omuz genişliğinde, göğüs hizasında tut.",
    how: "Kolların düz. Bandı iki yana açarak göğsüne getir. Kürek kemiklerini sık. Yavaşça geri bırak. Omuzlar kulaktan uzak.",
  },
  "Lateral lunge reach": {
    how: "Geniş dur. Bir yana adım at, o dizini bük, diğer bacağın düz kalsın. Kalçan geride, sırtın düz. Karşı kolunu çapraz uzat. Topuktan iterek ortaya dön.",
  },
  // ---- Kuvvet B ana ----
  "Sırt çantalı squat": {
    setup: "Sırt çantasını iki askıyla tak, gerekirse önde göğsüne al.",
    how: "Ayakların omuz genişliğinde. Kalçanı geri ve aşağı indir, dizlerin parmak yönünde. Topukların ve ayak tabanın yerde. Göğsün dik. Topuktan iterek kalk.",
  },
  "Hip thrust": {
    setup: "Sırtının üst kısmını kanepeye ya da sağlam bir yere daya, dizlerin bükülü.",
    how: "Topuklarınla yere bas, kalçanı yukarı it. Üstte gövden yerle paralel, kalçanı sık. Bel değil kalça çalışsın, kaburgaların aşağıda. Yavaşça in.",
  },
  "Yarım diz band pulldown": {
    setup: "Bandı kapının üstüne ya da yüksek bir yere bağla, yarım diz çök.",
    how: "Gövden dik. Bandı dirseklerini aşağı ve geriye çekerek göğsüne getir. Kaburgaların aşağıda, belin boşluk yapmasın. Yavaşça yukarı bırak.",
  },
  "Half kneeling tek kol press": {
    setup: "Bandı alçak bir yere bağla ya da elinde su şişesi tut, yarım diz çök.",
    how: "Kalçanı sık, gövden dik. Tek kolunla bandı ya da şişeyi yukarı ve hafif öne it. Bel boşluğun artmasın, gövden dönmesin. Yavaşça geri indir.",
  },
  "Reverse lunge": {
    how: "Dik dur. Bir ayağınla geriye uzun adım at, arka dizini yere yaklaştır. Ön dizin ikinci parmağın üstünde. Ön topuktan iterek başa dön. Sessiz ve kontrollü in.",
  },
  "Pallof press": {
    setup: "Bandı göğüs hizasında yana bağla, bandın yanına dur.",
    how: "Bandı iki elinle göğsünde tut. Kollarını öne düz uzat, bir saniye bekle, geri çek. Band seni döndürmeye çalışır, sen dönme. Kalçan ve omuzların hep önde.",
  },
  "Suitcase carry": {
    setup: "Tek eline ağır bir çanta ya da su bidonu al.",
    how: "Dik ve uzun dur, omuzların aynı hizada. Yükün olduğu yana eğilmeden yavaşça yürü. Karnını sıkı tut. Süre bitince elini değiştir.",
  },
  // ---- Yelken mikrodozu ----
  "Hiking hold duvara dayanmalı": {
    setup: "Sırtını duvara daya.",
    how: "Duvardan aşağı kayıp sandalyede oturur gibi dur, dizlerin doksan dereceye yakın. Kollarını önde tut, gövdeni sık. Dizlerin dışa ya da içe kaçmasın. Süre bitene kadar sabit kal.",
  },
  "Band rope pull": {
    setup: "Bandı kapı koluna bağla, karşısına otur ya da çömel.",
    how: "Bandı halat çeker gibi el el arkaya çek. Dirsekler gövdeye yakın, kürek kemiklerin birbirine yaklaşsın. Gövden dik.",
  },
  "Lateral step and stick": {
    setup: "Yanına alçak bir basamak ya da çizgi koy.",
    how: "Yana bir adım at ve tek ayak üstüne yumuşak in. Dizin bükülü, ikinci parmağın üstünde. İki saniye dengede kal. Sonra geri dön.",
  },
  "Half kneeling chop": {
    setup: "Bandı yüksek bir yere bağla, yanına yarım diz çök.",
    how: "Bandı iki elinle yukarıdan alıp çapraz aşağı, karşı kalçana doğru çek. Gücü gövdenden ver, kalçan sabit kalsın. Yavaşça geri bırak.",
  },
  "Towel grip hold": {
    setup: "Havluyu rulo yap.",
    how: "Havluyu iki elinle sıkıca kavra, kolların önde. Sıkmayı bırakmadan süre bitene kadar tut. Omuzlarını kaldırma, nefesini tutma.",
  },
  "Bear plank shoulder tap": {
    setup: "Dört ayak pozisyonuna geç, dizlerini yerden iki parmak kaldır.",
    how: "Sırtın düz, kalçan sabit. Bir elinle karşı omzuna dokun, geri koy, diğer ele geç. Kalçan sağa sola sallanmasın.",
  },
  // ---- Yelken sonrası ----
  "Yürüyüş ve burun nefesi": {
    how: "Rahat tempoda yürü. Burundan dört saniye al, altı saniye ver. Omuzlarını gevşet.",
  },
  "Baldır esnetme": {
    setup: "Ellerinle duvara yaslan.",
    how: "Bir bacağını geriye at, dizi düz, topuğu yerde. Öndeki dizini hafifçe bük. Baldırında gerilmeyi hisset, yarım dakika sonra bacak değiştir.",
  },
  "Kalça fleksör esnetme": {
    setup: "Yarım diz çök, arka dizinin altına yumuşak bir şey koy.",
    how: "Gövdeni dikleştir, kalçanı hafifçe sık. Kalçanı nazikçe öne it, arka bacağın önünde gerilme hisset. Belini çukurlaştırma. Sonra bacak değiştir.",
  },
  "Adduktor esnetme": {
    how: "Bacaklarını geniş aç. Ağırlığını bir yana ver, o dizini bük, diğer bacağın düz kalsın. Sırtın dik. İç bacakta gerilmeyi hisset, sonra yan değiştir.",
  },
  "Torakal rotasyon": {
    setup: "Sırtüstü yat, dizlerin bükülü, kolların yanlara açık.",
    how: "Omuzların yerde kalsın. Dizlerini yavaşça bir yana bırak, başını karşı yana çevir. Rahat nefes al, sonra diğer yana geç.",
  },
  "Uzun verişli nefes": {
    setup: "Bağdaş kur ya da sırtüstü uzan.",
    how: "Gözlerini kapat. Burundan dört saniye al, altı saniyede yavaşça ver. Her verişte omuzlarını ve çeneni gevşet.",
  },
};
