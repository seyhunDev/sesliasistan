// Yedek yorumlayıcı: AI anahtarı yokken veya AI hata verdiğinde çalışır.
import { normalizeSpeech } from "@/lib/speech/normalize";

const MONR = "ocak|şubat|mart|nisan|mayıs|haziran|temmuz|ağustos|eylül|ekim|kasım|aralık";
const MONS = MONR.split("|");
const NUMW = { bir: 1, iki: 2, "üç": 3, "dört": 4, "beş": 5, "altı": 6, yedi: 7, sekiz: 8, dokuz: 9, on: 10, onbir: 11, oniki: 12 };
const EVR = /(antrenman|toplantı|kamp|yarış|regata|turnuva|maç|buluşma|eğitim|etkinlik|sınav|görüşme|randevu|seans|kurs|tören)/i;
const TKR = /(hazırla|ayarla|sipariş|hatırlat|unutma|götür|getir|gönder|öde\b|ödeme yap|kontrol et|değiştir|yenile|planla|teslim|imzala|başvur|rezervasyon|yapılacak|yapılmalı|edilecek|edilmeli|alınacak|alınmalı|lazım|gerek|almalı|yapmalı|ara\b|aramalı|arayacak|temizle|tamir|onar)/i;
const PRE = "(^|[\\s,.;(])";
const POST = "(?=$|[\\s,.;!?)'’])";

const lc = (x) => x.toLocaleLowerCase("tr-TR");
const cap = (x) => x.charAt(0).toLocaleUpperCase("tr-TR") + x.slice(1);
const pad = (n) => String(n).padStart(2, "0");
const dstr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const clean = (t) =>
  t.replace(/\s+/g, " ").replace(/^[\s,.;:–—-]+|[\s,.;:–—-]+$/g, "").replace(/^(ve|ile)\s+/i, "");

