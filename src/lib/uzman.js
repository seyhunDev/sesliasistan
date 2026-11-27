// Uzman antrenörler (Seyhun 2026-11-27, Admin › Uzmanlar; örnek project-files/admin-sayfasi/uzmanlar.html).
// Her uzmanın bir branşı (Fitness, Yelken, Beslenme…) ve branşın içinde uzmanlık etiketleri var; liste kod değişmeden büyür
// (ana hesabın eklediği branş ve etiketler orgs/{org}/ayar/uzmanlik). Sporcunun isteği (Fitness › Uzmanla çalış, sunucu
// /api/uzman-istek yazar) orgs/{org}/uzmanIstekleri; uzman orgs/{org}/uzmanlar. Şimdilik yalnız ana hesap yönetir; ileride
// uzmanın kendi girişi uzman.uid ile bağlanır, isteğe atanınca istek.uzmanUid yazılır (kural hazır).
// Testler de içe aktarır: "@/" içe aktarması yok.

export const BRANSLAR = [
  { id: "fitness", ad: "Fitness", alt: ["Kuvvet", "Kondisyon", "Esneklik", "Patlayıcı güç", "Sakatlık sonrası", "Çocuk kondisyonu"] },
  { id: "yelken", ad: "Yelken", alt: ["Optimist", "ILCA", "Taktik", "Start", "Hız ve trim"] },
  { id: "beslenme", ad: "Beslenme", alt: ["Sporcu beslenmesi", "Kilo kontrolü", "Yarış öncesi"] },
  { id: "futbol", ad: "Futbol", alt: ["Teknik", "Kaleci", "Kondisyon"] },
  { id: "psikoloji", ad: "Spor psikolojisi", alt: ["Yarış kaygısı", "Odak", "Motivasyon"] },
];
export const SPORLAR = [
  ["yelken", "Yelken"], ["kurek", "Kürek"], ["futbol", "Futbol"], ["tenis", "Tenis"], ["yuzme", "Yüzme"], ["kosu", "Koşu"], ["bisiklet", "Bisiklet"],
];
// Uygulamanın spor kimliği (src/sports) -> uzman listesindeki spor
const SPORT_ID = { sailing: "yelken", rowing: "kurek", football: "futbol", tennis: "tenis", swimming: "yuzme", running: "kosu", cycling: "bisiklet" };
export const sporOf = (s) => SPORT_ID[s] || s || "";
export const YASLAR = [
  ["cocuk", "Çocuk"], ["genc", "Genç"], ["yetiskin", "Yetişkin"],
];
// Çocuk 12 yaşa kadar, genç 13-17, yetişkin 18+
export const yasGrubu = (yas) => (!(yas > 0) ? "" : yas <= 12 ? "cocuk" : yas <= 17 ? "genc" : "yetiskin");
export const SURELER = [1, 3, 6];
export const DURUM = {
  bekliyor: "Uzman bekleniyor", atandi: "Atandı", kabul: "Sürüyor", ret: "Reddedildi", bitti: "Bitti", iptal: "İptal",
};
export const PAYLAS_AD = { antrenman: "antrenman", yelken: "yelken", yemek: "yemek", yaris: "yarış", tatil: "tatil" };
export const AKTIF_DURUM = ["atandi", "kabul"];

const ad = (list, id) => list.find((x) => (x[0] || x.id) === id)?.[1] || list.find((x) => x.id === id)?.ad || id;
export const sporAd = (id) => ad(SPORLAR, id);
export const yasAd = (id) => ad(YASLAR, id);

