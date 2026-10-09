// Katman 2d (yapay zekasız): insan davranışları. Konuşan kişi kararsızdır, düzeltir, vazgeçer, "onu" der, aynı şeyi iki kez
// söyler, uzun uzun anlatır, kibar ya da sokak ağzıyla konuşur, soruyla komutu karıştırır. Asistanın bunlara verdiği ilk karar
// (yerelde, telefonda) burada uygulamanın kendi işlevleriyle sınanır:
//   a) Mesaj kartı onay bekliyor: cevap gönder mi, vazgeç mi, değiştir mi (AssistantSheet: confirmWord, isYes, isNo)
//   b) Kayıt taslağı onay bekliyor: kaydet mi, vazgeç mi, değiştir mi (AssistantSheet SAVE / DROP; kaynaktan okunur)
//   c) "Başka bir isteğin var mı?" sorusuna cevap: kapat mı, devam mı (isNoMore)
//   d) "Saat kaçta olsun?" sorusuna cevap: yerelde doğru saat ya da yapay zekaya bırakma; yanlış saat asla (quickAnswer)
//   e-j) Yeni komut: düzeltme, vazgeçme, gönderme ("onu"), soru mu komut mu, tekrar, kibarlık/sokak ağzı, uzun anlatım
// Sonuç satırları: { katman: "davranış", grup, say, expect, ok, got }
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { confirmWord } from "@/lib/ai/messageRules";
import { isYes, isNo, isNoMore } from "@/lib/assistantLocal";
import { quickAnswer } from "@/lib/ai/rules";
import { firstNeed } from "@/features/add/drafts";
import { matchNames } from "@/lib/trainingLog";
import { cleanSay } from "@/lib/speech/normalize";
import { train, predict, labelFromAI } from "@/lib/brain/model";
import { decide, kindOfRoute, tr, TODAY, NAMES } from "./akis.mjs";

// AssistantSheet.jsx'teki taslak cevap kuralları (bileşen Node'da yüklenmez; aynı satır kaynaktan okunur, kod değişirse test de değişir)
const SHEET = readFileSync(fileURLToPath(new URL("../../src/features/assistant/AssistantSheet.jsx", import.meta.url)), "utf8");
const grab = (name) => {
  const m = new RegExp(`^const ${name} = /(.+)/([a-z]*);$`, "m").exec(SHEET);
  return m ? new RegExp(m[1], m[2]) : null;
};
const SAVE = grab("SAVE");
const DROP = grab("DROP");

// a) Mesaj kartı: AssistantSheet `cards.pending.send` iken
function cardAnswer(raw) {
  const s = cleanSay(raw);
  const cw = confirmWord(s);
  if (cw === "yes" || isYes(s)) return "gönder";
  if (cw === "no" || isNo(s)) return "vazgeç";
  return "değiştir"; // yapay zekaya: mesaj taslağı değişir
}
// b) Kayıt taslağı: AssistantSheet `drafts.length` iken
function draftAnswer(raw) {
  const s = cleanSay(raw);
  if (SAVE?.test(s)) return "kaydet";
  if (DROP?.test(s)) return "vazgeç";
  return "değiştir";
}

