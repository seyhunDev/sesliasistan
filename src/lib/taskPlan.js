// Sıralı görev listesi (Seyhun: "Atatürk Kupası adında yarış oluştur. Bugün antrenmana Mustafa geldi. Enes aidatını nakit
// verdi. Atatürk Kupası için Instagram yarış görseli hazırla" gibi tek cümlede birden çok iş: yapay zeka görev listesi
// çıkarsın, sırayla yapılsın, her biri bitince söylensin; ara adımlar görünmesin. 2026-10-09).
// Yapay zeka (/api/tasks) cümleyi işlere böler; her iş uygulamanın kendi akışına giden kısa, tek başına anlaşılır bir
// komuttur ("say"). Plan/görev/not/mesaj gibi işler "other": bunlar ana yapay zekaya (görev listesi) birlikte gider.

export const PLAN_KINDS = {
  race: { label: "Yarış", how: "yarış oluşturma ya da yarışa sporcu/tarih/not ekleme", say: "<Yarış adı> adında yarış oluştur[, tarih][, yer][, katılan sporcular]" },
  attendance: { label: "Yoklama", how: "antrenmana kim geldi / gelmedi / izinli", say: "yoklama: <gün> <adlar> geldi[, <adlar> gelmedi]" },
  income: { label: "Nakit ödeme", how: "aidatın ya da bağışın nakit alınması (Hesaplar/Aidatlar)", say: "<Ad Soyad>'ın <ay> aidatı nakit [tutar TL] alındı  |  <Ad>'dan <tutar> TL bağış geldi" },
  dues: { label: "Aidat", how: "aidat hatırlatması ya da kim ödemedi sorusu", say: "aidat hatırlatması gönder  |  bu ay kim aidat ödemedi" },
  post: { label: "Instagram", how: "Instagram gönderisi / görseli hazırlama", say: "<konu ya da yarış adı> için Instagram gönderisi hazırla[, tür, renk, boyut]" },
  athlete: { label: "Sporcu", how: "sporcu ekleme, arşive alma, silme", say: "yeni sporcu ekle: <Ad Soyad>[, doğum yılı]" },
  inventory: { label: "Envanter", how: "envantere ekleme/çıkarma/değiştirme", say: "envantere <ne> ekle" },
  invoice: { label: "Fatura", how: "faturayı ödendi işaretleme", say: "<firma> faturası ödendi" },
  log: { label: "Antrenman günlüğü", how: "antrenmanın nasıl geçtiğini günlüğe yazma (rüzgâr, çalışılanlar); yalnız kimin geldiği söylendiyse ya da yoklama denildiyse attendance", say: "antrenman günlüğüne yaz: <anlatım>" },
  fitness: { label: "Fitness", how: "fitness / spor salonu programı hazırlama ya da değiştirme, yapılan fitness antrenmanını (set, tekrar, kilo, koşu) yazma; yelken antrenmanı değil", say: "fitness: <anlatım>" },
  event: { label: "Etkinlik", how: "kamp, gezi, piknik, balık gibi organizasyon planı (antrenman, toplantı, ders planı değil: onlar other)", say: "<etkinlik> planla" },
  shopping: { label: "Alışveriş", how: "alışveriş listesine ekleme", say: "listeye <şeyler> ekle" },
  call: { label: "Arama", how: "birini arama", say: "<Ad>'ı ara" },
  nav: { label: "Sayfa", how: "bir sayfayı açma", say: "<sayfa> sayfasını aç" },
  other: { label: "İş", how: "plan/takvim, görev, not, mesaj, soru gibi diğer her şey", say: "kullanıcının sözleri (o işe ait kısım)" },
};

