// İngilizce bölümleri (Seyhun 2026-11-26: "kullanıcı seçecek… Önemli fiiller diye yeni bir sayfa… bir tane daha ekle, sen karar ver…
// ilerledikçe açılış ekranında ilerlemesini göster, tamamladıysa göster ama isterse yine baştan çalışabilir… geliştirilebilir olsun";
// örnek /mnt/project-files/ingilizce-hatirla/acilis.html onaylandı). Her bölüm aynı kalıp biçimini kullanır (englishChunks.js):
// baş + boşluk + son, boşluğa giren parçalar. Böylece aynı adımlarla öğretilir (Dinle · Değiştir · Kur · Hatırla · Konuş, ChunkStudy).
// YENİ BÖLÜM EKLEMEK: kalıplarını yaz (aşağıdaki gibi, kimliği eşsiz ve değişmez), PATHS'e bir satır ekle. Açılış ve ilerleme kendiliğinden gelir.
// fills satırı: [boşluğa giren İngilizce, onun Türkçesi (cümlede geçtiği hâli), bütün cümlenin Türkçesi]
import { CHUNKS, CHUNK_TOPICS } from "@/lib/englishChunks";

const C = (path, id, topic, head, tail, tr, rule, near, fills) => ({ path, id, topic, head, tail, tr, rule, near, fills });

