// Hedefe göre 8 haftalık gerçekçi tahmin (tanıtım kartları): boy, kilo, yaş, cinsiyet ve seviyeye göre.
// Sayılar genel spor bilimi aralıkları (güvenli kilo kaybı haftada 0,25-0,5 kg; yeni başlayanda ayda ~0,5-1 kg kas),
// kesin değil; kartta "yaklaşık" diye gösterilir. Boy ya da kilo yoksa null (kart genel bilgiyle kalır).

const r1 = (n) => Math.round(n * 10) / 10;
const half = (n) => Math.round(n * 2) / 2;
const tr = (n) => String(n).replace(".", ",");

export const hasBody = (p) => !!(p?.height && p?.weight);

export function bmiOf(p) {
  if (!hasBody(p)) return 0;
  return r1(p.weight / (p.height / 100) ** 2);
}

export function bmiText(b) {
  if (!b) return "";
  if (b < 18.5) return "Zayıf";
  if (b < 25) return "Sağlıklı";
  if (b < 30) return "Fazla kilolu";
  return "Obez";
}

// { now, then, sub } — kartın üstündeki "şu an → 8 hafta sonra" kutusu
export function forecast(goal, p = {}, weeks = 8) {
  if (!hasBody(p)) return null;
  const w = p.weight;
  const b = bmiOf(p);
  const lvl = p.level || "yeni";
  if (goal === "kilo") {
    if (b < 21) return { now: `Şu an ${tr(w)} kg`, then: "Kilon sağlıklı", sub: "Kilo vermek yerine sıkılaşmayı hedefle." };
    const lo = half(w - Math.min(0.5, w * 0.007) * weeks);
    const hi = half(w - 0.25 * weeks);
    return { now: `Şu an ${tr(w)} kg`, then: `≈ ${tr(lo)}-${tr(hi)} kg`, sub: `${weeks} haftada. Alt sınır beslenmeye de dikkat edersen.` };
  }
  if (goal === "kas") {
    let m = { yeni: 0.9, orta: 0.5, ileri: 0.25 }[lvl] || 0.9;
    if (p.sex === "k") m *= 0.5;
    else if (p.sex !== "e") m *= 0.75;
    if (p.age > 40) m *= 0.8;
    const months = weeks / 4.33;
    const lo = Math.max(0.5, half(m * months * 0.6));
    const hi = Math.max(lo, half(m * months));
    return { now: `Şu an ${tr(w)} kg`, then: lo === hi ? `+${tr(lo)} kg kas` : `+${tr(lo)}-${tr(hi)} kg kas`, sub: `${weeks} haftada, yeterli protein ve uykuyla.` };
  }
  if (goal === "guc") {
    const g = { yeni: "%25-40", orta: "%10-20", ileri: "%5-10" }[lvl] || "%25-40";
    return { now: "Bugünkü ağırlıkların", then: `${g} daha ağır`, sub: `${weeks} haftada squat, şınav gibi temel hareketlerde.` };
  }
  if (goal === "kondisyon") {
    const h = { yeni: "5-8", orta: "3-5", ileri: "2-3" }[lvl] || "5-8";
    return { now: "Dinlenik nabzın", then: `≈ ${h} atım daha sakin`, sub: `${weeks} haftada; aynı tempoda daha uzun dayanırsın.` };
  }
  // saglik: VKİ şimdi ve hafif kayıpla (haftada 0,25 kg, yalnız sağlıklı aralığın üstündeyse)
  const nw = b > 25 ? w - 0.25 * weeks : w;
  const nb = r1(nw / (p.height / 100) ** 2);
  return {
    now: `Şu an VKİ ${tr(b)} · ${bmiText(b)}`,
    then: nb === b ? "Formunu korursun" : `≈ VKİ ${tr(nb)}`,
    sub: "Haftada 150 dakika hareket, sağlık için önerilen hedef.",
  };
}
