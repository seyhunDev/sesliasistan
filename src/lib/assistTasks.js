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
  { id: "update", group: "Kayıtlar", name: "Değiştirme / erteleme", say: "antrenmanı 11'e al", who: "herkes", by: "yz", doing: "Tamam, kaydı değiştiriyorum.", work: "Kayıt değiştiriliyor" },
  { id: "delete", group: "Kayıtlar", name: "Silme", say: "yarınki toplantıyı sil", who: "herkes", by: "yz", confirm: true, doing: "Tamam, silinecek kaydı buluyorum.", work: "Silinecek kayıt aranıyor" },
  { id: "cancel", group: "Kayıtlar", name: "Plan iptali ve haber verme", say: "yarınki antrenmanı iptal et", who: "herkes", by: "yz", confirm: true, doing: "Tamam, iptali hazırlıyorum.", work: "İptal hazırlanıyor" },
  { id: "undo", group: "Kayıtlar", name: "Son kaydı geri alma", say: "son kaydı geri al", who: "herkes", by: "yerel", confirm: true },
  { id: "birthday", group: "Kayıtlar", name: "Doğum günü ekleme", say: "annemin doğum günü 12 Mart", who: "herkes", by: "yerel" },
  { id: "multi", group: "Kayıtlar", name: "Tek cümlede sıralı işler", say: "Gökhan'a yarın bakım var diye yaz, takvime ekle ve not al", who: "herkes", by: "yz", doing: "Tamam, sırayla yapıyorum.", work: "İşler sırayla yapılıyor" },

  // Mesaj
  { id: "send", group: "Mesaj", name: "Uygulama içi mesaj (kişi ya da grup)", say: "Ali'ye yaz, yarın 9'da iskelede olsun", who: "herkes", by: "yz", confirm: true, doing: "Tamam, mesajı hazırlıyorum.", work: "Mesaj hazırlanıyor" },
  { id: "group", group: "Mesaj", name: "Gruba mesaj (Ekip, Sporcular, kurulan gruplar)", say: "sporculara söyle antrenman iptal", who: "herkes", by: "yz", confirm: true, doing: "Tamam, grup mesajını hazırlıyorum.", work: "Grup mesajı hazırlanıyor" },
  { id: "whatsapp", group: "Mesaj", name: "WhatsApp mesajı", say: "Ali'ye WhatsApp'tan yaz, yarın gelsin", who: "herkes", by: "yz", confirm: true, doing: "Tamam, WhatsApp mesajını hazırlıyorum.", work: "WhatsApp mesajı hazırlanıyor" },

  // Sorular
  { id: "query", group: "Sorular", name: "Plan, görev, not, fiş soruları ve özet", say: "bu hafta neler var", who: "herkes", by: "yz", doing: "Bakıyorum.", work: "Bakıyorum" },
  { id: "weather", group: "Sorular", name: "Hava ve rüzgâr", say: "yarın rüzgâr kaç knot", who: "herkes", by: "yz", doing: "Bakıyorum.", work: "Hava durumuna bakılıyor" },
  { id: "payee", group: "Sorular", name: "Gelen ödemeler sorusu", say: "bu ay ne kadar ödeme aldım", who: "ana", by: "yerel" },

  // Sayfalar
  { id: "navigate", group: "Sayfalar", name: "Sayfa ya da sohbet açma, geri dönme", say: "yoklamayı aç, ekip grubunu aç, geri dön", who: "herkes", by: "yerel" },
  { id: "receiptCam", group: "Sayfalar", name: "Fiş yükleme (kamera)", say: "fiş yükle", who: "herkes", by: "yerel" },
  { id: "meeting", group: "Sayfalar", name: "Toplantı modu", say: "toplantı modunu aç", who: "yönetici", by: "yerel" },
  { id: "close", group: "Sayfalar", name: "Asistanı kapatma (sessiz)", say: "tamam kapat, teşekkürler", who: "herkes", by: "yerel" },

  // Kulüp
  { id: "attendance", group: "Kulüp", name: "Yoklama", say: "Ali ve Zeynep geldi, Emre izinli", who: "sporcu", by: "yz-ayrı", doing: "Tamam, yoklamayı alıyorum.", work: "Yoklama alınıyor" },
  { id: "log", group: "Kulüp", name: "Antrenman günlüğü", say: "dün 14 knot poyrazda start çalıştık, 2 saat sürdü", who: "yönetici", by: "yz-ayrı", doing: "Tamam, antrenman günlüğünü yazıyorum.", work: "Antrenman günlüğü yazılıyor" },
  { id: "raceOpen", group: "Kulüp", name: "Yarışı açma", say: "Foça yarışını aç", who: "sporcu", by: "yerel", work: "Yarış aranıyor" },
  { id: "race", group: "Kulüp", name: "Yarış ekleme, yarışa sporcu / not / bütçe", say: "Çeşme'de 7-11 Ekim yarış ekle, Ali ve Ayşe katılacak", who: "sporcu", by: "yz-ayrı", doing: "Tamam, yarışı hazırlıyorum.", work: "Yarış hazırlanıyor" },
  { id: "inventory", group: "Kulüp", name: "Envanter (ekle, çıkar, değiştir, sil, sor)", say: "envantere 3 Optimist teknesi ekle", who: "ana", by: "yz-ayrı", doing: "Tamam, envantere ekliyorum.", work: "Envantere ekleniyor" },
  { id: "invoice", group: "Kulüp", name: "Fatura ödendi işaretleme", say: "Turkcell faturası ödendi", who: "ana", by: "yerel" },

  // Diğer
  { id: "post", group: "Diğer", name: "Instagram gönderisi hazırlama ve değiştirme", say: "Foça yarışı için Instagram gönderisi hazırla", who: "ana", by: "yz-ayrı", doing: "Tamam, gönderiyi hazırlıyorum.", work: "Gönderi hazırlanıyor" },
  { id: "event", group: "Diğer", name: "Etkinlik planı (kamp, gezi…)", say: "kamp planı yapmak istiyorum", who: "ana", by: "yz-ayrı", doing: "Tamam, etkinlik planını hazırlıyorum.", work: "Etkinlik planı hazırlanıyor" },
  { id: "schedule", group: "Diğer", name: "Ders programı", say: "salı 13:00 fizik B-204", who: "herkes", by: "yz-ayrı", doing: "Tamam, ders programını hazırlıyorum.", work: "Ders programı hazırlanıyor" },
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
  return `- Senin işlerin: ${mine.map((x) => `${x.name} ("${x.say}")`).join("; ")}\n- Uygulamanın kendi yaptıkları: ${app.map((x) => `${x.name} ("${x.say}")`).join("; ")}`;
}

// İş belli olmadan beklerken görünen yazı: ses sunucuda yazıya çevriliyorsa "Sesin yazıya çevriliyor", sonra (ön cevap ya da
// adım gelene kadar) "Anlaşılıyor". İş belli olunca yerini işin kendi yazısı alır ("WhatsApp mesajı hazırlanıyor").
export const waitText = ({ transcribing }) => (transcribing ? "Sesin yazıya çevriliyor" : "Anlaşılıyor");