// ---------- Önemli fiiller: 12 fiil × günlük hayattaki en yaygın 5 anlamı (rule = anlamı) ----------
const V = (verb, n, head, tail, tr, rule, near, fills) => C("fiil", `v-${verb}-${n}`, verb, head, tail, tr, rule, near, fills);
export const VERB_CHUNKS = [
  V("get", 1, "Can you get", "?", "…alır mısın?", "almak", "Can you make", [
    ["some bread", "biraz ekmek", "Biraz ekmek alır mısın?"],
    ["a coffee for me", "bana bir kahve", "Bana bir kahve alır mısın?"],
    ["the tickets", "biletleri", "Biletleri alır mısın?"],
  ]),
  V("get", 2, "I'm getting", "", "…oluyorum, …laşıyorum", "olmak (hâle gelmek)", "I'm being", [
    ["tired", "yoruluyorum", "Yoruluyorum."],
    ["hungry", "acıkıyorum", "Acıkıyorum."],
    ["better", "iyileşiyorum", "İyileşiyorum."],
  ]),
  V("get", 3, "What time did you get", "?", "…saat kaçta vardın?", "varmak", "What time did you go", [
    ["home", "eve", "Eve saat kaçta vardın?"],
    ["to work", "işe", "İşe saat kaçta vardın?"],
    ["there", "oraya", "Oraya saat kaçta vardın?"],
  ]),
  V("get", 4, "I don't get", "", "…anlamıyorum", "anlamak", "I don't take", [
    ["it", "bunu", "Bunu anlamıyorum."],
    ["the joke", "şakayı", "Şakayı anlamıyorum."],
    ["what you mean", "ne demek istediğini", "Ne demek istediğini anlamıyorum."],
  ]),
  V("get", 5, "Let's get", "", "…binelim / inelim", "binmek, inmek", "Let's take", [
    ["on the bus", "otobüse binelim", "Otobüse binelim."],
    ["off at the next stop", "sonraki durakta inelim", "Sonraki durakta inelim."],
    ["on the train", "trene binelim", "Trene binelim."],
  ]),

  V("make", 1, "Let me make", "", "…yapayım", "yapmak, hazırlamak", "Let me do", [
    ["some tea", "biraz çay", "Biraz çay yapayım."],
    ["breakfast", "kahvaltı", "Kahvaltı hazırlayayım."],
    ["dinner", "akşam yemeği", "Akşam yemeği yapayım."],
  ]),
  V("make", 2, "We need to make", "", "…lazım", "karar, plan yapmak", "We need to do", [
    ["a decision", "bir karar vermemiz", "Bir karar vermemiz lazım."],
    ["a plan", "bir plan yapmamız", "Bir plan yapmamız lazım."],
    ["a reservation", "rezervasyon yapmamız", "Rezervasyon yapmamız lazım."],
  ]),
  V("make", 3, "It makes me", "", "beni …", "…tırmak, …dırmak", "It does me", [
    ["happy", "mutlu", "Beni mutlu ediyor."],
    ["nervous", "gergin", "Beni gergin yapıyor."],
    ["laugh", "güldürüyor", "Beni güldürüyor."],
  ]),
  V("make", 4, "She makes", "", "…kazanıyor", "kazanmak (para)", "She wins", [
    ["good money", "iyi para", "İyi para kazanıyor."],
    ["a lot of money", "çok para", "Çok para kazanıyor."],
    ["extra money", "ek para", "Ek para kazanıyor."],
  ]),
  V("make", 5, "Does it make", "?", "…mı?", "anlam, fark (make sense)", "Does it do", [
    ["sense", "mantıklı", "Mantıklı mı?"],
    ["a difference", "fark eder", "Fark eder mi?"],
    ["any noise", "ses çıkarır", "Ses çıkarır mı?"],
  ]),

  V("take", 1, "It takes", "", "…sürüyor", "sürmek (zaman)", "It makes", [
    ["ten minutes", "on dakika", "On dakika sürüyor."],
    ["an hour by car", "arabayla bir saat", "Arabayla bir saat sürüyor."],
    ["a long time", "uzun", "Uzun sürüyor."],
  ]),
  V("take", 2, "I'll take", "", "…alayım", "almak (seçip)", "I'll make", [
    ["this one", "bunu", "Bunu alayım."],
    ["the blue one", "mavi olanı", "Mavi olanı alayım."],
    ["a small coffee", "küçük bir kahve", "Küçük bir kahve alayım."],
  ]),
  V("take", 3, "Can you take", "?", "…götürür müsün?", "götürmek", "Can you bring", [
    ["me to the airport", "beni havalimanına", "Beni havalimanına götürür müsün?"],
    ["the kids to school", "çocukları okula", "Çocukları okula götürür müsün?"],
    ["this to the boat", "bunu tekneye", "Bunu tekneye götürür müsün?"],
  ]),
  V("take", 4, "Let's take", "", "…gidelim", "binmek (taşıt)", "Let's make", [
    ["a taxi", "taksiyle", "Taksiyle gidelim."],
    ["the bus", "otobüsle", "Otobüsle gidelim."],
    ["the ferry", "vapurla", "Vapurla gidelim."],
  ]),
  V("take", 5, "I need to take", "", "…lazım", "duş almak, mola vermek", "I need to make", [
    ["a shower", "duş almam", "Duş almam lazım."],
    ["a break", "mola vermem", "Mola vermem lazım."],
    ["a photo", "fotoğraf çekmem", "Fotoğraf çekmem lazım."],
  ]),

  V("have", 1, "Do you have", "?", "…var mı?", "sahip olmak", "Are you have", [
    ["a pen", "kalemin", "Kalemin var mı?"],
    ["any questions", "sorunuz", "Sorunuz var mı?"],
    ["time now", "şimdi vaktin", "Şimdi vaktin var mı?"],
  ]),
  V("have", 2, "Let's have", "", "…yiyelim / içelim", "yemek, içmek", "Let's take", [
    ["lunch", "öğle yemeği", "Öğle yemeği yiyelim."],
    ["a coffee", "bir kahve", "Bir kahve içelim."],
    ["dinner together", "birlikte akşam yemeği", "Birlikte akşam yemeği yiyelim."],
  ]),
  V("have", 3, "I have to", "", "…lazım", "zorunda olmak", "I must to", [
    ["go now", "şimdi gitmem", "Şimdi gitmem lazım."],
    ["work tomorrow", "yarın çalışmam", "Yarın çalışmam lazım."],
    ["call my mother", "annemi aramam", "Annemi aramam lazım."],
  ]),
  V("have", 4, "Have a", "!", "…!", "geçirmek (iyi dilek)", "Make a", [
    ["nice day", "güzel bir gün", "Güzel bir gün geçir!"],
    ["good time", "iyi vakit", "İyi vakit geçir!"],
    ["safe trip", "iyi yolculuk", "İyi yolculuklar!"],
  ]),
  V("have", 5, "I'm having my", "", "…tırıyorum", "yaptırmak", "I'm making my", [
    ["hair cut", "saçımı", "Saçımı kestiriyorum."],
    ["car washed", "arabamı", "Arabamı yıkatıyorum."],
    ["sail repaired", "yelkenimi", "Yelkenimi tamir ettiriyorum."],
  ]),

  V("go", 1, "I'm going to", "", "…gidiyorum", "gitmek", "I'm going at", [
    ["the gym", "spor salonuna", "Spor salonuna gidiyorum."],
    ["the market", "markete", "Markete gidiyorum."],
    ["work", "işe", "İşe gidiyorum."],
  ]),
  V("go", 2, "Let's go", "", "…gidelim", "…meye gitmek (go + -ing)", "Let's go to", [
    ["swimming", "yüzmeye", "Yüzmeye gidelim."],
    ["shopping", "alışverişe", "Alışverişe gidelim."],
    ["sailing", "yelkene", "Yelkene gidelim."],
  ]),
  V("go", 3, "How did", "go?", "…nasıl geçti?", "geçmek (nasıl gitti)", "How was", [
    ["the race", "yarış", "Yarış nasıl geçti?"],
    ["the meeting", "toplantı", "Toplantı nasıl geçti?"],
    ["your exam", "sınavın", "Sınavın nasıl geçti?"],
  ]),
  V("go", 4, "It's gone", "", "…", "olmak (bozulma, değişme)", "It's become", [
    ["cold", "soğudu", "Soğudu."],
    ["quiet", "sessizleşti", "Sessizleşti."],
    ["bad", "bozuldu", "Bozuldu."],
  ]),
  V("go", 5, "Does this go with", "?", "bu …uyar mı?", "uymak (go with)", "Does this come with", [
    ["my shoes", "ayakkabılarımla", "Bu ayakkabılarımla uyar mı?"],
    ["the blue shirt", "mavi gömlekle", "Bu mavi gömlekle uyar mı?"],
    ["red wine", "kırmızı şarapla", "Bu kırmızı şarapla uyar mı?"],
  ]),

  V("come", 1, "Can you come", "?", "…gelebilir misin?", "gelmek", "Can you go", [
    ["to the party", "partiye", "Partiye gelebilir misin?"],
    ["tomorrow", "yarın", "Yarın gelebilir misin?"],
    ["with us", "bizimle", "Bizimle gelebilir misin?"],
  ]),
  V("come", 2, "I come from", "", "…lıyım", "…lı olmak (nereli)", "I'm come from", [
    ["Izmir", "İzmir", "İzmirliyim."],
    ["Turkey", "Türkiye", "Türkiyeliyim."],
    ["a small town", "küçük bir kasaba", "Küçük bir kasabadanım."],
  ]),
  V("come", 3, "Come", "!", "…!", "gel (come in, come on)", "Go", [
    ["in", "içeri gel", "İçeri gel!"],
    ["on", "hadi", "Hadi!"],
    ["back soon", "yakında geri gel", "Yakında geri gel!"],
  ]),
  V("come", 4, "Does it come with", "?", "…dahil mi?", "dahil olmak (come with)", "Does it go with", [
    ["breakfast", "kahvaltı", "Kahvaltı dahil mi?"],
    ["a drink", "içecek", "İçecek dahil mi?"],
    ["a charger", "şarj aleti", "Şarj aleti dahil mi?"],
  ]),
  V("come", 5, "When did you come", "?", "ne zaman …geldin?", "dönmek (come back)", "When did you go", [
    ["back", "geri", "Ne zaman geri geldin?"],
    ["home", "eve", "Eve ne zaman geldin?"],
    ["to Dikili", "Dikili'ye", "Dikili'ye ne zaman geldin?"],
  ]),

  V("put", 1, "Put it", "", "onu …koy", "koymak", "Take it", [
    ["on the table", "masanın üstüne", "Onu masanın üstüne koy."],
    ["in the bag", "çantaya", "Onu çantaya koy."],
    ["over there", "oraya", "Onu oraya koy."],
  ]),
  V("put", 2, "Put on", "", "…giy", "giymek, takmak (put on)", "Take on", [
    ["your jacket", "ceketini", "Ceketini giy."],
    ["your life jacket", "can yeleğini", "Can yeleğini giy."],
    ["your hat", "şapkanı", "Şapkanı tak."],
  ]),
  V("put", 3, "Let's put off", "", "…erteleyelim", "ertelemek (put off)", "Let's put on", [
    ["the meeting", "toplantıyı", "Toplantıyı erteleyelim."],
    ["the trip", "geziyi", "Geziyi erteleyelim."],
    ["the race until Sunday", "yarışı pazara", "Yarışı pazara erteleyelim."],
  ]),
  V("put", 4, "Please put away", "", "lütfen …kaldır", "kaldırmak (put away)", "Please put off", [
    ["your phone", "telefonunu", "Lütfen telefonunu kaldır."],
    ["the toys", "oyuncakları", "Lütfen oyuncakları kaldır."],
    ["the sails", "yelkenleri", "Lütfen yelkenleri kaldır."],
  ]),
  V("put", 5, "I can't put up with", "", "…katlanamıyorum", "katlanmak (put up with)", "I can't put up", [
    ["the noise", "gürültüye", "Gürültüye katlanamıyorum."],
    ["this heat", "bu sıcağa", "Bu sıcağa katlanamıyorum."],
    ["his attitude", "onun tavrına", "Onun tavrına katlanamıyorum."],
  ]),

  V("keep", 1, "Can you keep", "?", "…tutar mısın?", "tutmak, saklamak", "Can you hold on", [
    ["this for me", "bunu benim için", "Bunu benim için tutar mısın?"],
    ["a secret", "sır", "Sır tutar mısın?"],
    ["my seat", "yerimi", "Yerimi tutar mısın?"],
  ]),
  V("keep", 2, "Keep", "", "…devam et", "devam etmek (keep + -ing)", "Keep to", [
    ["going", "gitmeye", "Gitmeye devam et."],
    ["trying", "denemeye", "Denemeye devam et."],
    ["practicing", "çalışmaya", "Çalışmaya devam et."],
  ]),
  V("keep", 3, "Keep me", "", "beni …", "haberdar etmek (keep me posted)", "Keep my", [
    ["posted", "haberdar et", "Beni haberdar et."],
    ["updated", "bilgilendir", "Beni bilgilendir."],
    ["in mind", "aklında tut", "Beni aklında tut."],
  ]),
  V("keep", 4, "Keep the", "", "…tut", "tutmak (bir hâlde)", "Hold the", [
    ["door closed", "kapıyı kapalı", "Kapıyı kapalı tut."],
    ["room clean", "odayı temiz", "Odayı temiz tut."],
    ["boat dry", "tekneyi kuru", "Tekneyi kuru tut."],
  ]),
  V("keep", 5, "I can't keep up with", "", "…yetişemiyorum", "yetişmek (keep up)", "I can't keep on with", [
    ["you", "sana", "Sana yetişemiyorum."],
    ["the news", "haberlere", "Haberlere yetişemiyorum."],
    ["the work", "işe", "İşe yetişemiyorum."],
  ]),

  V("give", 1, "Can you give me", "?", "bana …verir misin?", "vermek", "Can you take me", [
    ["a hand", "bir el", "Bana bir el verir misin?"],
    ["the salt", "tuzu", "Bana tuzu verir misin?"],
    ["a minute", "bir dakika", "Bana bir dakika verir misin?"],
  ]),
  V("give", 2, "I gave up", "", "…bıraktım", "bırakmak (give up)", "I gave out", [
    ["smoking", "sigarayı", "Sigarayı bıraktım."],
    ["sugar", "şekeri", "Şekeri bıraktım."],
    ["coffee", "kahveyi", "Kahveyi bıraktım."],
  ]),
  V("give", 3, "I'll give", "back tomorrow.", "…yarın geri veririm", "geri vermek (give back)", "I'll take", [
    ["it", "onu", "Onu yarın geri veririm."],
    ["your book", "kitabını", "Kitabını yarın geri veririm."],
    ["the money", "parayı", "Parayı yarın geri veririm."],
  ]),
  V("give", 4, "She's giving", "", "…veriyor / yapıyor", "vermek (ders, konuşma)", "She's making", [
    ["a talk", "bir konuşma", "Bir konuşma yapıyor."],
    ["a party", "parti", "Parti veriyor."],
    ["a lesson", "ders", "Ders veriyor."],
  ]),
  V("give", 5, "Give way to", "", "…yol ver", "yol vermek (give way)", "Give road to", [
    ["the boats on the right", "sağdaki teknelere", "Sağdaki teknelere yol ver."],
    ["the bus", "otobüse", "Otobüse yol ver."],
    ["people walking", "yayalara", "Yayalara yol ver."],
  ]),

  V("look", 1, "Look at", "!", "…bak!", "bakmak", "See at", [
    ["the sky", "gökyüzüne", "Gökyüzüne bak!"],
    ["this", "şuna", "Şuna bak!"],
    ["the wind", "rüzgâra", "Rüzgâra bak!"],
  ]),
  V("look", 2, "You look", "", "…görünüyorsun", "görünmek", "You see", [
    ["tired", "yorgun", "Yorgun görünüyorsun."],
    ["great", "harika", "Harika görünüyorsun."],
    ["worried", "endişeli", "Endişeli görünüyorsun."],
  ]),
  V("look", 3, "I'm looking for", "", "…arıyorum", "aramak (look for)", "I'm looking at", [
    ["my keys", "anahtarlarımı", "Anahtarlarımı arıyorum."],
    ["a pharmacy", "bir eczane", "Bir eczane arıyorum."],
    ["a job", "iş", "İş arıyorum."],
  ]),
  V("look", 4, "Can you look after", "?", "…göz kulak olur musun?", "bakmak, göz kulak olmak (look after)", "Can you look for", [
    ["the kids", "çocuklara", "Çocuklara göz kulak olur musun?"],
    ["my bag", "çantama", "Çantama göz kulak olur musun?"],
    ["the dog", "köpeğe", "Köpeğe göz kulak olur musun?"],
  ]),
  V("look", 5, "It looks like", "", "…gibi görünüyor", "benzemek (look like)", "It looks as", [
    ["rain", "yağmur yağacak", "Yağmur yağacak gibi görünüyor."],
    ["a good day", "güzel bir gün", "Güzel bir gün gibi görünüyor."],
    ["he's late", "geç kalmış", "Geç kalmış gibi görünüyor."],
  ]),

  V("turn", 1, "Can you turn", "?", "…mısın?", "açmak, kapatmak (turn on/off)", "Can you open", [
    ["on the light", "ışığı açar", "Işığı açar mısın?"],
    ["off the TV", "televizyonu kapatır", "Televizyonu kapatır mısın?"],
    ["down the music", "müziğin sesini kısar", "Müziğin sesini kısar mısın?"],
  ]),
  V("turn", 2, "Turn", "", "…dön", "dönmek", "Return", [
    ["left", "sola", "Sola dön."],
    ["right at the corner", "köşeden sağa", "Köşeden sağa dön."],
    ["around", "geri", "Geri dön."],
  ]),
  V("turn", 3, "She's turning", "", "…yaşına giriyor", "olmak (yaş)", "She's becoming", [
    ["ten", "on", "On yaşına giriyor."],
    ["forty this year", "bu yıl kırk", "Bu yıl kırk yaşına giriyor."],
    ["eighteen", "on sekiz", "On sekiz yaşına giriyor."],
  ]),
  V("turn", 4, "They turned down", "", "…reddettiler", "reddetmek (turn down)", "They turned off", [
    ["my offer", "teklifimi", "Teklifimi reddettiler."],
    ["the invitation", "daveti", "Daveti reddettiler."],
    ["our request", "isteğimizi", "İsteğimizi reddettiler."],
  ]),
  V("turn", 5, "It turned out", "", "…çıktı", "çıkmak, anlaşılmak (turn out)", "It turned up", [
    ["well", "iyi", "İyi çıktı."],
    ["to be easy", "kolay", "Kolay çıktı."],
    ["to be true", "doğru", "Doğru çıktı."],
  ]),

  V("run", 1, "I run", "", "…koşuyorum", "koşmak", "I walk", [
    ["every morning", "her sabah", "Her sabah koşuyorum."],
    ["by the sea", "deniz kenarında", "Deniz kenarında koşuyorum."],
    ["five kilometers", "beş kilometre", "Beş kilometre koşuyorum."],
  ]),
  V("run", 2, "He runs", "", "…işletiyor, yönetiyor", "işletmek, yönetmek", "He works", [
    ["a small hotel", "küçük bir otel", "Küçük bir otel işletiyor."],
    ["the sailing club", "yelken kulübünü", "Yelken kulübünü yönetiyor."],
    ["his own business", "kendi işini", "Kendi işini yönetiyor."],
  ]),
  V("run", 3, "We've run out of", "", "…bitti", "bitmek (run out of)", "We've run off", [
    ["milk", "sütümüz", "Sütümüz bitti."],
    ["time", "vaktimiz", "Vaktimiz bitti."],
    ["fuel", "yakıtımız", "Yakıtımız bitti."],
  ]),
  V("run", 4, "The bus runs", "", "otobüs …çalışıyor", "çalışmak, sefer yapmak", "The bus goes on", [
    ["every hour", "saatte bir", "Otobüs saatte bir çalışıyor."],
    ["until midnight", "gece yarısına kadar", "Otobüs gece yarısına kadar çalışıyor."],
    ["on Sundays too", "pazarları da", "Otobüs pazarları da çalışıyor."],
  ]),
  V("run", 5, "I ran into", "", "…rastladım", "rastlamak (run into)", "I ran to", [
    ["an old friend", "eski bir arkadaşa", "Eski bir arkadaşa rastladım."],
    ["your brother", "kardeşine", "Kardeşine rastladım."],
    ["a problem", "bir soruna", "Bir soruna rastladım."],
  ]),
];
export const VERBS = [...new Set(VERB_CHUNKS.map((c) => c.topic))];