const CARD = [
  // [cevap, beklenen]
  ["evet", "gönder"], ["evet gönder", "gönder"], ["gönder", "gönder"], ["tamam", "gönder"], ["olur", "gönder"], ["onayladım", "gönder"],
  ["evet evet", "gönder"], ["he", "gönder"], ["hı hı", "gönder"], ["evet lütfen", "gönder"], ["tamam yolla", "gönder"], ["gönder gitsin", "gönder"],
  ["aynen öyle", "gönder"], ["tabii ki", "gönder"], ["olur gönder", "gönder"], ["evt", "gönder"], ["gönderebilirsin", "gönder"], ["at gitsin", "gönder"],
  ["hayır", "vazgeç"], ["vazgeç", "vazgeç"], ["vazgeçtim", "vazgeç"], ["gönderme", "vazgeç"], ["yok", "vazgeç"], ["yok yok", "vazgeç"],
  ["boşver", "vazgeç"], ["dur", "vazgeç"], ["dur dur", "vazgeç"], ["iptal", "vazgeç"], ["hayır gönderme", "vazgeç"], ["istemiyorum", "vazgeç"],
  ["yok kalsın", "vazgeç"], ["şimdilik gönderme", "vazgeç"], ["aslında gönderme", "vazgeç"], ["bekle bekle", "vazgeç"], ["hayir", "vazgeç"],
  ["daha kısa yaz", "değiştir"], ["sonuna teşekkürler ekle", "değiştir"], ["Ali değil Ayşe'ye gönder", "değiştir"], ["saati 11 yap", "değiştir"],
  ["evet ama saati 11 yap", "değiştir"], ["tamam ama daha kısa olsun", "değiştir"], ["hayır yarın değil cuma yaz", "değiştir"], ["emin değilim", "değiştir"],
  ["gönder ama önce yarın kelimesini sil", "değiştir"], ["olur da biraz daha kibar yaz", "değiştir"],
];
const DRAFT = [
  ["kaydet", "kaydet"], ["evet", "kaydet"], ["tamam", "kaydet"], ["olur", "kaydet"], ["ekle", "kaydet"], ["evet kaydet", "kaydet"], ["kaydet gitsin", "kaydet"],
  ["tamam tamam", "kaydet"], ["aynen", "kaydet"], ["he kaydet", "kaydet"],
  ["vazgeç", "vazgeç"], ["iptal", "vazgeç"], ["hayır", "vazgeç"], ["boşver", "vazgeç"], ["kaydetme", "vazgeç"], ["vazgeçtim", "vazgeç"], ["yok yok kaydetme", "vazgeç"],
  ["saat 11 olsun", "değiştir"], ["yarın değil cuma", "değiştir"], ["evet ama saat 11 olsun", "değiştir"], ["tamam ama yeri iskele olsun", "değiştir"],
  ["olur da Ali'yi de ekle", "değiştir"], ["hayır 10 değil 11", "değiştir"], ["başlığı tekne bakımı yap", "değiştir"],
];
const MORE = [
  // "Başka bir isteğin var mı?" sorusundan sonra: [cevap, kapat mı (true) yoksa devam mı (false)]
  ["yok", true], ["yok sağ ol", true], ["hayır", true], ["başka yok", true], ["şimdilik yok teşekkürler", true], ["yok yok", true], ["yok bişey", true],
  ["hayır teşekkür ederim", true], ["yok bu kadar", true], ["yok kapat", true],
  ["yok yok bir de yarın 10'da antrenman ekle", false], ["hayır ama Ali'ye yaz", false], ["yok cuma olsun", false], ["yok saatini 11 yap", false],
  ["hayır onu yanlış ekledin", false], ["yok Ali değil Ayşe", false], ["var", false], ["evet bir şey daha", false], ["yok ama yoklamaya Mehmet'i ekle", false],
];
// Saat sorusu: [cevap, beklenen saat ya da null (yapay zekaya bırakılmalı)]; "*" yerelde çözülmese de olur (yapay zekaya gider)
const TIME = [
  ["10'da", "10:00"], ["onda", "10:00"], ["saat on buçukta", "10:30"], ["akşam altıda", "18:00"], ["öğlen", "12:00"], ["sabah dokuzda", "09:00"],
  ["10", "10:00*"], ["10 olsun", "10:00*"], ["saat 10", "10:00*"], ["öğleden sonra üçte", "15:00*"], ["akşamüstü beş gibi", "17:00*"],
  ["10'da değil 11'de", "11:00*"], ["yok 11'de", "11:00*"], ["bilmiyorum", null], ["sonra söylerim", null], ["fark etmez", null],
  ["vazgeç", null], ["hmm", null], ["Ali'ye sor", null],
];