// Kod listesi + ana hesabın eklediği branşlar/etiketler (ayar: { branslar: [{ id, ad, alt }] })
export function branslar(ayar) {
  const out = BRANSLAR.map((b) => ({ ...b, alt: [...b.alt] }));
  for (const e of ayar?.branslar || []) {
    if (!e?.id) continue;
    const b = out.find((x) => x.id === e.id);
    if (b) for (const t of e.alt || []) !b.alt.includes(t) && b.alt.push(t);
    else out.push({ id: e.id, ad: e.ad || e.id, alt: [...(e.alt || [])] });
  }
  return out;
}
export const bransAd = (id, liste = BRANSLAR) => liste.find((b) => b.id === id)?.ad || id || "";
// "Spor psikolojisi" -> "spor-psikolojisi"
export const kimlik = (s) =>
  String(s || "")
    .toLocaleLowerCase("tr")
    .replace(/[çğıöşü]/g, (c) => ({ ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u" })[c])
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 30);

// Uzmanın şu an çalıştığı sporcu sayısı
export const doluluk = (uzmanId, istekler = []) => istekler.filter((i) => i.uzmanId === uzmanId && AKTIF_DURUM.includes(i.durum)).length;

const kucuk = (s) => String(s || "").toLocaleLowerCase("tr");
// Eşleştirme puanı (100 üzerinden). Branş aynı değilse null. neden: Admin'de puanın altında yazan kısa gerekçeler.
// Spor 30 ("Hepsi" diyen 15), yaş 25 (bilinmiyorsa 12; çocuk sporcuya çocukla çalışmayan uzman önerilmez), aynı şehir 20 (yalnız online 15),
// hedef uzmanlıkla örtüşüyor 15, boş yer 10 (dolu uzman listenin sonuna iner).
export function uzmanPuan(u, istek, { dolu = 0, sehir = "" } = {}) {
  if (!u || u.durum === "pasif" || u.brans !== istek?.brans) return null;
  let puan = 0;
  const neden = [bransAd(u.brans)];
  const spor = sporOf(istek.spor);
  const sporlar = u.sporlar || [];
  if (!sporlar.length || sporlar.includes("hepsi")) puan += 15;
  else if (spor && sporlar.includes(spor)) (puan += 30), neden.push(sporAd(spor));
  const g = istek.yas ? yasGrubu(istek.yas) : "";
  const yaslar = u.yas || [];
  if (g === "cocuk" && yaslar.length && !yaslar.includes("cocuk")) return null;
  if (!g) puan += 12;
  else if (!yaslar.length || yaslar.includes(g)) (puan += 25), neden.push(`${yasAd(g).toLocaleLowerCase("tr")} yaş grubu`);
  else neden.push(`${yasAd(g).toLocaleLowerCase("tr")} yaş grubu yok`);
  const s = kucuk(sehir || istek.sehir);
  if (s && kucuk(u.sehir) === s) (puan += 20), neden.push(u.online ? `${u.sehir} · online` : u.sehir);
  else if (u.online) (puan += 15), neden.push("online");
  else neden.push(u.sehir ? `${u.sehir}, online değil` : "online değil");
  const h = kucuk(istek.hedef);
  if (h && (u.alt || []).some((t) => kucuk(t).split(/\s+/).some((w) => w.length >= 4 && h.includes(w.slice(0, 5))))) (puan += 15), neden.push("hedefe uygun");
  const kap = Number(u.kapasite) || 0;
  const bos = kap ? kap - dolu : 1;
  if (bos > 0) (puan += 10), kap && neden.push(`${bos} boş yer`);
  else (puan -= 40), neden.push("dolu");
  return { puan: Math.max(0, Math.min(100, puan)), neden };
}

// İsteğe uygun uzmanlar, puanı yüksekten düşüğe
export function oneriler(uzmanlar, istek, istekler = [], opts = {}) {
  return uzmanlar
    .map((u) => ({ u, p: uzmanPuan(u, istek, { ...opts, dolu: doluluk(u.id, istekler) }) }))
    .filter((x) => x.p)
    .sort((a, b) => b.p.puan - a.p.puan || String(a.u.ad).localeCompare(String(b.u.ad), "tr"));
}

// Yeni uzman kaydının temizlenmesi (form)
export function uzmanTemizle(g = {}) {
  const ad = String(g.ad || "").trim().replace(/\s+/g, " ").slice(0, 60);
  if (ad.split(" ").filter((w) => w.length >= 2).length < 2) return { hata: "Adını ve soyadını yaz." };
  if (!g.brans) return { hata: "Branşı seç." };
  const liste = (v) => [...new Set((Array.isArray(v) ? v : []).map((x) => String(x).trim()).filter(Boolean))].slice(0, 20);
  return {
    veri: {
      ad,
      brans: String(g.brans),
      alt: liste(g.alt),
      sporlar: liste(g.sporlar),
      yas: liste(g.yas).filter((y) => YASLAR.some(([k]) => k === y)),
      sehir: String(g.sehir || "").trim().slice(0, 40),
      online: !!g.online,
      kapasite: Math.max(0, Math.min(200, Math.round(Number(g.kapasite) || 0))),
      tel: String(g.tel || "").trim().slice(0, 30),
      mail: String(g.mail || "").trim().toLowerCase().slice(0, 80),
      not: String(g.not || "").trim().slice(0, 300),
      durum: g.durum === "pasif" ? "pasif" : "aktif",
    },
  };
}

// Örnek veri (Seyhun "örnek bir data yap"): hepsi ornek: true, Admin'den tek dokunuşla silinir
export const ORNEK_UZMANLAR = [
  { id: "ornek-selin", ad: "Selin Er", brans: "fitness", alt: ["Kuvvet", "Kondisyon", "Patlayıcı güç"], sporlar: ["yelken", "kurek"], yas: ["genc", "yetiskin"], sehir: "İzmir", online: true, kapasite: 10 },
  { id: "ornek-baris", ad: "Barış Toprak", brans: "fitness", alt: ["Esneklik", "Sakatlık sonrası"], sporlar: [], yas: ["genc", "yetiskin"], sehir: "Muğla", online: false, kapasite: 6 },
  { id: "ornek-melis", ad: "Melis Çınar", brans: "fitness", alt: ["Çocuk kondisyonu", "Kondisyon"], sporlar: ["yelken"], yas: ["cocuk", "genc"], sehir: "Ankara", online: true, kapasite: 8 },
  { id: "ornek-onur", ad: "Onur Kılıç", brans: "yelken", alt: ["Optimist", "ILCA", "Taktik"], sporlar: ["yelken"], yas: ["cocuk", "genc"], sehir: "İzmir", online: false, kapasite: 8 },
  { id: "ornek-dila", ad: "Dila Yurt", brans: "beslenme", alt: ["Sporcu beslenmesi"], sporlar: [], yas: [], sehir: "", online: true, kapasite: 15, durum: "pasif" },
].map((u) => ({ durum: "aktif", tel: "", mail: "", not: "", uid: null, ornek: true, ...u }));
export const ORNEK_ISTEKLER = [
  { id: "ornek-istek-1", sporcuUid: "", sporcuAd: "Zeynep Ak (örnek)", by: "", brans: "fitness", spor: "yelken", yas: 12, uzmanId: null, sure: 3, hedef: "Kondisyon, yaz yarışları", ders: null, paylas: { acik: true, turler: ["antrenman", "yaris"] }, durum: "bekliyor" },
  { id: "ornek-istek-2", sporcuUid: "", sporcuAd: "Kerem Aydın (örnek)", by: "", brans: "fitness", spor: "yelken", yas: 16, uzmanId: "ornek-selin", sure: 1, hedef: "Kuvvet", ders: null, paylas: { acik: false, turler: [] }, durum: "atandi" },
].map((i) => ({ ornek: true, ...i }));

// Uzman sayfası: sporcunun paylaştığı planlar (yalnız izin verdiği türler, bugünden sonraki gün kadar).
// antrenman: fitness ve diğer antrenmanlar (yelken antrenmanı hariç), yelken: yelken antrenmanı (tür Antrenman), yaris: Yarış,
// tatil: başlığında tatil/izin geçen ya da tür Tatil, yemek: Beslenme (plan değil; şimdilik boş)
export function planTuru(p) {
  const cat = p?.cat || p?.category || "";
  const t = String(p?.title || "");
  if (/tatil|izin/i.test(t) || cat === "Tatil") return "tatil";
  if (cat === "Yarış") return "yaris";
  if (p?.fit || cat === "Fitness") return "antrenman";
  if (cat === "Antrenman") return "yelken";
  return "";
}
export function paylasilanPlanlar(plans = [], uid, paylas, bugun, gun = 21) {
  if (!uid || !paylas?.acik || !paylas.turler?.length) return [];
  const son = new Date(Date.parse(`${bugun}T12:00:00Z`) + gun * 864e5).toISOString().slice(0, 10);
  return plans
    .filter((p) => (p.people || []).includes(uid) || p.fit?.for === uid)
    .filter((p) => p.date && p.date >= bugun && p.date <= son && !p.deleted)
    .map((p) => ({ ...p, tur: planTuru(p) }))
    .filter((p) => p.tur && paylas.turler.includes(p.tur))
    .sort((a, b) => (a.date + (a.time || "")).localeCompare(b.date + (b.time || "")));
}
