// Sesli/yazılı sayfa geçişi: "yoklamayı aç", "planlara git", "ana sayfaya dön", "ekip ile mesaj sayfamı aç".
// Yapay zekaya gitmeden çözülür (anında). Emin olunamayan cümlelerde null döner; o zaman yapay zekaya sorulur.
// Dönüş: { page } | { back: true } | { chat: "team" | "family" | "athletes" } | { chatWith: "<kişi adı>" } | null

// need: sayfayı kimler açabilir (AssistantSheet denetler) — athletes: sporcu yetkisi · athleteSide: sporcu/veli · owner: ana hesap · receipts: fiş ekleyebilen
export const PAGES = {
  home: { path: "/", label: "Ana sayfa" },
  calendar: { path: "/calendar", label: "Takvim" },
  messages: { path: "/messages", label: "Mesajlar" },
  plans: { path: "/plans", label: "Planlar" },
  events: { path: "/events", label: "Etkinlikler", need: "owner" },
  inventory: { path: "/inventory", label: "Envanter", need: "owner" },
  posts: { path: "/posts", label: "Instagram gönderileri", need: "owner" },
  tasks: { path: "/tasks", label: "Görevler" },
  notes: { path: "/notes", label: "Notlar" },
  receipts: { path: "/receipts", label: "Fişler", need: "receipts" },
  invoices: { path: "/invoices", label: "Faturalar", need: "owner" },
  payments: { path: "/payments", label: "Gelen ödemeler", need: "owner" },
  accounts: { path: "/mail", label: "Hesaplar", need: "owner" },
  attendance: { path: "/athletes/attendance", label: "Yoklama", need: "athletes" },
  athletes: { path: "/athletes", label: "Sporcular", need: "athletes" },
  races: { path: "/athletes/races", label: "Yarışlar", need: "athletes" },
  training: { path: "/training", label: "Antrenman günlüğü" },
  dues: { path: "/dues", label: "Aidatlar", need: "athletes" },
  myAttendance: { path: "/my-attendance", label: "Yoklamam", need: "athleteSide" },
  shopping: { path: "/shopping", label: "Alışveriş listesi" },
  birthdays: { path: "/birthdays", label: "Doğum günleri" },
  schedule: { path: "/schedule", label: "Ders programı" },
  archive: { path: "/archive", label: "Arşiv" },
  settings: { path: "/settings", label: "Ayarlar" },
  people: { path: "/staff", label: "Kişiler", need: "owner" },
  peopleStaff: { path: "/people/staff", label: "Çalışanlar", need: "owner" },
  peopleFamily: { path: "/people/family", label: "Aile kişileri", need: "owner" },
  peopleAthletes: { path: "/people/athletes", label: "Sporcu kişileri", need: "owner" },
};
export const PAGE_KEYS = Object.keys(PAGES);