// Yeni komutlar: [söylenen, kabul edilen yollar (iş türü), açıklama, bağlam]
const NEW = [
  // e) Düzeltme (cümle içinde)
  ["Düzeltme", "yarın değil cuma 10'da antrenman ekle", ["other"]],
  ["Düzeltme", "yarın 10'da yok yok 11'de antrenman ekle", ["other"]],
  ["Düzeltme", "Ali'ye yaz yok yok Ayşe'ye yaz yarın gelsin", ["other"]],
  ["Düzeltme", "yoklamaya Ali'yi ekle pardon Ayşe'yi", ["attendance"]],
  ["Düzeltme", "Foça yarışını aç yok Çeşme yarışını aç", ["race"]],
  ["Düzeltme", "planlar değil notlar sayfasını aç", ["nav"]],
  ["Düzeltme", "kapat yok kapatma yarın 10'da antrenman ekle", ["other"]],
  ["Düzeltme", "turkcell değil vodafone faturası ödendi", ["invoice"]],
  // f) Vazgeçme (yeni cümle olarak; bekleyen bir şey yokken bir şey oluşturmamalı)
  ["Vazgeçme", "vazgeçtim", ["close", "other"]],
  ["Vazgeçme", "dur dur dur", ["close", "other"]],
  ["Vazgeçme", "boşver hiçbir şey yapma", ["close", "other"]],
  ["Vazgeçme", "unut gitsin", ["close", "other"]],
  ["Vazgeçme", "tamam tamam kapat", ["close"]],
  ["Vazgeçme", "yanlış söyledim kapat", ["close"]],
  ["Vazgeçme", "iptal iptal", ["close", "other"]],
  // g) Gönderme ("onu", "son", "sıradaki")
  ["Gönderme", "onu sil", ["other"]],
  ["Gönderme", "bunu yarına ertele", ["other"]],
  ["Gönderme", "az önceki planı 11'e al", ["other"]],
  ["Gönderme", "son eklediğimi sil", ["undo"]],
  ["Gönderme", "son kaydı geri al", ["undo"]],
  ["Gönderme", "sıradaki yarışı aç", ["race"]],
  ["Gönderme", "son yarışı göster", ["race"]],
  ["Gönderme", "onu da yoklamaya ekle", ["attendance", "other"]],
  ["Gönderme", "ona da yaz", ["other"]],
  // h) Soru mu komut mu (soru bir şey kaydetmemeli)
  ["Soru / komut", "Ali geldi mi", ["other"], { path: "/athletes/attendance" }],
  ["Soru / komut", "Ali geldi", ["attendance"], { path: "/athletes/attendance" }],
  ["Soru / komut", "Ali bugün geldi mi antrenmana", ["other"]],
  ["Soru / komut", "yarın antrenman var mı", ["other"]],
  ["Soru / komut", "Turkcell faturası ödendi mi", ["other", "invoice?"]],
  ["Soru / komut", "Turkcell faturası ödendi", ["invoice"]],
  ["Soru / komut", "Enes aidatını verdi mi", ["other", "athlete"]],
  ["Soru / komut", "listede süt var mı", ["other", "shopping?"]],
  ["Soru / komut", "listeye süt ekle", ["shopping"]],
  ["Soru / komut", "kapatayım mı", ["other"]],
  ["Soru / komut", "Ali'yi aradın mı", ["other"]],
  ["Soru / komut", "Foça yarışına kim gidiyor", ["other", "race"]],
  ["Soru / komut", "envanterde kaç telsiz var", ["inventory", "other"]],
  // i) Tekrar
  ["Tekrar", "kapat kapat", ["close"]],
  ["Tekrar", "yoklama al yoklama al Ali geldi", ["attendance"]],
  ["Tekrar", "Ali'ye yaz Ali'ye yaz yarın gel", ["other"]],
  ["Tekrar", "antrenman ekle antrenman ekle yarın 10'da", ["other"]],
  ["Tekrar", "listeye süt ekle listeye süt ekle", ["shopping"]],
  ["Tekrar", "Foça yarışını aç Foça yarışını aç", ["race"]],
  // j) Kibarlık ve sokak ağzı
  ["Kibar / sokak ağzı", "rica etsem yarın 10'a antrenman ekler misin", ["other"]],
  ["Kibar / sokak ağzı", "Ali'yi arar mısın lütfen", ["call"]],
  ["Kibar / sokak ağzı", "bi zahmet yoklamaya Ali'yi ekleyiver", ["attendance"]],
  ["Kibar / sokak ağzı", "listeye süt ekleyiver", ["shopping"]],
  ["Kibar / sokak ağzı", "Foça yarışını açıver", ["race"]],
  ["Kibar / sokak ağzı", "Turkcell faturasını ödedik", ["invoice"]],
  ["Kibar / sokak ağzı", "abi şu planları bi açsana", ["nav"]],
  ["Kibar / sokak ağzı", "kanka yoklamayı açsana", ["nav", "attendance"]],
  ["Kibar / sokak ağzı", "hocam Ali'ye yaz yarın gelmesin", ["other"]],
  ["Kibar / sokak ağzı", "eyvallah kapatabilirsin", ["close"]],
  ["Kibar / sokak ağzı", "Ali'yi bi arasana", ["call"]],
  ["Kibar / sokak ağzı", "yarın sabah antrenman koyalım mı onda", ["other"]],
];
// k) Uzun, dağınık anlatım: [söylenen, olması gereken iş türleri]
const LONG = [
  ["şimdi şöyle bugün hava çok güzeldi çocuklar erken geldi tekneleri falan hazırladık neyse uzatmayayım Ali ve Ayşe geldi yoklamaya ekle", ["attendance"]],
  ["ya şimdi bir şey diyecektim unuttum dur hatırladım yarın sabah 10'da tekne bakımı var onu takvime koy bir de Ali'yi ara", ["other", "call"]],
  ["bugün antrenmanda rüzgar 14 knot civarındaydı poyrazdı start çalıştık tramola çalıştık iki saat sürdü çok iyi geçti antrenman günlüğüne yaz sonra da Mehmet'i yoklamaya ekle geldi çünkü", ["log", "attendance"]],
  ["Enes geldi aidatını da nakit verdi 1500 lira bir de listeye çay şeker bitti onları ekle sonra Foça yarışını aç bakayım", ["attendance", "income", "shopping", "race"]],
];
// l) Yanlış ya da eksik söylenen sporcu adı (günlükteki katılanlar yoklamayla eşleşir; matchNames)
const ROSTER = NAMES.map((n, i) => ({ id: `s${i}`, studentName: n, status: "active" }));
const WHO = [
  ["ali", "Ali Kaya"], ["AYŞE", "Ayşe Demir"], ["ayse demir", "Ayşe Demir"], ["Mustafa Yilmaz", "Mustafa Yılmaz"], ["ilay", "İlay Toprak"],
  ["Ilay", "İlay Toprak"], ["emre koc", "Emre Koç"], ["Gökan", "Gökhan Arslan"],
  ["Musti", null], ["Ali Veli", null],
];

