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
    .map((x) => ({ kind: PLAN_KINDS[x?.kind] ? x.kind : "other", say: S(x?.say, 400), label: S(x?.label, 60) }))
    .filter((x) => x.say)
    .slice(0, 8);
  const out = [];
  for (const x of list) {
    const last = out[out.length - 1];
    if (last && last.kind === "other" && x.kind === "other") {
      last.say = `${last.say}. ${x.say}`;
      last.label = [last.label, x.label].filter(Boolean).join(", ").slice(0, 60);
    } else out.push({ ...x, label: x.label || PLAN_KINDS[x.kind].label });
  }
  return out;
}

// Cümle birden çok işe benziyor mu (yapay zekaya görev listesi için sormaya değer mi)?
// kindOf(cümlecik): uygulamanın kendi akışı ("race", "post"…) ya da null. En az bir cümlecik uygulamanın akışıysa ve
// cümlecikler farklı işlere aitse evet. Cümlecikler nokta, soru/ünlem, noktalı virgül ve "ve/sonra"lı virgülle ayrılır.
export function clausesOf(text) {
  return String(text || "")
    .split(/[.!?;]+\s*|,\s*(?=(?:ve|sonra|ardından|daha sonra|bir de|ayrıca)\s)|\s+(?:ve sonra|ardından|ayrıca)\s+/iu)
    .map((x) => x.trim().replace(/^(ve|sonra|daha sonra|ardından|bir de|ayrıca)\s+/iu, ""))
    .filter((x) => x.split(/\s+/).length >= 2);
}
// Fiilsiz cümlecik ("Adı Foça Kupası", "Yarış görseli olacak") ayrı iş sayılmaz, öncekinin ayrıntısıdır
const ACT = /(^|\s)(ekle\p{L}*|oluştur\p{L}*|yaz\p{L}*|gönder\p{L}*|hatırlat\p{L}*|sil\p{L}*|ara|arar|hazırla\p{L}*|planla\p{L}*|kaydet\p{L}*|tamamla\p{L}*|ertele\p{L}*|iptal|söyle\p{L}*|haber ver\p{L}*|koy|al\p{L}*|aç|gel(di|medi)|öde\p{L}*|ver\p{L}*)(\s|$|[,.])/iu;
export function looksMulti(text, kindOf) {
  const parts = clausesOf(text);
  if (parts.length < 2) return false;
  const kinds = parts.map((p) => kindOf(p) || (ACT.test(p) ? "other" : null)).filter(Boolean);
  const own = kinds.filter((k) => k !== "other");
  return own.length > 0 && new Set(kinds).size > 1;
}

// İşin sonucu: cevapta başarısızlık sözü varsa ✗
export const failed = (msg) => /(bulamadım|edemedim|kaydedemedim|yapamadım|anlayamadım|okuyamadım|gönderilemedi|silemedim|ekleyemedim|izni yok|yetkin yok|hata|bağlı değilsin|tekrar dene)/iu.test(String(msg || ""));
