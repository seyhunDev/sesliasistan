// Asistanın yapabildiği işler (tek liste). Her işin adı, örnek cümlesi, onay isteyip istemediği, kim yapabildiği,
// başlarken söylenen kısa cümle (doing: "Tamam, …") ve beklerken ekranda dönen yazı (work: "… hazırlanıyor").
// Ön cevap (precue.js) ve asistanın ara adımları bu listeden okur; yapay zekanın istemindeki "Uygulamanın yapabildikleri"
// bölümü ve "ne yapabilirsin" cevabı da buradan yazılır. Yeni bir iş eklenince buraya da eklenir.
// Belgesi: /mnt/project-files/asistan/gorev-listesi.md (scripts/gorev-listesi.mjs ile bu listeden üretilir).

// who: herkes | ana (yalnız ana hesap) | sporcu (sporcu yetkisi olan) | yönetici (sporcu/veli/öğrenci dışı)
// by: yerel (yapay zekaya gitmeden) | yz (yapay zeka) | yz-ayrı (kendi yapay zeka isteğiyle çalışan ayrı akış)
export const TASKS = [
  // Kayıtlar (plan, görev, not)
  { id: "plan", group: "Kayıtlar", name: "Plan / takvime ekleme", say: "yarın 10'da antrenman ekle", who: "herkes", by: "yz", doing: "Tamam, planı hazırlıyorum.", work: "Plan hazırlanıyor" },
  { id: "repeat", group: "Kayıtlar", name: "Tekrarlayan plan", say: "her salı 16:00 antrenman", who: "herkes", by: "yz", doing: "Tamam, tekrarlayan planı hazırlıyorum.", work: "Tekrarlayan plan hazırlanıyor" },
  { id: "task", group: "Kayıtlar", name: "Görev ekleme (birine atama)", say: "Ali'ye motoru kontrol etmesini hatırlat", who: "herkes", by: "yz", doing: "Tamam, görevi hazırlıyorum.", work: "Görev hazırlanıyor" },
  { id: "note", group: "Kayıtlar", name: "Not alma (yalnız istenince)", say: "not al: malzeme odası dolu", who: "herkes", by: "yz", doing: "Tamam, notu alıyorum.", work: "Not alınıyor" },
  { id: "record", group: "Kayıtlar", name: "Türü belli olmayan kayıt", say: "cumartesi tekne yıkama", who: "herkes", by: "yz", doing: "Tamam, kaydı hazırlıyorum.", work: "Kayıt hazırlanıyor" },
  { id: "complete", group: "Kayıtlar", name: "Görevi tamamlama", say: "motor yağı görevini tamamla", who: "herkes", by: "yz", doing: "Tamam, görevi tamamlıyorum.", work: "Görev tamamlanıyor" },
  { id: "reopen", group: "Kayıtlar", name: "Görevi yeniden açma", say: "motor yağı görevini yeniden aç", who: "herkes", by: "yz", doing: "Tamam, görevi yeniden açıyorum.", work: "Görev yeniden açılıyor" },
  { id: "noteDone", group: "Kayıtlar", name: "Notu yapıldı yapma (Arşiv'e gider, silinmez) ya da geri alma", say: "malzeme odası notu yapıldı", who: "herkes", by: "yz", doing: "Tamam, notu yapıldı olarak arşive kaldırıyorum.", work: "Not arşive kaldırılıyor" },
  { id: "planDone", group: "Kayıtlar", name: "Planı bitirme (Arşiv'e)", say: "antrenman planını bitir", who: "herkes", by: "yz", doing: "Tamam, planı bitti olarak arşive kaldırıyorum.", work: "Plan arşive kaldırılıyor" },
  { id: "update", group: "Kayıtlar", name: "Değiştirme / erteleme", say: "antrenmanı 11'e al", who: "herkes", by: "yz", doing: "Tamam, kaydı değiştiriyorum.", work: "Kayıt değiştiriliyor" },
  { id: "delete", group: "Kayıtlar", name: "Silme", say: "yarınki toplantıyı sil", who: "herkes", by: "yz", confirm: true, doing: "Tamam, silinecek kaydı buluyorum.", work: "Silinecek kayıt aranıyor" },
  { id: "cancel", group: "Kayıtlar", name: "Plan iptali ve haber verme", say: "yarınki antrenmanı iptal et", who: "herkes", by: "yz", confirm: true, doing: "Tamam, iptali hazırlıyorum.", work: "İptal hazırlanıyor" },
  { id: "undo", group: "Kayıtlar", name: "Son kaydı geri alma", say: "son kaydı geri al", who: "herkes", by: "yerel", confirm: true },
  { id: "bdayDelete", group: "Kayıtlar", name: "Doğum günü silme (onayla)", say: "Ayşe'nin doğum gününü sil", who: "herkes", by: "yerel", confirm: true },
  { id: "birthday", group: "Kayıtlar", name: "Doğum günü ekleme", say: "annemin doğum günü 12 Mart", who: "herkes", by: "yerel" },
  { id: "multi", group: "Kayıtlar", name: "Tek cümlede sıralı işler", say: "Gökhan'a yarın bakım var diye yaz, takvime ekle ve not al", who: "herkes", by: "yz", doing: "Tamam, sırayla yapıyorum.", work: "İşler sırayla yapılıyor" },

  // Mesaj
  { id: "send", group: "Mesaj", name: "Uygulama içi mesaj (kişi ya da grup)", say: "Ali'ye yaz, yarın 9'da iskelede olsun", who: "herkes", by: "yz", confirm: true, doing: "Tamam, mesajı hazırlıyorum.", work: "Mesaj hazırlanıyor" },
  { id: "group", group: "Mesaj", name: "Gruba mesaj (Ekip, Sporcular, kurulan gruplar)", say: "sporculara söyle antrenman iptal", who: "herkes", by: "yz", confirm: true, doing: "Tamam, grup mesajını hazırlıyorum.", work: "Grup mesajı hazırlanıyor" },
  { id: "whatsapp", group: "Mesaj", name: "WhatsApp mesajı", say: "Ali'ye WhatsApp'tan yaz, yarın gelsin", who: "herkes", by: "yz", confirm: true, doing: "Tamam, WhatsApp mesajını hazırlıyorum.", work: "WhatsApp mesajı hazırlanıyor" },

  // Sorular
  { id: "query", group: "Sorular", name: "Plan, görev, not, fiş soruları ve özet", say: "bu hafta neler var", who: "herkes", by: "yz", doing: "Bakıyorum.", work: "Bakıyorum" },
  { id: "weather", group: "Sorular", name: "Hava ve rüzgâr", say: "yarın rüzgâr kaç knot", who: "herkes", by: "yz", doing: "Bakıyorum.", work: "Hava durumuna bakılıyor" },
  { id: "version", group: "Sorular", name: "Son güncelleme (yayın tarihi ve son değişiklik)", say: "son güncelleme ne", who: "herkes", by: "yerel" },
  { id: "appUpdate", group: "Sorular", name: "Uygulamayı yeni sürüme güncelleme", say: "uygulamayı güncelle", who: "herkes", by: "yerel" },
  { id: "payee", group: "Sorular", name: "Gelen ödemeler sorusu", say: "bu ay ne kadar ödeme aldım", who: "ana", by: "yerel" },

  // Arama
  { id: "groupCreate", group: "Mesaj", name: "Mesaj grubu kurma", say: "Ali ve Ayşe ile Yelken Ekibi adında grup kur", who: "herkes", by: "yerel" },
  { id: "call", group: "Mesaj", name: "Uygulama içi sesli arama; yarışta otelin telefonunu arama (onayla)", say: "Ali'yi ara; oteli ara", who: "herkes", by: "yerel", confirm: true },

  // Sayfalar
  { id: "navigate", group: "Sayfalar", name: "Sayfa ya da sohbet açma, geri dönme", say: "yoklamayı aç, ekip grubunu aç, geri dön", who: "herkes", by: "yerel" },
  { id: "receiptCam", group: "Sayfalar", name: "Fiş yükleme (kamera)", say: "fiş yükle", who: "herkes", by: "yerel" },
  { id: "meeting", group: "Sayfalar", name: "Toplantı modu", say: "toplantı modunu aç", who: "yönetici", by: "yerel" },
  { id: "close", group: "Sayfalar", name: "Asistanı kapatma (sessiz)", say: "tamam kapat, teşekkürler", who: "herkes", by: "yerel" },

  // Fitness (yalnız ana hesap)
  { id: "fitProgram", group: "Fitness", name: "Fitness programı hazırlama ya da değiştirme (önizlemede açılır)", say: "pazartesi çarşamba cuma sabah 7'de 4 haftalık fitness programı hazırla; çarşambayı bacak günü yap", who: "ana", by: "yz-ayrı", doing: "Tamam, programı hazırlıyorum.", work: "Fitness isteğin hazırlanıyor" },
  { id: "fitLog", group: "Fitness", name: "Yapılan fitness antrenmanını yazma (set, tekrar, kilo, koşu)", say: "squat 3 set 10 tekrar 60 kilo yaptım; bugün 30 dakika koştum", who: "ana", by: "yz-ayrı", doing: "Tamam, antrenmanı yazıyorum.", work: "Antrenman yazılıyor" },
  { id: "fitPlans", group: "Fitness", name: "Fitness programını planlara ekleme ya da takvimden kaldırma", say: "fitness programını planlara ekle", who: "ana", by: "yerel" },
  { id: "foodLog", group: "Fitness", name: "Beslenme: yemek, su, kilo yazma; bugün kaç kalori", say: "öğlen tavuk pilav ve ayran içtim; 2 bardak su içtim; kilom 82", who: "ana", by: "yz-ayrı", doing: "Tamam, yazıyorum.", work: "Yemekler okunuyor" },
  { id: "fitDone", group: "Fitness", name: "Bugünkü fitness antrenmanı yapıldı / atlandı; bu hafta kaç antrenman", say: "bugünkü fitness antrenmanını yaptım; bu hafta kaç fitness antrenmanı yaptım", who: "ana", by: "yerel" },

  // Kulüp
  { id: "attendance", group: "Kulüp", name: "Yoklama", say: "Ali ve Zeynep geldi, Emre izinli", who: "sporcu", by: "yz-ayrı", doing: "Tamam, yoklamayı alıyorum.", work: "Yoklama alınıyor" },
  { id: "log", group: "Kulüp", name: "Antrenman günlüğü", say: "dün 14 knot poyrazda start çalıştık, 2 saat sürdü", who: "yönetici", by: "yz-ayrı", doing: "Tamam, antrenman günlüğünü yazıyorum.", work: "Antrenman günlüğü yazılıyor" },
  { id: "raceOpen", group: "Kulüp", name: "Yarışı açma", say: "Foça yarışını aç", who: "sporcu", by: "yerel", work: "Yarış aranıyor" },
  { id: "race", group: "Kulüp", name: "Yarış ekleme, yarışa sporcu / not / bütçe", say: "Çeşme'de 7-11 Ekim yarış ekle, Ali ve Ayşe katılacak", who: "sporcu", by: "yz-ayrı", doing: "Tamam, yarışı hazırlıyorum.", work: "Yarış hazırlanıyor" },
  { id: "inventory", group: "Kulüp", name: "Envanter (ekle, çıkar, değiştir, sil, sor)", say: "envantere 3 Optimist teknesi ekle", who: "ana", by: "yz-ayrı", doing: "Tamam, envantere ekliyorum.", work: "Envantere ekleniyor" },
  { id: "invoice", group: "Kulüp", name: "Fatura ödendi işaretleme", say: "Turkcell faturası ödendi", who: "ana", by: "yerel" },
  { id: "athlete", group: "Kulüp", name: "Sporcu ekleme, arşive alma, silme (silme onayla)", say: "yeni sporcu ekle: Ali Kaya, 2014 doğumlu; Ali Kaya'yı arşive al", who: "ana", by: "yerel", confirm: true },
  { id: "athleteOpen", group: "Kulüp", name: "Sporcu kartını açma", say: "Ali Kaya'nın sporcu kartını aç", who: "sporcu", by: "yerel" },
  { id: "raceHere", group: "Kulüp", name: "Açık yarışta: sporcu çıkarma, sonuç, ücret ödendi, planlara ekleme, yarışı silme (onayla)", say: "Ali 3. oldu; Ali'yi yarıştan çıkar; yarışı sil", who: "sporcu", by: "yerel", confirm: true },
  { id: "hotel", group: "Kulüp", name: "Açık yarışa otel ekleme", say: "otel ekle: Foça Palas, 0232 812 34 56", who: "sporcu", by: "yerel" },
  { id: "absent", group: "Kulüp", name: "Gelmeyenlerin velilerine haber (onayla)", say: "gelmeyenlerin velilerine haber ver", who: "ana", by: "yerel", confirm: true },
  { id: "invoiceTask", group: "Kulüp", name: "Faturayı görevliye verme, fatura silme (onayla)", say: "Turkcell faturasını Ali'ye ver; Turkcell faturasını sil", who: "ana", by: "yerel", confirm: true },
  { id: "receiptPay", group: "Kulüp", name: "Çalışanın fişini ödendi yapma", say: "F-0012 fişini ödendi yap; Ali'nin fişlerini ödedim", who: "ana", by: "yerel" },
  { id: "income", group: "Kulüp", name: "Hesaplar'a nakit gelir (aidat, bağış, eğitim)", say: "Ali Kaya'nın ekim aidatı nakit 1500 alındı", who: "ana", by: "yerel" },
  { id: "dues", group: "Kulüp", name: "Aidat: kim ödemedi, velilere hatırlatma (onayla)", say: "bu ay kim aidat ödemedi; aidat hatırlatması gönder", who: "ana", by: "yerel", confirm: true },

  // Diğer
  { id: "post", group: "Diğer", name: "Instagram gönderisi hazırlama, değiştirme, arşive kaldırma", say: "Foça yarışı için Instagram gönderisi hazırla", who: "ana", by: "yz-ayrı", doing: "Tamam, gönderiyi hazırlıyorum.", work: "Gönderi hazırlanıyor" },
  { id: "event", group: "Diğer", name: "Etkinlik planı (kamp, gezi…)", say: "kamp planı yapmak istiyorum", who: "ana", by: "yz-ayrı", doing: "Tamam, etkinlik planını hazırlıyorum.", work: "Etkinlik planı hazırlanıyor" },
  { id: "schedule", group: "Diğer", name: "Ders programı", say: "salı 13:00 fizik B-204", who: "herkes", by: "yz-ayrı", doing: "Tamam, ders programını hazırlıyorum.", work: "Ders programı hazırlanıyor" },
  { id: "personDelete", group: "Diğer", name: "Kişi silme (hesabı olmayan; onayla)", say: "Ayşe Yılmaz'ı kişilerden sil", who: "ana", by: "yerel", confirm: true },
  { id: "shopClear", group: "Diğer", name: "Alışveriş listesinden alınanları temizleme", say: "alınanları temizle", who: "herkes", by: "yerel" },
  { id: "person", group: "Diğer", name: "Kişi ekleme (ve hesap açma)", say: "Kişi ekle: Ayşe Yılmaz, eşim, 0532…", who: "ana", by: "yz-ayrı", confirm: true, doing: "Tamam, kişiyi hazırlıyorum.", work: "Kişi hazırlanıyor" },
  { id: "shopping", group: "Diğer", name: "Alışveriş listesi (ekle, alındı, sil, oku)", say: "listeye süt ekle, ekmek alındı", who: "herkes", by: "yerel" },
];

