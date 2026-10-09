// Katman 2 ve 3 (yapay zekasız): asistan cümleyi anlıyor mu, görev listesi doğru kuruluyor mu, takılma riski var mı.
// Sonuç satırları: { katman, grup, say, ok, expect, got }
import { decide, kindOfRoute, tr, PLAN_MAX } from "./akis.mjs";
import { TEK, COK, GERCEK, BOZUCULAR } from "./girdiler.mjs";

const set = (a) => [...new Set(a)].sort().join(",");
const kindsTr = (a) => a.map(tr).join(" + ");

// Tek işli cümle: doğru yola gitmeli ve görev listesine bölünmemeli
function single(s, want, o = {}) {
  const d = decide(s, o);
  if (d.multi) return { ok: false, got: `tek iş ama görev listesi sanıldı (yapay zekaya fazladan soruluyor, yavaşlar; yapay zeka cevap vermezse: ${d.steps.map((x) => `“${x.say}” → ${tr(x.route)}`).join(" | ") || "hiç iş yapılmaz"})` };
  const ok = want.includes(d.route) || (want.includes("ai") && d.route === "local:navigate");
  return { ok, got: tr(d.route) };
}
// Çok işli cümle: görev listesine alınmalı (alınırsa listeyi yapay zeka kurar). Yapay zeka cevap vermezse kurulan
// yedek listenin doğruluğu "akış" katmanında ayrıca sınanır.
function multi(s, want, o = {}) {
  const d = decide(s, o);
  if (!d.multi) return { ok: false, got: `tek iş sanıldı, hepsi → ${tr(d.route)} (diğer işler yapılmaz)`, d };
  return { ok: true, got: "görev listesine alındı", d, want };
}