const lower = (s) => String(s || "").toLocaleLowerCase("tr-TR");
const clean = (s) => lower(s).replace(/[.,!?;:"“”()]/g, " ").replace(/['’]/g, "'").replace(/\s+/g, " ").trim();

// Gitme/açma fiilleri (kibar ve konuşma biçimleriyle). "açık" (açık görevler) fiil değildir.
const VERB =
  /(^|\s)(aç|açar|açsana|açalım|açın|açabilir\S*|açıver|açar mısın|açarmısın|göster|gösterir|göstersene|gösterebilir\S*|git|gidelim|gidebilir\S*|gidiver|geç|geçelim|geçebilir\S*|götür|götürür\S*|gir|girelim|girebilir\S*|bak|bakalım|bakayım|bakmak|dön|dönelim|getir|görmek|görelim|görüntüle|aç bakalım)(?=\s|$)/;
const PAGE_W = /(^|\s)(sayfa\S*|ekran\S*|bölüm\S*|kısm\S*|menü\S*)(?=\s|$)/;
// Bunlar varsa sayfa açma değil: soru, zaman, başka iş
const QUESTION = /(^|\s)(neler|ne var|kaç|hangi|var mı|nedir|ne zaman|nerede|kim|kimler|mı|mi|mu|mü)(?=\s|$)|\?/;
const POLITE_Q = /(aç|göster|götür|geç|gir|bak)\S* m[ıiuü]s[ıiuü]n/; // "açar mısın" soru değil, ricadır
const TIME_W = /(^|\s)(bugün\S*|yarın\S*|dün|haftaya|bu hafta\S*|geçen|gelecek|önümüzdeki|pazartesi|salı|çarşamba|perşembe|cuma|cumartesi|pazar|saat \d|\d{1,2}[:.]\d{2})(?=\s|$)/;
const OTHER_JOB = /(^|\s)(ekle\S*|oluştur\S*|kaydet\S*|sil\S*|yaz(?!ış)\S*|gönder(?!iler)\S*|söyle\S*|ilet\S*|tamamla\S*|hatırlat\S*|geldi\S*|gelmedi\S*|izinli|çek\S*|yükle\S*|not al\S*|haber\S*|de ki|sor\S*)(?=\s|$)/;

const CHAT_W = /(^|\s)(mesaj\S*|sohbet\S*|konuşma\S*|yazışma\S*|grub\S*|grup\S*|chat)(?=\s|$)/;
const PEOPLE_W = /(^|\s)(kişi\S*|rehber\S*|liste\S*|bilgi\S*|hesap\S*|üye\S*)(?=\s|$)/;
const GROUP = [
  ["team", /(^|\s)(ekip\S*|ekib\S*|takım\S*)(?=\s|$)/],
  ["family", /(^|\s)(aile\S*)(?=\s|$)/],
  ["athletes", /(^|\s)(sporcu\S*)(?=\s|$)/],
];

// Sıra önemli: özel olan önce ("yoklamam" > "yoklama", "doğum günü" > "gün")
const TARGETS = [
  ["myAttendance", /(^|\s)(yoklamam\S*|yoklama geçmişim\S*|devamsızlığım\S*)(?=\s|$)/],
  ["attendance", /(^|\s)yoklama\S*/],
  ["training", /(^|\s)(antrenman günlü\S*|günlü(k|ğü|ğe)\S*)(?=\s|$)/],
  ["dues", /(^|\s)(aidat\S*)(?=\s|$)/],
  ["races", /(^|\s)(yarış evrak\S*|yarışlar\S*|yarış sayfa\S*|evrak\S*)/],
  ["birthdays", /(^|\s)doğum ?gün\S*/],
  ["schedule", /(^|\s)(ders\S*|okul programı\S*)/],
  ["shopping", /(^|\s)(alışveriş\S*|market\S*|alınacak\S*)/],
  ["archive", /(^|\s)arşiv\S*/],
  ["settings", /(^|\s)(ayar\S*|tercih\S*)/],
  ["invoices", /(^|\s)fatura\S*/],
  ["payments", /(^|\s)(ödemeler\S*|aldığım ödeme\S*|gelen ödeme\S*|kişisel hesab\S*|kişisel hesap\S*)/],
  ["accounts", /(^|\s)(hesaplar\S*|hesaplarım\S*|banka hesab\S*|mailler\S*|maillerim\S*)(?=\s|$)/],
  ["receipts", /(^|\s)(fiş\S*|harcama\S*|masraf\S*)/],
  ["tasks", /(^|\s)(görev\S*|yapılacak\S*|işler\S*|işlerim\S*)/],
  ["notes", /(^|\s)not(lar\S*|ları\S*|larım\S*|um\S*|u|a)?(?=\s|$)/],
  ["calendar", /(^|\s)takvim\S*/],
  ["events", /(^|\s)(etkinlikler\S*|organizasyon\S*|kamp planlar\S*|geziler\S*)/],
  ["inventory", /(^|\s)(envanter\S*|demirbaş\S*)/],
  ["posts", /(^|\s)(instagram\S*|gönderiler\S*|paylaşımlar\S*)/],
  ["plans", /(^|\s)(plan\S*|etkinlik\S*|program\S*)/],
  ["peopleStaff", /(^|\s)(çalışan\S*|personel\S*)/],
  ["people", /(^|\s)(kişi\S*|rehber\S*)/],
  ["messages", /(^|\s)(mesaj\S*|sohbet\S*|konuşma\S*|yazışma\S*)/],
  ["home", /(ana ?sayfa\S*|ana ekran\S*|başa dön\S*|başlangıç\S*|eve dön\S*|en başa\S*)/],
];

// Tek başına söylenen sayfa adları ("ayarlar", "ana sayfa", "planlar sayfası", "planlarım", "fişlerim")
const BARE = /^(ana ?sayfa|ana ekran|ayarlar|(mesajlar|planlar|görevler|notlar|fişler|faturalar|ödemeler|yarışlar|derslerim|etkinlikler|gönderiler)(ım|im)?|instagram|takvim(im)?|notlarım|arşiv|kişiler|yoklama|yoklamam|yarış evrakı|alışveriş listesi|doğum günleri|dersler|ders programı|aidatlar|antrenman günlüğü|envanter(im)?|demirbaşlar)( sayfası| ekranı)?$/;

// Önceki sayfaya dönüş ("geri dön", "geri git", "bir önceki sayfaya dön"): kısa ve başka iş içermeyen cümleler
const BACK = /^(?:(?:tamam|şimdi|hadi|bir)\s+)?(?:geri (?:dön|git|gel|gidelim|dönelim)\S*|(?:bir )?önceki sayfa\S*(?: (?:dön|git|aç|geç)\S*)?|geri)(?: lütfen)?$/;

// Ses tanımanın böldüğü ya da tek harf kaçırdığı sayfa adlarını onarır: "yok lamayı" → "yoklamayı", "takvi mi" → "takvimi",
// "yoklamyı" → "yoklamayı". Yalnızca sayfa adı kökleri için; fiil olan benzerleri ("planla", "ayarla") karışmasın diye listede yok.
const GLUE = ["yoklama", "takvim", "görev", "planlar", "notlar", "fişler", "ayarlar", "arşiv", "mesajlar", "yarışlar", "sporcular", "alışveriş", "çalışan", "doğum"];
const TYPO = ["yoklama", "takvim", "alışveriş", "sporcular", "çalışanlar"];
function near1(a, b) {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  while (i < a.length && a[i] === b[i]) i++;
  return a.slice(i + 1) === b.slice(i + 1) || a.slice(i + 1) === b.slice(i) || a.slice(i) === b.slice(i + 1);
}
export function repairWords(t) {
  const w = t.split(" ");
  for (let i = 0; i < w.length - 1; i++) {
    const j = w[i] + w[i + 1];
    if (GLUE.some((g) => w[i].length < g.length && j.startsWith(g))) w.splice(i, 2, j);
  }
  return w
    .map((x) => {
      if (TYPO.some((g) => x.startsWith(g))) return x;
      for (const g of TYPO)
        for (const n of [g.length - 1, g.length, g.length + 1]) if (n <= x.length && near1(x.slice(0, n), g)) return g + x.slice(n);
      return x;
    })
    .join(" ");
}

// Kişi adı geçiyor mu ("Ali ile mesajlaşmayı aç", "Sanver'in sohbeti"): adın ilk kelimesi ya da tam adı, ekli hâliyle
function personIn(t, names) {
  const toks = t.split(" ");
  const fold = (s) => lower(s).replace(/'.*$/, "");
  let best = null;
  for (const n of names || []) {
    const full = lower(n).trim();
    if (!full) continue;
    const first = full.split(" ")[0];
    if (first.length < 2) continue;
    const hitFull = t.includes(full);
    const hitFirst = toks.some((w) => {
      const f = fold(w);
      return f === first || (f.startsWith(first) && f.length - first.length <= 4); // Ali'ye, Aliyle, Sanver'le
    });
    if (hitFull || hitFirst) {
      if (best && !hitFull) return { ambiguous: true };
      best = n;
      if (hitFull) break;
    }
  }
  return best ? { name: best } : null;
}

export function localNavigate(text, { names = [] } = {}) {
  const t = repairWords(clean(text));
  if (!t || t.split(" ").length > 9) return null;
  if (BACK.test(t)) return { back: true };
  const polite = POLITE_Q.test(t);
  if ((QUESTION.test(t) && !polite) || TIME_W.test(t) || OTHER_JOB.test(t)) return null;
  const verb = VERB.test(t) || polite;
  const chatWords = CHAT_W.test(t);
  const peopleWords = PEOPLE_W.test(t);
  const group = GROUP.find(([, re]) => re.test(t))?.[0];
  const bareChat = chatWords && group && t.split(" ").length <= 3; // "aile sohbeti", "ekip grubu"
  if (!verb && !PAGE_W.test(t) && !BARE.test(t) && !bareChat) return null;

  // Kişi listesi sayfaları ("aile kişilerini aç", "sporcu listesini göster", "çalışanları aç")
  if (peopleWords && !chatWords) {
    if (group === "family") return { page: "peopleFamily" };
    if (group === "athletes") return { page: /liste/.test(t) ? "athletes" : "peopleAthletes" };
    if (group === "team" || /çalışan|personel/.test(t)) return { page: "peopleStaff" };
  }
  // Sohbet: grup ya da kişi ("ekip ile mesaj sayfamı aç", "aile grubunu aç", "Ali ile mesajlaşmayı aç")
  if (chatWords || (group && group !== "athletes" && !peopleWords)) {
    if (group) return { chat: group };
    const p = personIn(t, names);
    if (p?.ambiguous) return null; // iki kişi uyuyor: yapay zeka sorsun
    if (p) return { chatWith: p.name };
  }
  if (group === "athletes" && !chatWords) return { page: "athletes" };
  if (group === "team" && /çalışan/.test(t)) return { page: "peopleStaff" };

  const hit = TARGETS.find(([, re]) => re.test(t));
  if (hit) return { page: hit[0] };
  // Fiil var ama hedef tanınmadı: kişi adı geçiyorsa onunla sohbet ("Ali'yi aç" değil; "Ali ile konuşmamı göster" yukarıda)
  return null;
}