const BY_ID = Object.fromEntries(TASKS.map((x) => [x.id, x]));
export const taskOf = (id) => BY_ID[id] || null;
// Ön cevap ve bekleme yazısı: { line, work }
export const cueOf = (id) => ({ line: BY_ID[id]?.doing || "Tamam, hazırlıyorum.", work: BY_ID[id]?.work || "Hazırlanıyor" });

// Envanterde ne yapılıyor: "Envantere ekleniyor", "Envanterden çıkarılıyor", "Envanterde değiştiriliyor", "Envantere bakılıyor"
export function inventoryWork(raw) {
  const t = String(raw || "").toLocaleLowerCase("tr-TR");
  if (/\?|(^| )(kaç|kimde|nerede|hangi|var mı|ne zaman)( |$)/u.test(t)) return "Envantere bakılıyor";
  if (/(^| )sil\p{L}*/u.test(t)) return "Envanterden silinecek ürün aranıyor";
  if (/(çıkar\p{L}*|azalt\p{L}*|kayboldu|kayıp|eksil\p{L}*)/u.test(t)) return "Envanterden çıkarılıyor";
  if (/(ekle\p{L}*|kaydet\p{L}*|geldi|aldık|satın)/u.test(t)) return "Envantere ekleniyor";
  return "Envanter güncelleniyor";
}