export function run() {
  const rows = [];
  const push = (katman, grup, say, expect, r) => rows.push({ katman, grup, say, expect, ok: r.ok, got: r.got });
  const multis = []; // takılma denetimi için kurulan görev listeleri

  // ---- Katman 2a: temiz cümleler
  for (const c of TEK) push("anlama", `Temiz cümle: ${c.grup}`, c.s, c.want.map(tr).join(" ya da "), single(c.s, c.want, c.o));
  for (const [s, want] of COK) {
    const r = multi(s, want);
    if (r.d?.multi) multis.push({ s, d: r.d, want });
    push("anlama", "Temiz cümle: çok iş", s, `görev listesi: ${kindsTr(want)}`, r);
  }
  // ---- Katman 2b: insan / ses tanıma hataları (bozucular her cümleye uygulanır)
  for (const b of BOZUCULAR) {
    for (const c of TEK) {
      const s = b.f(c.s);
      if (s === c.s) continue;
      push("hatalı girdi", `Bozuk: ${b.ad}`, s, c.want.map(tr).join(" ya da "), single(s, c.want, c.o));
    }
    for (const [s0, want] of COK) {
      const s = b.f(s0);
      if (s === s0) continue;
      const r = multi(s, want);
      if (r.d?.multi) multis.push({ s, d: r.d, want });
      push("hatalı girdi", `Bozuk: ${b.ad}`, s, `görev listesi: ${kindsTr(want)}`, r);
    }
  }
  // ---- Katman 2c: gerçek hatalar (elle yazılmış)
  for (const [s, want, why, o] of GERCEK) {
    if (Array.isArray(want)) {
      const r = multi(s, want, o);
      if (r.d?.multi) multis.push({ s, d: r.d, want });
      push("hatalı girdi", `Gerçek hata: ${why}`, s, `görev listesi: ${kindsTr(want)}`, r);
    } else push("hatalı girdi", `Gerçek hata: ${why}`, s, tr(want), single(s, [want], o));
  }

  // ---- Katman 3: görev listesi akışı ve takılma riski
  const seen = new Set();
  for (const { s, d, want } of multis) {
    if (seen.has(s)) continue;
    seen.add(s);
    const st = d.steps;
    // Yedek liste: yapay zeka cevap vermezse (internet yok, kota doldu) telefon listeyi kendisi kurar
    const fb = st.length ? set(st.map((x) => kindOfRoute(x.route))) === set(want) : false;
    rows.push({ katman: "akış", grup: "Yedek görev listesi (yapay zeka cevap vermezse)", say: s, expect: kindsTr(want), ok: fb, got: st.length ? st.map((x) => `“${x.say}” → ${tr(x.route)}`).join(" | ") : "liste kurulamıyor (hiç iş yapılmaz)" });
    if (!st.length) continue;
    const problems = [];
    if (st.length > PLAN_MAX) problems.push(`${st.length} iş, en çok ${PLAN_MAX}`);
    if (st.some((x) => !String(x.say || "").trim())) problems.push("boş iş var");
    if (st.some((x) => x.route === "close")) problems.push("listedeki bir iş asistanı kapatıyor (sonraki işler yapılmaz)");
    const kinds = st.map((x) => kindOfRoute(x.route));
    const ri = kinds.indexOf("race"), pi = kinds.lastIndexOf("post");
    if (ri >= 0 && pi >= 0 && pi < ri) problems.push("gönderi yarıştan önce (yarış henüz yok)");
    if (pi >= 0 && kinds.slice(pi + 1).some((k) => k !== "post" && k !== "nav")) problems.push("gönderiden sonra iş var (gönderi ekranı açılınca liste orada kalır)");
    const dup = st.map((x) => x.say.toLocaleLowerCase("tr-TR")).filter((x, i, a) => a.indexOf(x) !== i);
    if (dup.length) problems.push(`aynı iş iki kez: ${dup[0]}`);
    rows.push({ katman: "akış", grup: "Görev listesi: sıra ve takılma", say: s, expect: "liste kurulur, işler doğru sırada, hiçbiri asistanı kapatmaz", ok: !problems.length, got: problems.join("; ") || `${st.length} iş: ${st.map((x) => tr(x.route)).join(" → ")}` });
  }

  // Saçma / aşırı girdiler: çökmemeli ve hemen karar vermeli (takılmamalı)
  const ODD = ["", "   ", "....", "😀😀😀", "ııııı", "a ".repeat(1500), "kapat ".repeat(8), "123456789", "?", "ve ve ve ve", "yarın yarın yarın yarın 10'da 10'da antrenman", "Ali'ye'ye yaz", "yoklama yoklama yoklama", "sonra sonra sonra"];
  for (const s of ODD) {
    const t0 = performance.now();
    let got;
    let ok = true;
    try {
      const d = decide(s);
      got = d.multi ? `görev listesi (${d.steps.length})` : tr(d.route);
    } catch (e) {
      ok = false;
      got = `ÇÖKTÜ: ${e.message}`;
    }
    const ms = performance.now() - t0;
    if (ms > 300) (ok = false), (got += ` · ${Math.round(ms)} ms (yavaş)`);
    rows.push({ katman: "akış", grup: "Saçma girdi: çökmez, takılmaz", say: s.length > 60 ? `${s.slice(0, 40)}… (${s.length} harf)` : JSON.stringify(s), expect: "çökmeden 300 ms içinde karar", ok, got });
  }
  // Hız: bütün cümlelerde yerel karar süresi (telefonda daha yavaş olabilir; burada bilgisayarda)
  {
    const all = [...TEK.map((c) => c.s), ...COK.map((c) => c[0]), ...GERCEK.map((c) => c[0])];
    const t0 = performance.now();
    for (const s of all) decide(s);
    const per = (performance.now() - t0) / all.length;
    rows.push({ katman: "akış", grup: "Hız", say: `${all.length} cümle`, expect: "cümle başına 20 ms altı", ok: per < 20, got: `cümle başına ${per.toFixed(2)} ms` });
  }
  return rows;
}