// İş türü; görev listesinde türü olmayan yerel yollar (geri al, kişi ekle…) kendi adıyla
const kindOf = (r) => (kindOfRoute(r) === "other" && r !== "ai" ? r : kindOfRoute(r));
// m) Öğrenme deposu (Ayarlar › Öğrenme; lib/brain/model.js): yapay zekanın cevapladığı cümleler depoya yazılır, benzer cümle
// bir dahaki sefere yerelde tanınır. Burada yapay zeka cevapları örnek olarak verilir (labelFromAI), depo kurulur (train),
// aynı işin farklı söylenişleri sorulur (predict). Uygulamada tahmin güveni 0,5'in altındaysa kullanılmaz.
const AI_SEEN = [
  ["yarın 10'da antrenman ekle", { intent: "create", items: [{ type: "plan" }] }],
  ["cumartesi sabah tekne bakımı koy", { intent: "create", items: [{ type: "plan" }] }],
  ["perşembe 17:00 Optimist antrenmanı", { intent: "create", items: [{ type: "plan" }] }],
  ["Ali tekneleri yıkasın", { intent: "create", items: [{ type: "task" }] }],
  ["Mehmet römork lastiklerini kontrol etsin", { intent: "create", items: [{ type: "task" }] }],
  ["not al malzeme odası çok dolu", { intent: "create", items: [{ type: "note" }] }],
  ["not al yelken dikilecek", { intent: "create", items: [{ type: "note" }] }],
  ["Ali'ye yaz yarın erken gelsin", { intent: "message", send: { to: "Ali", text: "x" } }],
  ["ekibe yaz antrenman iptal", { intent: "message", send: { to: "Ekip", text: "x" } }],
  ["bu hafta neler var", { intent: "query" }],
  ["yarın ne var", { intent: "query" }],
  ["motor yağı görevini bitirdim", { intent: "action", actions: [{ op: "complete_task" }] }],
  ["tekneleri hazırlama işi bitti", { intent: "action", actions: [{ op: "complete_task" }] }],
  ["yarınki toplantıyı sil", { intent: "action", actions: [{ op: "delete" }] }],
];
// lib/commands.js eşikleri: sureGuess (yapay zekadan önce, FIRST) ve brainCommand (yalnız yapay zeka yoksa, MIN_SCORE)
const FIRST = { score: 0.8, sim: 0.5, agree: 2, same: 0.9 };
function level(g) {
  if (!g) return "tanınmadı";
  const sure = g.score >= FIRST.score && g.sim >= FIRST.sim && (g.sim >= FIRST.same || g.near.filter((n) => n.l === g.label && n.sim >= FIRST.sim * 0.8).length >= FIRST.agree);
  return sure ? "yerelde" : g.score >= 0.55 ? "yalnız yapay zeka cevap vermezse" : "güven düşük, yapay zekaya";
}
const LEARN = [
  // [yeni söyleniş, beklenen etiket]
  ["yarın onda antrenman ekle", "create:plan"],
  ["yarin 10da antreman ekle", "create:plan"],
  ["şey ııı cumartesi sabah tekne bakımı koy", "create:plan"],
  ["Ali tekneleri yıkasın lütfen", "create:task"],
  ["not al yelkenler dikilecek", "create:note"],
  ["aliye yaz yarin erken gelsin", "send"],
  ["bu hafta ne var", "query"],
  ["motor yağı işini bitirdim", "complete"],
  ["yarınki toplantıyı silelim", "action:delete"],
];