// Yapay zekaya: uygulamanın yapabildikleri (kısa tutulur, istem uzadıkça yanıt yavaşlar). Yapay zekanın kendi işleri
// örnekle, uygulamanın kendi akışıyla yaptıkları yalnız adla.
export function tasksPrompt() {
  const mine = TASKS.filter((x) => x.by === "yz" && x.id !== "record");
  const app = TASKS.filter((x) => x.by !== "yz");
  return `- Senin işlerin: ${mine.map((x) => `${x.name} ("${x.say}")`).join("; ")}\n- Uygulamanın kendi yaptıkları (sana gelmez): ${app.map((x) => x.name).join("; ")}`;
}

// İsteğin kendisinden bekleme yazısı (Seyhun: "ses analiz ediliyor, anlaşılıyor gibi yazılar olmasın; bekleme yazıları
// istekle ilgili olsun", 2026-10-09): "29 Ekim Cumhuriyet yarışı oluştur" → "29 Ekim Cumhuriyet yarışı oluşturuluyor",
// "yarın 10'da antrenman ekle" → "Yarın 10'da antrenman ekleniyor". İlk iş cümleciği alınır, fiil edilgen olur; en çok 6 kelime.
const PASSIVE = [
  [/^ekle\p{L}*$/u, "ekleniyor"], [/^oluştur\p{L}*$/u, "oluşturuluyor"], [/^hazırla\p{L}*$/u, "hazırlanıyor"], [/^planla\p{L}*$/u, "planlanıyor"],
  [/^yaz(sana|ar mısın|abilir misin)?$/u, "yazılıyor"], [/^gönder\p{L}*$/u, "gönderiliyor"], [/^sil\p{L}*$/u, "siliniyor"], [/^kaydet\p{L}*$/u, "kaydediliyor"],
  [/^değiştir\p{L}*$/u, "değiştiriliyor"], [/^tamamla\p{L}*$/u, "tamamlanıyor"], [/^ertele\p{L}*$/u, "erteleniyor"], [/^hatırlat\p{L}*$/u, "hatırlatılıyor"],
  [/^işaretle\p{L}*$/u, "işaretleniyor"], [/^çıkar\p{L}*$/u, "çıkarılıyor"], [/^tasarla\p{L}*$/u, "tasarlanıyor"], [/^yap(alım|ar mısın)?$/u, "yapılıyor"],
];
// Belirtme eki düşer: "toplantıyı" → "toplantı", "görevini" → "görevi", "Enes'i" → "Enes"
const noAcc = (x) =>
  x
    .replace(/['’]y?[ıiuü]$/u, "")
    .replace(/([aeıioöuü])y[ıiuü]$/u, "$1")
    .replace(/([ıiuü])n[ıiuü]$/u, "$1");
const LEAD_W = /^(lütfen|şimdi|hemen|bir|ve|bana|şunu|bunu|sonra|ayrıca)\s+/iu;
export function aboutLine(text) {
  const parts = String(text || "").split(/[.;!?]+|,\s*|\s+ve\s+/u).map((x) => x.trim()).filter(Boolean);
  for (const p of parts) {
    const w = p.replace(LEAD_W, "").split(/\s+/);
    for (let i = w.length - 1; i > 0; i--) {
      const v = PASSIVE.find(([re]) => re.test(w[i].toLocaleLowerCase("tr-TR").replace(/[^\p{L}]/gu, "")));
      if (!v) continue;
      const ws = w.slice(Math.max(0, i - 6), i);
      // Mesaj: "Ayşe'ye söyle ders programını gönder" → "Ayşe'ye yazılıyor" (içerik değil, alıcı)
      const to = ws.findIndex((x) => /['’]y?[ae]$/u.test(x));
      if (/^(yazılıyor|gönderiliyor)$/.test(v[1]) && to >= 0) return `${ws[to].charAt(0).toLocaleUpperCase("tr-TR")}${ws[to].slice(1)} mesaj yazılıyor`;
      if (ws.length) ws[ws.length - 1] = noAcc(ws[ws.length - 1]);
      const obj = ws.join(" ").replace(/[“”"]/g, "");
      if (!obj) break;
      return `${obj.charAt(0).toLocaleUpperCase("tr-TR")}${obj.slice(1)} ${v[1]}`;
    }
  }
  return "";
}

// Beklerken sıralı durum yazıları (Seyhun: "cevap hızlıysa hemen göster; uzun sürüyorsa hazır yazıları sırayla göster,
// kullanıcı oyalansın; sade, hafif soluk, parlayan", 2026-10-09). İlk satır işin kendi yazısıdır (work); yanıt gecikirse
// her birkaç saniyede bir sonraki gelir, biten satır soluklaşır. Son satırda durur (döngü yok). Yanıt gelince hepsi silinir,
// cevap hemen gösterilir: hızlı yanıtta ek yazı hiç görünmez.
const MORE = {
  plan: ["Takvim kontrol ediliyor", "Gün ve saat yerleştiriliyor"],
  repeat: ["Haftalar hesaplanıyor", "Takvim kontrol ediliyor"],
  task: ["Kişiler kontrol ediliyor", "Son gün ayarlanıyor"],
  note: ["Not düzenleniyor"],
  record: ["Kaydın türü belirleniyor", "Ayrıntılar yerleştiriliyor"],
  complete: ["Görev aranıyor"],
  reopen: ["Görev aranıyor"],
  noteDone: ["Not aranıyor"],
  planDone: ["Plan aranıyor"],
  update: ["Kayıt aranıyor", "Değişiklik hazırlanıyor"],
  delete: ["Kayıtlar karşılaştırılıyor"],
  cancel: ["Plan aranıyor", "Haber metni hazırlanıyor"],
  multi: ["İşler sıraya konuyor", "Her iş ayrı hazırlanıyor"],
  send: ["Alıcı bulunuyor", "Mesaj yazılıyor"],
  group: ["Grup bulunuyor", "Mesaj yazılıyor"],
  whatsapp: ["Alıcı bulunuyor", "Mesaj yazılıyor"],
  query: ["Planlar, görevler ve notlar okunuyor", "Cevap hazırlanıyor"],
  weather: ["Tahmin okunuyor", "Rüzgâr hesaplanıyor", "Cevap hazırlanıyor"],
  attendance: ["Sporcular eşleştiriliyor", "Yoklama işaretleniyor"],
  log: ["Rüzgâr ve konular ayrılıyor", "Günlük düzenleniyor"],
  race: ["Tarih ve yer okunuyor", "Sporcular eşleştiriliyor"],
  inventory: ["Ürünler eşleştiriliyor", "Adetler hesaplanıyor"],
  post: ["Yazılar yazılıyor", "Görsel düzenleniyor"],
  event: ["İhtiyaçlar listeleniyor", "Bütçe hesaplanıyor", "İşler sıralanıyor"],
  schedule: ["Dersler ayrılıyor", "Program düzenleniyor"],
  person: ["Bilgiler ayrılıyor", "Kişiler kontrol ediliyor"],
};
const GENERIC = ["İstek inceleniyor", "Cevap hazırlanıyor"];
const TAIL = "Biraz uzun sürdü, bekliyorum"; // en sonda: yanıt hâlâ gelmediyse (25 sn'de vazgeçilir)
const BY_WORK = Object.fromEntries(TASKS.filter((x) => x.work).map((x) => [x.work, x.id]));

// İşin yazısından ("Plan hazırlanıyor") sıralı yazılar: ["Plan hazırlanıyor", "Takvim kontrol ediliyor", …]
// text: kullanıcının isteği (varsa ilk satır ondan: "Cumhuriyet yarışı oluşturuluyor"). Ses yazıya çevrilirken (istek henüz
// bilinmiyor) yazı yok: "ses analiz ediliyor" gibi teknik yazılar gösterilmez, küre rengi bekleniyor der.
export function waitStages(work, { transcribing = false, text = "" } = {}) {
  // Söylenen yazıya geçerken: teknik değil, kısa bilgi (sonra istekten gelen yazılar)
  if (transcribing) return ["Hazırlıyorum"];
  const about = aboutLine(text);
  const id = BY_WORK[work] || (/^Envanter/.test(work || "") ? "inventory" : /hava/i.test(work || "") ? "weather" : work === "Bakıyorum" ? "query" : "");
  const more = MORE[id] || GENERIC;
  if (about) return [about, ...more];
  return work ? [work, ...more] : GENERIC;
}

// Ne zaman hangi yazı: ilk yazı hemen (işin adı), sonrakiler gecikince (1,8 sn, 3,8 sn, 6,2 sn…); son yazıda durur,
// 10 sn'yi geçerse en sona "Biraz uzun sürdü, bekliyorum" gelir. { done: biten yazılar, now: şimdiki yazı }
export const STAGE_AT = [0, 1800, 3800, 6200];
export const TAIL_MS = 10000;
export function waitLines(work, ms, opts = {}) {
  const all = waitStages(work, opts);
  if (!all.length) return null;
  let i = 0;
  while (i + 1 < all.length && i + 1 < STAGE_AT.length && ms >= STAGE_AT[i + 1]) i++;
  if (ms >= TAIL_MS) return { done: all, now: TAIL };
  return { done: all.slice(0, i), now: all[i] };
}

// Biten yazı geçmiş zamanla: "Takvim kontrol ediliyor" → "Takvim kontrol edildi", "Alıcı bulunuyor" → "Alıcı bulundu"
// (edilgen fiil -ıl/-il/-un… ile biter, ek hep -dı/-di/-du/-dü)
export const pastTense = (s) => String(s || "").replace(/([ıiuü])yor$/u, (_, v) => `d${v}`);