function parseWhen(t, c) {
  let w = ` ${t} `;
  const r = { date: "", endDate: "", time: "" };
  const P = PRE, Q = POST;
  const mi = (x) => MONS.indexOf(lc(x));
  let m;

  const rng = new RegExp(P + "(\\d{1,2})\\s*(" + MONR + ")?\\s*(?:ile|-|–|—)\\s*(\\d{1,2})\\s*(" + MONR + ")\\s*(?:tarihleri\\s*)?(?:arasında|arası)?" + Q, "i");
  if ((m = rng.exec(w))) {
    const m2 = mi(m[5]);
    const m1 = m[3] ? mi(m[3]) : m2;
    r.date = c.ymd(+m[2], m1);
    r.endDate = c.ymd(+m[4], m2);
    if (r.endDate < r.date) r.endDate = dstr(new Date(+r.date.slice(0, 4) + 1, m2, +m[4]));
    w = w.replace(rng, "$1 ");
  }
  if (!r.date) {
    const one = new RegExp(P + "(\\d{1,2})\\s*(" + MONR + ")(?:['’]?(?:de|da|te|ta|den|dan|e|a))?" + Q, "i");
    if ((m = one.exec(w))) {
      r.date = c.ymd(+m[2], mi(m[3]));
      w = w.replace(one, "$1 ");
    }
  }
  if (!r.date) {
    const num = new RegExp(P + "(\\d{1,2})[./](\\d{1,2})(?:[./](\\d{2,4}))?" + Q, "i");
    m = num.exec(w);
    if (m && +m[3] >= 1 && +m[3] <= 12 && +m[2] >= 1 && +m[2] <= 31) {
      r.date = m[4] ? `${m[4].length === 2 ? "20" + m[4] : m[4]}-${pad(+m[3])}-${pad(+m[2])}` : c.ymd(+m[2], +m[3] - 1);
      w = w.replace(num, "$1 ");
    }
  }
  if (!r.date) {
    const rl = [
      [new RegExp(P + "(?:bugün|bu gün)" + Q, "i"), 0],
      [new RegExp(P + "yarın(?:['’]?(?:a|dan|da|ki))?" + Q, "i"), 1],
      [new RegExp(P + "(?:öbür gün|ertesi gün)" + Q, "i"), 2],
    ];
    for (let i = 0; i < rl.length && !r.date; i++) {
      if (rl[i][0].test(w)) {
        r.date = c.plus(rl[i][1]);
        w = w.replace(rl[i][0], "$1 ");
      }
    }
  }
  if (!r.date) {
    const wd = new RegExp(P + "(?:(haftaya|gelecek|önümüzdeki|bu)\\s+)?(pazartesi|salı|çarşamba|perşembe|cumartesi|cuma|pazar)(?:['’]?(?:ya|ye|da|de|ta|te))?(?:\\s+gün(?:üne|ünde|ü))?" + Q, "i");
    if ((m = wd.exec(w))) {
      const WI = { pazar: 0, pazartesi: 1, "salı": 2, "çarşamba": 3, "perşembe": 4, cuma: 5, cumartesi: 6 };
      const day = c.base.getDay();
      const wi = WI[lc(m[3])];
      let n;
      // "haftaya salı": gelecek haftanın (pazartesi başlar) o günü. "bu salı": bu haftaki. Yalın "salı": en yakın sonraki.
      if (m[2] && /haftaya|gelecek|önümüzdeki/i.test(m[2])) n = ((8 - day) % 7 || 7) + ((wi + 6) % 7);
      else if (m[2] && /^bu$/i.test(m[2])) n = (wi - day + 7) % 7;
      else n = (wi - day + 7) % 7 || 7;
      r.date = c.plus(n);
      w = w.replace(wd, "$1 ");
    }
  }

  const pod = /(sabah|öğleden sonra|akşam|gece|öğlen|öğle)/i.exec(w);
  let hh = null, mm = 0;
  const words = "bir|iki|üç|dört|beş|altı|yedi|sekiz|dokuz|onbir|oniki|on";
  const tp = [
    [new RegExp(P + "saat(?:i|ini)?\\s*(\\d{1,2})(?:[:.](\\d{2}))?(?:['’]?(?:da|de|ta|te))?" + Q, "i"), 1, 2],
    [new RegExp(P + "(\\d{1,2})[:.](\\d{2})" + Q, "i"), 1, 2],
    [new RegExp(P + "(\\d{1,2})\\s*['’]?(?:da|de|ta|te)" + Q, "i"), 1, 0],
    [new RegExp(P + "(?:saat\\s*)?(" + words + ")(?:['’]?(?:da|de|ta|te))" + Q, "i"), -1, 0],
    [new RegExp(P + "saat\\s*(" + words + ")" + Q, "i"), -1, 0],
  ];
  for (let j = 0; j < tp.length && hh === null; j++) {
    if ((m = tp[j][0].exec(w))) {
      hh = tp[j][1] === -1 ? NUMW[lc(m[2])] : +m[2];
      mm = tp[j][2] && m[3] ? +m[3] : 0;
      w = w.replace(tp[j][0], "$1 ");
    }
  }
  if (hh !== null && hh < 24) {
    const pd = pod ? lc(pod[1]) : "";
    if ((/akşam|gece|öğleden sonra/.test(pd) && hh < 12) || (/öğle/.test(pd) && hh < 7)) hh += 12;
    r.time = `${pad(hh)}:${pad(mm)}`;
  } else if (pod && /öğle/.test(lc(pod[1]))) r.time = "12:00";
  w = w.replace(new RegExp(P + "(?:sabah|öğleden sonra|akşam|gece|öğlen|öğle)" + Q, "i"), "$1 ");
  return { ...r, text: clean(w) };
}

