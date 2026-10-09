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
  log: { label: "Antrenman günlüğü", how: "antrenmanın nasıl geçtiğini günlüğe yazma (rüzgâr, çalışılanlar)", say: "antrenman günlüğüne yaz: <anlatım>" },
  event: { label: "Etkinlik", how: "kamp, gezi gibi etkinlik planı", say: "<etkinlik> planla" },
  shopping: { label: "Alışveriş", how: "alışveriş listesine ekleme", say: "listeye <şeyler> ekle" },
  call: { label: "Arama", how: "birini arama", say: "<Ad>'ı ara" },
  nav: { label: "Sayfa", how: "bir sayfayı açma", say: "<sayfa> sayfasını aç" },
  other: { label: "İş", how: "plan/takvim, görev, not, mesaj, soru gibi diğer her şey", say: "kullanıcının sözleri (o işe ait kısım)" },
};

const S = (v, n) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);

// Yapay zeka yanıtı → [{ kind, say, label }]; ardışık "other" işler tek işte birleşir (ana yapay zeka hepsini birlikte yapar)
export function cleanPlan(raw) {
  const list = (Array.isArray(raw?.tasks) ? raw.tasks : [])
    .map((x) => ({ kind: PLAN_KINDS[x?.kind] ? x.kind : "other", say: S(x?.say, 400), label: S(x?.label, 60), from: S(x?.from, 160) }))
    .filter((x) => x.say)
    .slice(0, 8);
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
const NEXT_ACT = /(^|\s)(ekle|oluştur|yaz|gönder|hatırlat|sil|hazırla|planla|kaydet|tamamla|ertele|iptal|söyle|haber ver|aç|geldi|gelmedi|katıldı|katılmadı|öde|ver|çıkar|kaldır|arşiv)\p{L}*(\s|$|[,.])/iu;
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
      const bare = !/[,]|\sve\s/u.test(m[0]);
      if (bare && /yoklama/iu.test(`${prev} ${next}`) && /(?<![\p{L}])(geldi|gelmedi|katıldı|katılmadı|izinli|raporlu)(?![\p{L}])/iu.test(`${prev} ${next}`) && !/(?<![\p{L}])(oluştur|hazırla|yaz|gönder|planla|nakit|aidat)/iu.test(next)) continue;
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
    .split(/[.!?;]+\s*|,\s*(?=(?:ve|sonra|ardından|daha sonra|bir de|ayrıca)\s)|\s+(?:ve sonra|daha sonra|sonra da|sonra|ardından|ayrıca)\s+(?=\S+\s+\S)/iu)
    .flatMap(splitAtVerbs)
    .map((x) => x.trim().replace(/^(ve|sonra|daha sonra|ardından|bir de|ayrıca)\s+/iu, ""))
    .filter((x) => x.split(/\s+/).length >= 2);
}
// Fiilsiz cümlecik ("Adı Foça Kupası", "Yarış görseli olacak") ayrı iş sayılmaz, öncekinin ayrıntısıdır
const ACT = /(^|\s)(ekle\p{L}*|oluştur\p{L}*|yaz\p{L}*|gönder\p{L}*|hatırlat\p{L}*|sil\p{L}*|ara|arar|hazırla\p{L}*|planla\p{L}*|kaydet\p{L}*|tamamla\p{L}*|ertele\p{L}*|iptal|söyle\p{L}*|haber ver\p{L}*|koy|al\p{L}*|aç|gel(di|medi)|katıl(dı|madı)|öde\p{L}*|ver\p{L}*)(\s|$|[,.])/iu;
export function looksMulti(text, kindOf) {
  const parts = clausesOf(text);
  if (parts.length < 2) return false;
  const kinds = parts.map((p) => kindOf(p) || (ACT.test(p) ? "other" : null)).filter(Boolean);
  const own = kinds.filter((k) => k !== "other");
  return own.length > 0 && new Set(kinds).size > 1;
}

// İşin sonucu: cevapta başarısızlık sözü varsa ✗
export const failed = (msg) => /(bulamadım|edemedim|kaydedemedim|yapamadım|anlayamadım|okuyamadım|gönderilemedi|silemedim|ekleyemedim|izni yok|yetkin yok|hata|bağlı değilsin|tekrar dene)/iu.test(String(msg || ""));

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
export function cachedPlan(text, st = store()) {
  const k = planKey(text);
  const hit = k && readCache(st).find((e) => e.k === k);
  return hit?.tasks?.length > 1 ? hit.tasks : null;
}
export function rememberPlan(text, tasks, st = store()) {
  const k = planKey(text);
  if (!k || !st || !(tasks?.length > 1)) return;
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
export function localPlan(text, kindOf) {
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
  return out.map(({ k, say }) => ({ kind: PLAN_KINDS[k] ? k : "other", say, label: S(say.split(/\s+/).slice(0, 5).join(" "), 60), from: S(say, 160) }));
}

// Görev listesinin sırası (Seyhun: "illa kullanıcının sıralamasına göre olmak zorunda değil, bizim için en kolayı neyse",
// 2026-10-09): önce başka işlerin dayandığı kayıtlar (yarış, sporcu), sonra sayfada kalan hızlı işler (yoklama, günlük,
// ödeme…), sonra onay isteyebilen diğer işler (mesaj, plan), en sonda sayfa değiştiren işler. Gönderi en son: gönderi
// ekranı açılınca o ekranda kalınır ve yarışın gönderisi yarış kaydedildikten sonra hazırlanır. Aynı türler söylendiği sırada.
const ORDER = ["race", "athlete", "attendance", "log", "income", "dues", "invoice", "inventory", "shopping", "event", "other", "call", "nav", "post"];
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
// "yoklamaya ekle", "yoklama al" yoklamanın kendisidir, ayrı iş değil
const ATT_DO = /(?<![\p{L}])yoklama\p{L}*\s+(ekle|yaz|al|gir|işle)\p{L}*/giu;
export function actCount(text) {
  const t = String(text || "").toLocaleLowerCase("tr-TR");
  const att = ATT_G.test(t) || new RegExp(ATT_DO.source, "iu").test(t);
  const rest = t.replace(ATT_DO, " ");
  return (rest.match(ACTS_G) || []).length + (att ? 1 : 0);
}