const kindsOf = (d) => (d.multi ? d.steps.map((x) => kindOf(x.route)) : [kindOf(d.route)]);
const show = (d) => (d.multi ? `görev listesi: ${d.steps.map((x) => `“${x.say}” → ${tr(x.route)}`).join(" | ") || "liste kurulamadı"}` : tr(d.route));

export function run() {
  const rows = [];
  const push = (grup, say, expect, ok, got) => rows.push({ katman: "davranış", grup, say, expect, ok, got });

  for (const [s, want] of CARD) {
    const got = cardAnswer(s);
    push("Mesaj kartına cevap (gönder / vazgeç / değiştir)", s, want, got === want, got);
  }
  if (!SAVE || !DROP) push("Kayıt taslağına cevap", "SAVE/DROP", "AssistantSheet.jsx'te bulunur", false, "kural satırı bulunamadı (test güncellenmeli)");
  else
    for (const [s, want] of DRAFT) {
      const got = draftAnswer(s);
      push("Kayıt taslağına cevap (kaydet / vazgeç / değiştir)", s, want, got === want, got);
    }
  for (const [s, close] of MORE) {
    const shut = isNoMore(cleanSay(s));
    // Kapanmıyorsa cümle her zamanki yoldan gider (yalnız kapatma kararı sınanır)
    push("“Başka bir isteğin var mı?” cevabı", s, close ? "asistanı kapat" : "kapanmaz, söylenen yapılır", shut === close, shut ? "asistanı kapat" : `devam: ${show(decide(s, { askedMore: true }))}`);
  }
  for (const [s, want] of TIME) {
    const drafts = [{ type: "plan", title: "Antrenman", date: TODAY, time: "" }];
    let r = null;
    let err = "";
    try {
      r = quickAnswer(s, drafts, TODAY, firstNeed(drafts));
    } catch (e) {
      err = e.message;
    }
    const time = r?.[0]?.time || null;
    const soft = String(want || "").endsWith("*");
    const exact = soft ? want.slice(0, -1) : want;
    const ok = !err && (time === exact || (soft && time === null) || (want === null && time === null));
    push("“Saat kaçta olsun?” cevabı", s, want === null ? "saat yazılmaz (yapay zekaya)" : soft ? `${exact} ya da yapay zekaya` : exact, ok, err ? `ÇÖKTÜ: ${err}` : time ? `yerelde saat ${time}${r?.[0]?.date && r[0].date !== TODAY ? `, gün ${r[0].date}` : ""}` : "yapay zekaya bırakıldı");
  }
  for (const [grup, s, want, o] of NEW) {
    let d;
    try {
      d = decide(s, o || {});
    } catch (e) {
      push(grup, s, want.join(" ya da "), false, `ÇÖKTÜ: ${e.message}`);
      continue;
    }
    const ks = kindsOf(d);
    // "x?": cümle soru; o akışa da gidebilir (akış soruyu kendisi cevaplıyorsa), ama kayıt yapan başka akışa gitmemeli
    const okKinds = want.map((w) => w.replace(/\?$/, ""));
    // Düzeltme ve tekrarda aynı iş iki kez yapılmamalı
    const twice = d.multi && d.steps.length > 1 && new Set(ks).size < ks.length;
    const ok = ks.length > 0 && ks.every((k) => okKinds.includes(k)) && !twice;
    const expect = okKinds.map((w) => (w === "other" ? tr("ai") : tr(w))).join(" ya da ");
    push(`Yeni cümle: ${grup}`, s, expect, ok, `${show(d)}${twice ? " (aynı iş iki kez)" : ""}`);
  }
  for (const [s, want] of LONG) {
    let d;
    try {
      d = decide(s);
    } catch (e) {
      push("Uzun, dağınık anlatım", s, want.map(tr).join(" + "), false, `ÇÖKTÜ: ${e.message}`);
      continue;
    }
    const ks = kindsOf(d);
    const ok = want.every((w) => ks.includes(w)) && !ks.includes("close");
    push("Uzun, dağınık anlatım (yapay zeka cevap vermezse)", s, want.map(tr).join(" + "), ok, show(d));
  }
  {
    const ex = AI_SEEN.map(([x, r], i) => ({ x, l: labelFromAI(r), s: "ai", t: i }));
    const idx = train(ex);
    for (const [say, want] of LEARN) {
      const p = predict(idx, say);
      const how = level(p);
      const ok = p?.label === want && how === "yerelde";
      push("Öğrenme deposu: yapay zekanın cevabı bir dahaki sefere yerelde", say, `${want}, yapay zekaya sormadan`, ok, p ? `${p.label} · ${how} · güven ${p.score.toFixed(2)}, benzerlik ${p.sim.toFixed(2)} · en yakın “${p.near[0].x}”` : "tanınmadı");
    }
    // Aynı cümleye yapay zeka sonra farklı cevap verdiyse depo yeni cevabı kullanmalı (Seyhun: "farklı bir durumda farklı bir şey çıkabilir")
    const same = "Ali'ye yarın tekne bakımı";
    const p2 = predict(train([...ex, { x: same, l: "create:plan", s: "ai", t: 100 }, { x: same, l: "send", s: "ai", t: 200 }]), same);
    push("Öğrenme deposu: yapay zekanın cevabı bir dahaki sefere yerelde", `${same} (önce plan, sonra mesaj öğrenildi)`, "send (en yeni cevap)", p2?.label === "send", p2 ? `${p2.label} · güven ${p2.score.toFixed(2)}` : "tanınmadı");
    // Aynı cevap tekrar gelirse depo bozulmamalı (aynı kalır)
    const p3 = predict(train([...ex, ...ex]), "yarın 10'da antrenman ekle");
    push("Öğrenme deposu: yapay zekanın cevabı bir dahaki sefere yerelde", "yarın 10'da antrenman ekle (aynı cevap iki kez öğrenildi)", "create:plan", p3?.label === "create:plan", p3 ? `${p3.label} · güven ${p3.score.toFixed(2)}` : "tanınmadı");
  }
  for (const [said, want] of WHO) {
    const m = matchNames([said], ROSTER);
    const got = m.names[0] || null;
    push("Yanlış / eksik söylenen sporcu adı (günlük ↔ yoklama)", said, want ? want : "eşleşmez (yanlış kişiye yazılmaz)", got === want, got || "eşleşmedi");
  }
  return rows;
}