const CAL_PLAN = /(antre?n?man|idman|toplantı|ders|görüşme|buluşma|bakım|saat|\d{1,2}[:.']?\d{0,2}\s*(da|de|ta|te)(?![\p{L}]))/iu;
const EVENT_WORD = /(kamp|gezi|piknik|balık|konser|festival|organizasyon|tatil|yürüyüş|etkinlik)/iu;
const LOG_WORD = /(günlü|rüzg|knot|çalıştık|nasıl geçti)/iu;
const S = (v, n) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);

// Bir görev listesinde en çok kaç iş yapılır; fazlası yapılmaz ve kullanıcıya söylenir (planCut; denetim B18)
export const PLAN_MAX = 10;
export const planCut = (raw) => Math.max(0, (Array.isArray(raw?.tasks) ? raw.tasks.filter((x) => S(x?.say, 400)).length : 0) - PLAN_MAX);
// Yapay zeka yanıtı → [{ kind, say, label }]; ardışık "other" işler tek işte birleşir (ana yapay zeka hepsini birlikte yapar)
export function cleanPlan(raw) {
  const list = (Array.isArray(raw?.tasks) ? raw.tasks : [])
    .map((x) => ({ kind: PLAN_KINDS[x?.kind] ? x.kind : "other", say: S(x?.say, 400), label: S(x?.label, 60), from: S(x?.from, 160) }))
    // Yapay zeka "yarın 10'da antrenman planla"yı etkinlik sanabiliyor: takvim planı ana yapay zekanın işidir (other)
    .map((x) => (x.kind === "event" && CAL_PLAN.test(x.say) && !EVENT_WORD.test(x.say) ? { ...x, kind: "other" } : x))
    // "… geldi, yoklamaya ekle" günlük değil yoklamadır (notsa nottur, yoklamaysa yoklamadır)
    .map((x) => (x.kind === "log" && /yoklama/iu.test(x.say) && !LOG_WORD.test(x.say) ? { ...x, kind: "attendance" } : x))
    .filter((x) => x.say)
    .slice(0, PLAN_MAX);
  const out = [];
  for (const x of list) {
    const last = out[out.length - 1];
    if (last && last.kind === "other" && x.kind === "other") {
      last.say = `${last.say}. ${x.say}`;
      last.label = [last.label, x.label].filter(Boolean).join(", ").slice(0, 60);
      last.from = [last.from, x.from].filter(Boolean).join(". ").slice(0, 160);
    } else out.push({ ...x, label: x.label || PLAN_KINDS[x.kind].label });
  }
  return out;
}

// Cümle birden çok işe benziyor mu (yapay zekaya görev listesi için sormaya değer mi)?
// kindOf(cümlecik): uygulamanın kendi akışı ("race", "post"…) ya da null. En az bir cümlecik uygulamanın akışıysa ve
// cümlecikler farklı işlere aitse evet. Cümlecikler nokta, soru/ünlem, noktalı virgül ve "ve/sonra"lı virgülle ayrılır.
// Sesle söylenen cümlede noktalama az: "görsel oluştur ve bugün Ali katıldı, yoklamaya onu ekle". Bir fiille biten
// cümleciğin ardındaki "ve" ya da virgül de ayırır, ardından gelen de bir iş ise ("Ali ve Ayşe geldi", "yarış oluştur,
// Ali ve Ayşe katılacak" bölünmez).
const VERB_END = /(?:^|\s)(?:ekle|oluştur|hazırla|yaz|gönder|sil|aç|planla|kaydet|tamamla|ertele|hatırlat|yap|ver|ara|geldi|gelmedi|katıldı|katılmadı|verdi|getirdi|ödedi|ödendi|ödedim|aldı|aldım|alındı|al|çıkar|kaldır)$/iu;
const NEXT_ACT = /(^|\s)(ekle|oluştur|yaz|gönder|hatırlat|sil|hazırla|planla|kaydet|tamamla|ertele|iptal|söyle|haber ver|aç|geldi|gelmedi|katıldı|katılmadı|öde|ver|çıkar|kaldır|arşiv|alındı)\p{L}*(\s|$|[,.])/iu;
function splitAtVerbs(part) {
  const out = [];
  let rest = part;
  for (;;) {
    const re = /(?:,\s*|\s+ve\s+|\s+)/giu;
    let m;
    let cut = -1;
    while ((m = re.exec(rest))) {
      const next = rest.slice(m.index + m[0].length).trim();
      const prev = rest.slice(0, m.index).trim();
      // Yalnız boşlukla ayrılmışsa (noktalamasız konuşma): yoklamanın iki yarısı ("yoklama al Ali geldi") bölünmez
      // ama yoklamadan önce/sonra başka bir iş varsa ("Enes nakit verdi Mehmet geldi", "Mustafa geldi yarın 10'da toplantı ekle") bölünür
      const bare = !/[,]|\sve\s/u.test(m[0]);
      const otherCut = (attish(next) && otherAct(prev) && !otherAct(next)) || (otherAct(next) && !attish(next));
      if (bare && /yoklama/iu.test(`${prev} ${next}`) && ATT_G.test(`${prev} ${next}`) && !otherCut && !/(?<![\p{L}])(oluştur|hazırla|yaz|gönder|planla|nakit|aidat)/iu.test(next)) continue;
      if (VERB_END.test(prev) && next.split(/\s+/).length >= 2 && NEXT_ACT.test(next) && !/^(diye|deyip|demek|dersen)(\s|$)/iu.test(next)) {
        cut = m.index;
        break;
      }
    }
    if (cut < 0) break;
    out.push(rest.slice(0, cut));
    rest = rest.slice(cut).replace(/^(?:,\s*|\s+ve\s+|\s+)/iu, "");
  }
  out.push(rest);
  return out;
}
export function clausesOf(text) {
  return String(text || "")
    .split(/[.!?;]+\s*|,\s*(?=(?:ve|sonra|ardından|daha sonra|bir de|ayrıca)\s)|\s+(?:ve sonra|daha sonra|sonra da|sonra|ardından|ayrıca|bir de)\s+(?=\S+\s+\S)/iu)
    .flatMap(splitAtVerbs)
    .map((x) => x.trim().replace(/^(ve|sonra|daha sonra|ardından|bir de|ayrıca)\s+/iu, ""))
    .filter((x) => x.split(/\s+/).length >= 2);
}
// Fiilsiz cümlecik ("Adı Foça Kupası", "Yarış görseli olacak") ayrı iş sayılmaz, öncekinin ayrıntısıdır
const ACT = /(^|\s)(ekle\p{L}*|oluştur\p{L}*|yaz\p{L}*|gönder\p{L}*|hatırlat\p{L}*|sil\p{L}*|ara|arar|hazırla\p{L}*|planla\p{L}*|kaydet\p{L}*|tamamla\p{L}*|ertele\p{L}*|iptal|söyle\p{L}*|haber ver\p{L}*|koy|al\p{L}*|aç|gel(di|medi)|katıl(dı|madı)|öde\p{L}*|ver\p{L}*)(\s|$|[,.])/iu;
// Yoklama cümlesinin parçası ("Yoklama al, Ali ve Ayşe geldi", "Mehmet de geldi, yoklamaya ekle"): cümlede yoklama/antrenman
// geçiyorsa yalnız "geldi/gelmedi/izinli" diyen cümlecik de yoklamadır (ayrı bir iş ya da ana yapay zekaya giden iş değil)
const ATT_TEXT = /(yoklama|antre?n?man|idman|aidat)/iu;
export const attPart = (text) => (p) => ATT_TEXT.test(text) && ATT_G.test(p) && !otherAct(p) && !/\?|(?<![\p{L}])m[ıi](?![\p{L}])/u.test(p);
const kindIn = (text, kindOf) => {
  const att = attPart(text);
  return (p) => kindOf(p) || (att(p) ? "attendance" : null);
};
export function looksMulti(text, kindOf0) {
  const parts = clausesOf(text);
  if (parts.length < 2) return false;
  const kindOf = kindIn(text, kindOf0);
  const kinds = parts.map((p) => kindOf(p) || (ACT.test(p) ? "other" : null)).filter(Boolean);
  const own = kinds.filter((k) => k !== "other");
  return own.length > 0 && new Set(kinds).size > 1;
}

// İşin sonucu (akış açıkça fail vermediyse): cevapta başarısızlık sözü varsa ✗. Cevap bir başarıyla başlıyorsa
// ("Kaydettim: Atatürk Kupası. Mustafa'yı bulamadım.") iş yapılmıştır, ✓; olumsuz fiil ("eklemedim", "yapılmadı") ✗ (denetim B6)
const DONE_START = /^\s*(tamam[,.]?\s+)?(kaydettim|ekledim|oluşturdum|yazdım|tamamladım|değiştirdim|gönderdim|hazırladım|hazırlıyorum|açtım|sildim|işaretledim|güncelledim|arşive aldım)/iu;
const FAIL_WORD = /(bulamadım|bulunamadı|edemedim|kaydedemedim|yapamadım|anlayamadım|okuyamadım|gönderilemedi|silemedim|ekleyemedim|açamadım|izni yok|yetkin yok|hata|bağlı değilsin|tekrar dene|(?:ekle|kaydet|yaz|yap|gönder|oluştur|işaretle)(?:me|ma)dim|yapılmadı|kaydedilmedi|eklenmedi)/iu;
export const failed = (msg) => {
  const m = String(msg || "");
  return !DONE_START.test(m) && FAIL_WORD.test(m);
};

// ---- Yerelde öğrenme (Seyhun: "bir dahaki sefere yapay zekadan çok içeride hızlıca halletmeye çalışabiliriz", 2026-10-09) ----
// 1) Yapay zekanın çıkardığı her iş, kullanıcının o işe ait sözüyle ("from") cihazdaki öğrenme kaydına "plan:<tür>"
//    olarak yazılır (lib/brain). Sonra benzer cümlecikler kurallar tanımasa da uygulamanın akışı sayılır.
// 2) Aynı cümle yeniden söylenirse görev listesi yapay zekaya sorulmadan cihazdaki kopyadan gelir (planCache).
// 3) Yapay zekaya ulaşılamazsa görev listesi yerelde kurulur (localPlan).

// Cümleyi anahtar yapar: küçük harf, noktalama ve fazla boşluk yok
export const planKey = (text) =>
  String(text || "")
    .toLocaleLowerCase("tr-TR")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

const CACHE = "sa-plan-cache";
const CACHE_MAX = 60;
const store = () => {
  try {
    return globalThis.localStorage || null;
  } catch {
    return null;
  }
};
function readCache(st) {
  try {
    const v = JSON.parse(st?.getItem(CACHE) || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
// Daha önce yapay zekanın çıkardığı görev listesi (aynı cümle) ya da null
// Kopya yalnız aynı gün kullanılır ve sohbete gönderme yapan cümle ("bunun için", "o yarışa") saklanmaz: yapay zekanın
// yazdığı tarih ya da çözdüğü yarış bir hafta sonra aynı cümlede yanlış olur (denetim B9)
const REFERS = /(?<![\p{L}])(bunun|buna|bunu|bu yarış\p{L}*|o yarış\p{L}*|yarışa|yarışın|ona|onu|onun|şuna|şunu|aynı)(?![\p{L}])/iu;
const dayOf = (t) => new Date(t).toDateString();
export function cachedPlan(text, st = store(), now = Date.now()) {
  const k = planKey(text);
  const hit = k && readCache(st).find((e) => e.k === k);
  if (!hit || !(hit.tasks?.length > 1) || !hit.t || dayOf(hit.t) !== dayOf(now) || REFERS.test(text)) return null;
  return hit.tasks;
}
export function rememberPlan(text, tasks, st = store()) {
  const k = planKey(text);
  if (!k || !st || !(tasks?.length > 1) || REFERS.test(text)) return;
  const list = [{ k, tasks: tasks.map(({ kind, say, label }) => ({ kind, say, label })), t: Date.now() }, ...readCache(st).filter((e) => e.k !== k)].slice(0, CACHE_MAX);
  try {
    st.setItem(CACHE, JSON.stringify(list));
  } catch {}
}

// Öğrenme kaydına yazılacak örnekler: [{ x: kullanıcının sözü, l: "plan:<tür>" }] (sözü olmayan iş öğrenilmez)
export function planLessons(tasks) {
  return (tasks || []).filter((t) => t.from && t.kind).map((t) => ({ x: t.from, l: `plan:${t.kind}` }));
}
// Öğrenilen tahmin güvenilir mi? guess: { label, score, sim } (lib/brain/model predict)
export function learnedKind(guess) {
  if (!guess?.label?.startsWith("plan:") || guess.score < 0.7 || guess.sim < 0.5) return null;
  const k = guess.label.slice(5);
  return k === "other" ? null : k;
}

// Yapay zekasız görev listesi: cümlecikler kendi akışına göre (kindOf), fiilsiz cümlecik öncekine eklenir,
// aynı akıştaki ardışık cümlecikler tek iş olur. İş 2'den azsa null.
export function localPlan(text, kindOf0) {
  const kindOf = kindIn(text, kindOf0);
  const out = [];
  for (const p of clausesOf(text)) {
    const k = kindOf(p) || (ACT.test(p) || !out.length ? "other" : null);
    const last = out[out.length - 1];
    if (!k || (last && last.k === k)) {
      last.say = `${last.say}, ${p}`;
      continue;
    }
    out.push({ k, say: p });
  }
  if (out.length < 2) return null;
  // Yoklama işi kendi sözüyle gider ("Enes geldi" tek başına yoklama sayılmazdı)
  const sayOf = (k, say) => (k === "attendance" && !/yoklama/iu.test(say) ? `yoklama: ${say}` : say);
  return out.map(({ k, say }) => ({ kind: PLAN_KINDS[k] ? k : "other", say: sayOf(k, say), label: S(say.split(/\s+/).slice(0, 5).join(" "), 60), from: S(say, 160) }));
}

// Görev listesinin sırası (Seyhun: "illa kullanıcının sıralamasına göre olmak zorunda değil, bizim için en kolayı neyse",
// 2026-10-09): önce başka işlerin dayandığı kayıtlar (yarış, sporcu), sonra sayfada kalan hızlı işler (yoklama, günlük,
// ödeme…), sonra onay isteyebilen diğer işler (mesaj, plan), en sonda sayfa değiştiren işler. Gönderi en son: gönderi
// ekranı açılınca o ekranda kalınır ve yarışın gönderisi yarış kaydedildikten sonra hazırlanır. Aynı türler söylendiği sırada.
const ORDER = ["race", "athlete", "attendance", "log", "fitness", "income", "dues", "invoice", "inventory", "shopping", "event", "other", "call", "nav", "post"];
// Yapay zekanın sırası korunur, yalnız gönderi ve sayfa açma sona alınır: sayfa listenin ortasında değişmesin (denetim B10)
export function lastPagesPlan(tasks) {
  const end = (t) => (t?.kind === "post" ? 2 : t?.kind === "nav" ? 1 : 0);
  return (tasks || []).map((t, i) => ({ t, i })).sort((a, b) => end(a.t) - end(b.t) || a.i - b.i).map((x) => x.t);
}
export function orderPlan(tasks) {
  const rank = (t) => {
    const i = ORDER.indexOf(t?.kind || "other");
    return i < 0 ? ORDER.indexOf("other") : i;
  };
  return (tasks || []).map((t, i) => ({ t, i })).sort((a, b) => rank(a.t) - rank(b.t) || a.i - b.i).map((x) => x.t);
}

// Cümlede kaç ayrı iş fiili var (noktalama olmasa da): "yarış oluştur görsel hazırla Mustafa geldi" → 3. Yoklama fiilleri
// (geldi, gelmedi, katıldı, izinli) tek iş sayılır ("Ali geldi Ayşe gelmedi" tek yoklama). 2 ve üstü: görev listesi yapay
// zekaya sorulmaya değer (Seyhun: "yapay zeka sırayla isteklerimi yerine getirebilecek bir düzen hazırlasın", 2026-10-09).
const V = [
  "ekle(?:r misin|yelim|dim|di|ndi|yin|sene)?", "oluştur(?:ur musun|alım|dum|du|uldu|un)?", "hazırla(?:r mısın|yalım|dım|dı|ndı|yın)?",
  "planla(?:r mısın|yalım|dım|dı|ndı)?", "kaydet(?:er misin|elim|tim|ti)?", "yaz(?:ar mısın|alım|dım|dı|ın|sana)?", "gönder(?:ir misin|elim|dim|di|in)?",
  "söyle(?:r misin|yelim|din)?", "haber ver(?:ir misin|elim|in)?", "ilet(?:ir misin|elim)?", "sil(?:er misin|elim|dim|in)?", "çıkar(?:ır mısın|alım|dım|dı)?",
  "kaldır(?:ır mısın|alım|dım|dı)?", "tamamla(?:r mısın|dım|dı|ndı)?", "ertele(?:r misin|dim|di)?", "hatırlat(?:ır mısın|alım|tım)?", "iptal et(?:tim|ti)?",
  "aç(?:ar mısın|alım)?", "ara(?:r mısın|yalım)?", "ödendi", "ödedi(?:m|k)?", "verdi(?:m|k)?", "getirdi", "yatırdı", "alındı", "aldı(?:m|k)?", "arşive al(?:dım|alım)?",
];
const ACTS_G = new RegExp(`(?<![\\p{L}])(?:${V.join("|")})(?![\\p{L}])`, "giu");
const ATT_G = /(?<![\p{L}])(geldi|gelmedi|katıldı|katılmadı|izinli|raporlu)(?![\p{L}])/iu;
// "yoklamaya ekle", "yoklama al", "yoklamaya Ali'yi ekle" yoklamanın kendisidir, ayrı iş değil
const ATT_DO = /(?<![\p{L}])yoklama\p{L}*\s+(?:[\p{L}'’]+\s+){0,3}?(?:ekle\p{L}*|yaz\p{L}*|al|alın\p{L}*|alalım|gir\p{L}*|işle\p{L}*)(?![\p{L}])/giu;
// Yoklama dışında bir iş fiili var mı / yoklama sözü var mı (cümlecik için)
function otherAct(x) {
  const t = String(x || "").toLocaleLowerCase("tr-TR").replace(ATT_DO, " ");
  return new RegExp(ACTS_G.source, "iu").test(t);
}
const attish = (x) => ATT_G.test(x) || /yoklama/iu.test(x);
export function actCount(text) {
  const t = String(text || "").toLocaleLowerCase("tr-TR");
  const att = ATT_G.test(t) || new RegExp(ATT_DO.source, "iu").test(t);
  const rest = t.replace(ATT_DO, " ");
  return (rest.match(ACTS_G) || []).length + (att ? 1 : 0);
}