function findPlace(t) {
  let place = "";
  let m = /(^|[\s,])([A-ZÇĞİÖŞÜ][A-Za-zÇĞİÖŞÜçğıöşü]+)['’](?:da|de|ta|te)(?=$|[\s,.;])/.exec(t);
  if (m) {
    place = m[2];
    t = t.replace(m[0], m[1] + " ");
  } else if ((m = /(^|[\s,])(kulüp|marina|liman|okul|salon|ofis|tesis)(?:te|de|ta|da|e|a)?(?=$|[\s,.;])/i.exec(t))) {
    place = cap(lc(m[2]));
    t = t.replace(m[0], m[1] + " ");
  }
  return { place, text: t };
}

function fillW(t) {
  t = t.replace(/(?:eklemek|oluşturmak|koymak|yazmak|planlamak)\s+istiyorum/gi, " ").replace(/(?:başlangıç\s+)?saat(?:leri|i)?(?=\s|$)/gi, " ").replace(/(^|\s)(?:istiyorum|olsun)(?=\s|$)/gi, "$1 ");
  const F = new RegExp(PRE + "(?:var|olacak|yapılacak|yapacağız|yapıyoruz|gidiyoruz|gideceğiz|başlıyor|başlayacak|oluştur|oluşturalım|oluşturur musun|ekle|ekleyelim|kaydet)" + POST, "gi");
  for (let k = 0; k < 3; k++) t = t.replace(F, "$1 ");
  return clean(t);
}

function taskTitle(t) {
  t = t.replace(/^\s*(?:bir de|ayrıca|şunu da|bunu da)\s+/i, "");
  t = t.replace(/(?:ma|me)(?:yı|yi|yu|yü)\s+(?:hatırlat\w*|unutma\w*)/i, "");
  t = t.replace(/(?:ma|me)(?:mız|miz|muz|müz|nız|niz|m|n)?\s+(?:lazım|gerek\w*)/i, "");
  t = t.replace(/\s+(?:lazım|gerekiyor|gerek|hatırlat\w*|unutma\w*|unutmayalım)\s*$/i, "");
  return cap(clean(t));
}

function catOf(sg, type) {
  const m = EVR.exec(sg);
  if (type === "plan" && m) {
    const k = lc(m[1]);
    return /antrenman/.test(k) ? "Antrenman" : /toplantı|görüşme/.test(k) ? "Toplantı" : /kamp/.test(k) ? "Kamp" : /yarış|regata|turnuva|maç/.test(k) ? "Yarış" : "Genel";
  }
  return /(eldiven|yelken|halat|ıskota|tekne|malzeme|sipariş|can yeleği)/i.test(sg) ? "Ekipman" : "Genel";
}

function classify(sg, c) {
  const raw = sg.replace(/^\s*(?:not|görev|plan)\s*[:\-]\s*/i, "");
  const x = parseWhen(raw, c);
  const lower = lc(sg);
  const ev = EVR.test(sg);
  const when = !!(x.date || x.time);
  const tk = TKR.test(sg);
  const varw = /(^|\s)(var|olacak|yapılacak|yapacağız)/.test(lower);
  let type;
  if (/^\s*not\s*[:\-]/i.test(sg) || /(^|\s)not\s+(düş|al|ekle)/i.test(sg)) type = "note";
  else if (/^\s*görev\s*[:\-]/i.test(sg)) type = "task";
  else if (/^\s*plan\s*[:\-]/i.test(sg)) type = "plan";
  else if (ev && (varw || (when && !tk))) type = "plan";
  else if (tk) type = "task";
  else if (when && /(^|\s)(var|olacak|gidiyoruz|gideceğiz|başlıyor|başlayacak)/.test(lower)) type = "plan";
  else if (x.time) type = "plan";
  else type = "note";

  const d = { type, title: "", body: "", date: x.date, endDate: x.endDate, time: x.time, place: "", link: false, cat: catOf(sg, type) };
  if (type === "plan") {
    const pp = findPlace(x.text);
    const em = EVR.exec(sg);
    d.place = pp.place;
    if (!d.date && d.time) d.date = c.today;
    d.title = cap(fillW(pp.text) || (em ? em[1] : "Plan"));
  } else if (type === "task") {
    d.title = taskTitle(x.text);
    d.time = "";
    d.endDate = "";
  } else {
    const b = cap(clean(raw.replace(/(^|\s)not\s+(?:düş|al|ekle)\w*/i, "$1")));
    d.body = b;
    d.title = b.split(" ").slice(0, 6).join(" ");
    d.date = "";
    d.time = "";
    d.endDate = "";
  }
  if (!d.title) d.title = cap(clean(raw));
  return d;
}

// "yarın ve cuma", "pazartesi ve çarşamba" gibi birden fazla gün: her gün için ayrı kayıt
const DAY_RE = /(?<![\p{L}\p{N}])(?:(haftaya|gelecek|önümüzdeki)\s+)?(öbür gün|bu gün|bugün|yarın|pazartesi|salı|çarşamba|perşembe|cumartesi|cuma|pazar)(?:['’]?(?:ya|ye|da|de|ta|te|dan|den|ki|a|e))?(?:\s+gün(?:üne|ünde|ü))?(?![\p{L}])/giu;
function expandDates(sg) {
  const ms = [...sg.matchAll(DAY_RE)];
  if (ms.length < 2) return [sg];
  const run = [ms[0]];
  for (let i = 1; i < ms.length; i++) {
    const prev = run[run.length - 1];
    const between = sg.slice(prev.index + prev[0].length, ms[i].index);
    if (/^\s*(?:,|ve|ile|,\s*ve)\s*$/i.test(between)) run.push(ms[i]);
    else break;
  }
  if (run.length < 2) return [sg];
  const a = run[0].index;
  const last = run[run.length - 1];
  const b = last.index + last[0].length;
  return run.map((m) => `${sg.slice(0, a)}${m[1] ? m[1] + " " : ""}${m[2]}${sg.slice(b)}`.replace(/\s+/g, " ").trim());
}

export function interpretRules(text, today) {
  text = normalizeSpeech(text);
  const base = new Date(`${today}T00:00`);
  const plus = (n) => {
    const d = new Date(base);
    d.setDate(d.getDate() + n);
    return dstr(d);
  };
  const ymd = (d, m) => {
    const y = base.getFullYear();
    let dt = new Date(y, m, d);
    if (dstr(dt) < today) dt = new Date(y + 1, m, d);
    return dstr(dt);
  };
  const c = { today, base, plus, ymd };

  const segs = [];
  text.replace(/\s+/g, " ").split(/[!?;\n]+|\.(?=\s|$)/).forEach((s) => {
    s = s.trim();
    if (!s) return;
    const out = [];
    s.split(/\s*,\s*/).forEach((q) => {
      if (!q) return;
      if (out.length && q.split(" ").length < 3) out[out.length - 1] += ", " + q;
      else out.push(q);
    });
    segs.push(...out);
  });

  const merged = [];
  segs.flatMap(expandDates).map((sg) => classify(sg, c)).forEach((d) => {
    const l = merged[merged.length - 1];
    if (l && l.type === "note" && d.type === "note") l.body += ". " + d.body;
    else merged.push(d);
  });

  const plan = merged.find((d) => d.type === "plan");
  if (plan) {
    merged.forEach((d) => {
      if (d.type === "plan") return;
      d.link = true;
      if (d.type === "task" && !d.date) d.date = plan.date;
    });
  }
  return merged;
}

// ---- Devam eden konuşma: önceki taslakları yeni mesajla tamamlar veya günceller ----
const HW = ["", "bir", "iki", "üç", "dört", "beş", "altı", "yedi", "sekiz", "dokuz", "on", "on bir", "on iki"];
function spokenTime(t) {
  const [h, m] = t.split(":").map(Number);
  const part = h < 6 ? "gece" : h < 12 ? "sabah" : h < 18 ? "öğleden sonra" : "akşam";
  let out = h === 12 && m === 0 ? "öğlen on iki" : `${part} ${HW[h % 12 || 12]}`;
  if (m === 30) out += " buçuk";
  else if (m) out += ` ${m}`;
  return out;
}
function makeCtx(today) {
  const base = new Date(`${today}T00:00`);
  const plus = (n) => {
    const d = new Date(base);
    d.setDate(d.getDate() + n);
    return dstr(d);
  };
  const ymd = (d, m) => {
    const y = base.getFullYear();
    let dt = new Date(y, m, d);
    if (dstr(dt) < today) dt = new Date(y + 1, m, d);
    return dstr(dt);
  };
  return { today, base, plus, ymd };
}
const ALLDAY = /(tüm gün|bütün gün|gün boyu|fark etmez|farketmez|saat yok|saatsiz|saat önemli değil|saati sonra)/i;

// append=true: Yeni kayıt ekranı (yeni bir şey söylenirse listeye eklenir). append=false: düzenleme (tek kayıt).
export function refineRules(text, drafts, today, name = "", append = true) {
  const c = makeCtx(today);
  const raw = normalizeSpeech(text);
  const x = parseWhen(raw, c);
  let time = x.time;
  // "10", "10 olsun", "saat 10.30 yap" gibi yalın saat cevabı
  const bare = /^\s*(?:saat(?:i|ini)?\s*)?(\d{1,2})(?:[:.](\d{2}))?\s*(?:olsun|yap|yapalım|de|da)?\s*$/i.exec(raw);
  if (!time && !x.date && bare && +bare[1] < 24) time = `${pad(+bare[1])}:${bare[2] || "00"}`;
  const pl = findPlace(x.text);
  const noTime = ALLDAY.test(raw);
  const kw = EVR.test(raw) || TKR.test(raw);
  const words = clean(x.text).split(" ").filter(Boolean).length;
  const detail = !kw && (time || x.date || noTime || (pl.place && words <= 4));
  const items = drafts.map((d) => ({ ...d }));
  const target =
    (time && items.find((d) => d.type === "plan" && !d.time)) ||
    (noTime && items.find((d) => d.type === "plan" && !d.time && !d.allDay)) ||
    items.find((d) => d.type === "plan") ||
    items.find((d) => d.type === "task") ||
    (!append ? items[0] : null);
  const nope = { items, message: "Bunu anlayamadım, alanları aşağıdan değiştirebilirsin." };

  if (!detail || !target) {
    if (!append) {
      // Düzenleme: not metnine ekleme
      const d = items[0];
      if (d && d.type === "note" && raw) {
        d.body = `${d.body ? d.body + ". " : ""}${raw}`;
        return { items, message: "Nota ekledim." };
      }
      return nope;
    }
    return { items: [...items, ...interpretRules(raw, today)], message: "" }; // yeni bir şey söylüyor: listeye ekle
  }

  const say = [];
  const oldDate = target.date;
  if (x.date) {
    target.date = x.date;
    if (target.type === "plan") target.endDate = x.endDate || "";
    say.push(`günü ${new Date(`${x.date}T00:00`).toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" })} yaptım`);
    if (target.type === "plan") items.forEach((d) => { if (d.type === "task" && d.link && d.date === oldDate) d.date = x.date; });
  }
  if (time && target.type === "plan") {
    target.time = time;
    target.allDay = false;
    say.push(`saati ${spokenTime(time)} yaptım`);
  } else if (noTime && target.type === "plan") {
    target.time = "";
    target.allDay = true;
    say.push("tüm gün olarak ekliyorum");
  }
  if (pl.place && target.type === "plan") {
    target.place = pl.place;
    say.push(`yeri ${pl.place} yaptım`);
  }
  if (!say.length) return nope;
  return { items, message: `Tamamdır${name ? " " + name : ""}, ${say.join(", ")}.` };
}