// ---------- Günlük durumlar: 8 yer × 5 kalıp; Konuş'ta yapay zeka o yerdeki rolü oynar (SIT_ROLES) ----------
const S = (sit, n, head, tail, tr, rule, near, fills) => C("durum", `s-${sit}-${n}`, SIT_NAMES[sit], head, tail, tr, rule, near, fills);
const SIT_NAMES = { kafe: "Kafede", doktor: "Doktorda", otel: "Otelde", yol: "Yol sormak", telefon: "Telefonda", alisveris: "Alışverişte", havaalani: "Havaalanında", toplanti: "İş toplantısı" };
export const SITUATIONS = Object.values(SIT_NAMES);
// Kısa açıklama (bölüm sayfasında) ve Konuş'ta yapay zekanın rolü
export const SIT_INFO = {
  Kafede: { sub: "Sipariş, hesap", role: "Bir kafede garsonsun; kişi müşteri. Siparişini al, sorularına cevap ver." },
  Doktorda: { sub: "Şikâyet anlatmak", role: "Doktorsun; kişi hasta. Şikâyetini sor, kısa sorular sor, öneri ver." },
  Otelde: { sub: "Giriş, istek", role: "Bir otelin resepsiyonistisin; kişi misafir. Girişini yap, isteklerine yardım et." },
  "Yol sormak": { sub: "Nerede, ne kadar", role: "Sokakta yol soran birine yardım eden yerlisin." },
  Telefonda: { sub: "Aramak, mesaj", role: "Bir şirketin telefonuna bakan çalışansın; kişi arayan." },
  Alışverişte: { sub: "Beden, fiyat, iade", role: "Bir giyim mağazasında satış görevlisisin; kişi müşteri." },
  Havaalanında: { sub: "Bagaj, kapı, rötar", role: "Havaalanında havayolu görevlisisin; kişi yolcu." },
  "İş toplantısı": { sub: "Fikir söylemek", role: "Bir iş toplantısında iş arkadaşısın; birlikte bir planı konuşuyorsunuz." },
};
export const SIT_CHUNKS = [
  S("kafe", 1, "Can I have", "please?", "…alabilir miyim?", "sipariş vermek", "Can I give", [
    ["a latte", "bir latte", "Bir latte alabilir miyim?"],
    ["the menu", "menüyü", "Menüyü alabilir miyim?"],
    ["some water", "biraz su", "Biraz su alabilir miyim?"],
  ]),
  S("kafe", 2, "I'd like", "", "…istiyorum", "istemek (kibar)", "I like", [
    ["a table for two", "iki kişilik bir masa", "İki kişilik bir masa istiyorum."],
    ["something sweet", "tatlı bir şey", "Tatlı bir şey istiyorum."],
    ["it to go", "paket", "Paket istiyorum."],
  ]),
  S("kafe", 3, "Could we get the", "?", "…alabilir miyiz?", "hesap, şifre istemek", "Could we give the", [
    ["bill", "hesabı", "Hesabı alabilir miyiz?"],
    ["Wi-Fi password", "Wi-Fi şifresini", "Wi-Fi şifresini alabilir miyiz?"],
    ["table by the window", "pencere kenarındaki masayı", "Pencere kenarındaki masayı alabilir miyiz?"],
  ]),
  S("kafe", 4, "Is there any", "?", "…var mı?", "var mı diye sormak", "Are there any", [
    ["sugar", "şeker", "Şeker var mı?"],
    ["lactose-free milk", "laktozsuz süt", "Laktozsuz süt var mı?"],
    ["space outside", "dışarıda yer", "Dışarıda yer var mı?"],
  ]),
  S("kafe", 5, "Can I pay by", "?", "…ödeyebilir miyim?", "ödemek", "Can I pay on", [
    ["card", "kartla", "Kartla ödeyebilir miyim?"],
    ["phone", "telefonla", "Telefonla ödeyebilir miyim?"],
    ["bank transfer", "havaleyle", "Havaleyle ödeyebilir miyim?"],
  ]),

  S("doktor", 1, "I have a", "", "…var / ağrıyor", "şikâyet söylemek", "I am a", [
    ["headache", "başım ağrıyor", "Başım ağrıyor."],
    ["sore throat", "boğazım ağrıyor", "Boğazım ağrıyor."],
    ["fever", "ateşim", "Ateşim var."],
  ]),
  S("doktor", 2, "My", "hurts.", "…ağrıyor", "ağrıyan yeri söylemek", "Me", [
    ["back", "sırtım", "Sırtım ağrıyor."],
    ["knee", "dizim", "Dizim ağrıyor."],
    ["shoulder", "omzum", "Omzum ağrıyor."],
  ]),
  S("doktor", 3, "It started", "", "…başladı", "ne zaman başladı", "It starts", [
    ["two days ago", "iki gün önce", "İki gün önce başladı."],
    ["last night", "dün gece", "Dün gece başladı."],
    ["after the race", "yarıştan sonra", "Yarıştan sonra başladı."],
  ]),
  S("doktor", 4, "I'm allergic to", "", "…alerjim var", "alerji söylemek", "I'm allergy to", [
    ["penicillin", "penisiline", "Penisiline alerjim var."],
    ["nuts", "kuruyemişe", "Kuruyemişe alerjim var."],
    ["bee stings", "arı sokmasına", "Arı sokmasına alerjim var."],
  ]),
  S("doktor", 5, "How often should I", "?", "…ne sıklıkla …?", "nasıl kullanılır diye sormak", "How often I should", [
    ["take this", "bunu", "Bunu ne sıklıkla almalıyım?"],
    ["come back", "tekrar", "Ne sıklıkla tekrar gelmeliyim?"],
    ["change the bandage", "bandajı", "Bandajı ne sıklıkla değiştirmeliyim?"],
  ]),

  S("otel", 1, "I have a reservation under", "", "…adına rezervasyonum var", "giriş yapmak", "I have a reservation on", [
    ["Yildiz", "Yıldız", "Yıldız adına rezervasyonum var."],
    ["my name", "benim", "Benim adıma rezervasyonum var."],
    ["the club's name", "kulübün", "Kulübün adına rezervasyonum var."],
  ]),
  S("otel", 2, "Could I have a room with", "?", "…bir oda alabilir miyim?", "oda istemek", "Could I have a room within", [
    ["a sea view", "deniz manzaralı", "Deniz manzaralı bir oda alabilir miyim?"],
    ["two beds", "iki yataklı", "İki yataklı bir oda alabilir miyim?"],
    ["a balcony", "balkonlu", "Balkonlu bir oda alabilir miyim?"],
  ]),
  S("otel", 3, "What time is", "?", "…saat kaçta?", "saat sormak", "What time it is", [
    ["breakfast", "kahvaltı", "Kahvaltı saat kaçta?"],
    ["check-out", "çıkış", "Çıkış saat kaçta?"],
    ["dinner", "akşam yemeği", "Akşam yemeği saat kaçta?"],
  ]),
  S("otel", 4, "The", "isn't working.", "…çalışmıyor", "arıza bildirmek", "A", [
    ["air conditioning", "klima", "Klima çalışmıyor."],
    ["shower", "duş", "Duş çalışmıyor."],
    ["TV", "televizyon", "Televizyon çalışmıyor."],
  ]),
  S("otel", 5, "Could you call me a", "?", "bana bir …çağırır mısınız?", "yardım istemek", "Could you call me an", [
    ["taxi", "taksi", "Bana bir taksi çağırır mısınız?"],
    ["doctor", "doktor", "Bana bir doktor çağırır mısınız?"],
    ["porter", "görevli", "Bana bir görevli çağırır mısınız?"],
  ]),

  S("yol", 1, "Excuse me, where is", "?", "affedersiniz, …nerede?", "yer sormak", "Excuse me, where are", [
    ["the station", "istasyon", "Affedersiniz, istasyon nerede?"],
    ["the nearest ATM", "en yakın ATM", "Affedersiniz, en yakın ATM nerede?"],
    ["the harbour", "liman", "Affedersiniz, liman nerede?"],
  ]),
  S("yol", 2, "How far is it to", "?", "…ne kadar uzak?", "uzaklık sormak", "How far it is to", [
    ["the beach", "plaj", "Plaj ne kadar uzak?"],
    ["the city centre", "şehir merkezi", "Şehir merkezi ne kadar uzak?"],
    ["the hospital", "hastane", "Hastane ne kadar uzak?"],
  ]),
  S("yol", 3, "Is it", "?", "…mı?", "emin olmak", "It is", [
    ["within walking distance", "yürüme mesafesinde", "Yürüme mesafesinde mi?"],
    ["far from here", "buraya uzak", "Buraya uzak mı?"],
    ["on this street", "bu sokakta", "Bu sokakta mı?"],
  ]),
  S("yol", 4, "Go straight and turn", "", "düz git ve …dön", "yol tarif etmek", "Go straight and take", [
    ["left", "sola", "Düz git ve sola dön."],
    ["right at the lights", "ışıklardan sağa", "Düz git ve ışıklardan sağa dön."],
    ["left after the bank", "bankadan sonra sola", "Düz git ve bankadan sonra sola dön."],
  ]),
  S("yol", 5, "Which bus goes to", "?", "hangi otobüs …gidiyor?", "ulaşım sormak", "Which bus go to", [
    ["the airport", "havalimanına", "Hangi otobüs havalimanına gidiyor?"],
    ["the old town", "eski şehre", "Hangi otobüs eski şehre gidiyor?"],
    ["Bergama", "Bergama'ya", "Hangi otobüs Bergama'ya gidiyor?"],
  ]),

  S("telefon", 1, "Hi, this is", "", "merhaba, ben …", "kendini tanıtmak", "Hi, I am this", [
    ["Ali", "Ali", "Merhaba, ben Ali."],
    ["Ali from the sailing club", "yelken kulübünden Ali", "Merhaba, ben yelken kulübünden Ali."],
    ["Ayşe's father", "Ayşe'nin babası", "Merhaba, ben Ayşe'nin babası."],
  ]),
  S("telefon", 2, "Could I speak to", "?", "…görüşebilir miyim?", "birini istemek", "Could I speak at", [
    ["the manager", "müdürle", "Müdürle görüşebilir miyim?"],
    ["Mr. Brown", "Bay Brown'la", "Bay Brown'la görüşebilir miyim?"],
    ["someone in sales", "satıştan biriyle", "Satıştan biriyle görüşebilir miyim?"],
  ]),
  S("telefon", 3, "Sorry, could you", "?", "kusura bakmayın, …?", "anlamadığını söylemek", "Sorry, can you to", [
    ["say that again", "tekrar söyler misiniz", "Kusura bakmayın, tekrar söyler misiniz?"],
    ["speak more slowly", "daha yavaş konuşur musunuz", "Kusura bakmayın, daha yavaş konuşur musunuz?"],
    ["spell that", "harf harf söyler misiniz", "Kusura bakmayın, harf harf söyler misiniz?"],
  ]),
  S("telefon", 4, "I'm calling about", "", "…için arıyorum", "neden aradığını söylemek", "I'm calling to", [
    ["the booking", "rezervasyon", "Rezervasyon için arıyorum."],
    ["your advert", "ilanınız", "İlanınız için arıyorum."],
    ["tomorrow's race", "yarınki yarış", "Yarınki yarış için arıyorum."],
  ]),
  S("telefon", 5, "Can I call you back", "?", "…geri arayabilir miyim?", "sonra aramak", "Can I call back you", [
    ["later", "sonra", "Sizi sonra geri arayabilir miyim?"],
    ["in ten minutes", "on dakika içinde", "Sizi on dakika içinde geri arayabilir miyim?"],
    ["tomorrow", "yarın", "Sizi yarın geri arayabilir miyim?"],
  ]),

  S("alisveris", 1, "Do you have this in", "?", "bunun …var mı?", "beden, renk sormak", "Do you have this on", [
    ["a smaller size", "daha küçük bedeni", "Bunun daha küçük bedeni var mı?"],
    ["blue", "mavisi", "Bunun mavisi var mı?"],
    ["medium", "orta bedeni", "Bunun orta bedeni var mı?"],
  ]),
  S("alisveris", 2, "How much is", "?", "…ne kadar?", "fiyat sormak", "How many is", [
    ["this jacket", "bu ceket", "Bu ceket ne kadar?"],
    ["it altogether", "hepsi", "Hepsi ne kadar?"],
    ["the delivery", "teslimat", "Teslimat ne kadar?"],
  ]),
  S("alisveris", 3, "Can I try", "on?", "…deneyebilir miyim?", "denemek (try on)", "Can I test", [
    ["this", "bunu", "Bunu deneyebilir miyim?"],
    ["these shoes", "bu ayakkabıları", "Bu ayakkabıları deneyebilir miyim?"],
    ["a bigger size", "bir büyük bedeni", "Bir büyük bedeni deneyebilir miyim?"],
  ]),
  S("alisveris", 4, "I'd like to return", "", "…iade etmek istiyorum", "iade etmek", "I'd like to turn back", [
    ["this", "bunu", "Bunu iade etmek istiyorum."],
    ["these trousers", "bu pantolonu", "Bu pantolonu iade etmek istiyorum."],
    ["the gift", "hediyeyi", "Hediyeyi iade etmek istiyorum."],
  ]),
  S("alisveris", 5, "I'm just", "", "sadece …", "sadece bakmak", "I just", [
    ["looking", "bakıyorum", "Sadece bakıyorum."],
    ["browsing, thanks", "göz atıyorum, teşekkürler", "Sadece göz atıyorum, teşekkürler."],
    ["waiting for a friend", "bir arkadaşımı bekliyorum", "Sadece bir arkadaşımı bekliyorum."],
  ]),

  S("havaalani", 1, "Where do I", "?", "…nerede / nereden?", "nereye gideceğini sormak", "Where I do", [
    ["check in", "check-in", "Check-in'i nerede yapıyorum?"],
    ["pick up my bag", "bavulumu", "Bavulumu nereden alıyorum?"],
    ["get a taxi", "taksi", "Taksiyi nereden buluyorum?"],
  ]),
  S("havaalani", 2, "Is the flight to", "?", "…uçuşu …mı?", "uçuşu sormak", "Is the flight for", [
    ["London delayed", "Londra uçuşu", "Londra uçuşu rötarlı mı?"],
    ["Izmir on time", "İzmir uçuşu", "İzmir uçuşu zamanında mı?"],
    ["Rome cancelled", "Roma uçuşu", "Roma uçuşu iptal mi?"],
  ]),
  S("havaalani", 3, "I'd like", "seat.", "…koltuk istiyorum", "koltuk seçmek", "I like", [
    ["a window", "cam kenarı", "Cam kenarı koltuk istiyorum."],
    ["an aisle", "koridor", "Koridor koltuk istiyorum."],
    ["an exit row", "acil çıkış sırasında", "Acil çıkış sırasında koltuk istiyorum."],
  ]),
  S("havaalani", 4, "My bag", "", "çantam …", "bagaj sorunu", "My bags", [
    ["is missing", "kayıp", "Çantam kayıp."],
    ["didn't arrive", "gelmedi", "Çantam gelmedi."],
    ["is damaged", "hasar görmüş", "Çantam hasar görmüş."],
  ]),
  S("havaalani", 5, "Do I need to", "?", "…gerekiyor mu?", "kural sormak", "Do I need", [
    ["take my laptop out", "bilgisayarımı çıkarmam", "Bilgisayarımı çıkarmam gerekiyor mu?"],
    ["pay for this bag", "bu çanta için ödemem", "Bu çanta için ödemem gerekiyor mu?"],
    ["show my passport", "pasaportumu göstermem", "Pasaportumu göstermem gerekiyor mu?"],
  ]),

  S("toplanti", 1, "I think we should", "", "bence …", "öneri yapmak", "I think we should to", [
    ["start earlier", "daha erken başlamalıyız", "Bence daha erken başlamalıyız."],
    ["try again", "tekrar denemeliyiz", "Bence tekrar denemeliyiz."],
    ["ask the team", "ekibe sormalıyız", "Bence ekibe sormalıyız."],
  ]),
  S("toplanti", 2, "Could you explain", "?", "…açıklar mısınız?", "açıklama istemek", "Could you explain me", [
    ["that again", "bunu tekrar", "Bunu tekrar açıklar mısınız?"],
    ["the numbers", "rakamları", "Rakamları açıklar mısınız?"],
    ["the next step", "sonraki adımı", "Sonraki adımı açıklar mısınız?"],
  ]),
  S("toplanti", 3, "I agree with", "", "…katılıyorum", "katılmak", "I am agree with", [
    ["you", "size", "Size katılıyorum."],
    ["Ali", "Ali'ye", "Ali'ye katılıyorum."],
    ["most of it", "çoğuna", "Çoğuna katılıyorum."],
  ]),
  S("toplanti", 4, "Let's move on to", "", "…geçelim", "konu değiştirmek", "Let's move to on", [
    ["the next topic", "sonraki konuya", "Sonraki konuya geçelim."],
    ["the budget", "bütçeye", "Bütçeye geçelim."],
    ["questions", "sorulara", "Sorulara geçelim."],
  ]),
  S("toplanti", 5, "Can we", "?", "…miyiz?", "karar istemek", "Can we to", [
    ["set a deadline", "son tarih belirleyebilir", "Son tarih belirleyebilir miyiz?"],
    ["meet again next week", "haftaya tekrar buluşabilir", "Haftaya tekrar buluşabilir miyiz?"],
    ["finish by five", "beşe kadar bitirebilir", "Beşe kadar bitirebilir miyiz?"],
  ]),
];

// ---------- Bölümler: açılışta bu sırayla görünür ----------
// unit: ilerlemede birimin adı; topicName: bölüm sayfasındaki grupların adı
export const PATHS = [
  { id: "kalip", name: "Kalıplar", big: "I'm used to…", desc: "Cümle iskeleti, içine kelime koy.", unit: "kalıp", topics: CHUNK_TOPICS, chunks: CHUNKS.map((c) => ({ ...c, path: "kalip" })), color: "#3ddc84" },
  { id: "fiil", name: "Önemli fiiller", big: "get · make · take", desc: "12 fiilin günlük hayatta en çok kullanılan anlamları.", unit: "anlam", topics: VERBS, chunks: VERB_CHUNKS, color: "#67e8f9" },
  { id: "durum", name: "Günlük durumlar", big: "Kafede · Doktorda", desc: "Gerçek bir yerde ne söyleyeceğin; sonunda o yerde konuşma.", unit: "kalıp", topics: SITUATIONS, chunks: SIT_CHUNKS, color: "#ff8ab8" },
];
export const ALL_CHUNKS = PATHS.flatMap((p) => p.chunks);
export const pathById = (id) => PATHS.find((p) => p.id === id) || PATHS[0];
// Konuş'ta yapay zekanın rolü (yalnız Günlük durumlar)
export const roleOf = (c) => (c?.path === "durum" ? SIT_INFO[c.topic]?.role || "" : "");
