// Tanıtımdaki "Velora'ya katıl" başvurusu (Seyhun 2026-11-26): alan kontrolleri tek yerde. Tarayıcıdaki form (tanıtım) ve
// sunucu (/api/basvuru) aynı kuralları kullanır. Telefon şimdilik yalnız Türkiye cep: +90 sabit, başında 0 yok, 5 ile başlar, 10 hane.
// Netlify işlevleri ve testler de içe aktarır: "@/" içe aktarması yok.

export const ROLLER = ["Antrenör", "Kulüp", "Sporcu", "Veli"];

const dig = (v) => String(v || "").replace(/\D/g, "");
// 532 123 45 67
export const telYaz = (d) => [d.slice(0, 3), d.slice(3, 6), d.slice(6, 8), d.slice(8, 10)].filter(Boolean).join(" ");

// Sık yapılan e-posta yazım hataları: "Düzelt" önerisi
export const TYPO = {
  "gmial.com": "gmail.com", "gmal.com": "gmail.com", "gmail.co": "gmail.com", "gmail.con": "gmail.com", "gamil.com": "gmail.com",
  "hotmial.com": "hotmail.com", "hotmal.com": "hotmail.com", "hotmail.co": "hotmail.com", "outlok.com": "outlook.com",
  "yaho.com": "yahoo.com", "icloud.co": "icloud.com", "iclod.com": "icloud.com",
};

// Her kontrol: hata yoksa "", varsa kısa Türkçe uyarı. E-posta yazım hatasında { t, fix }.
export function adHata(v) {
  v = String(v || "").trim().replace(/\s+/g, " ");
  if (!v) return "Adını ve soyadını yaz.";
  if (v.length > 60) return "Ad soyad çok uzun.";
  if (!/^[\p{L}][\p{L}' .-]*$/u.test(v)) return "Yalnız harf kullan.";
  return v.split(" ").filter((x) => x.length >= 2).length < 2 ? "Adını ve soyadını birlikte yaz." : "";
}

export function telHata(raw) {
  raw = String(raw || "");
  const d = dig(raw);
  if (!d) return "Cep telefonunu yaz.";
  if (/^\s*\+/.test(raw) || (d.startsWith("90") && d.length > 10)) return "+90 zaten var, numaranın kendisini yaz.";
  if (d[0] === "0") return "Başındaki 0 olmadan yaz: 5xx xxx xx xx";
  if (d[0] !== "5") return "Cep numarası 5 ile başlar.";
  if (d.length < 10) return `Numara 10 hane olmalı, ${d.length} hane yazdın.`;
  if (d.length > 10) return "Numara 10 haneden uzun.";
  if (/^5(\d)\1{8}$/.test(d) || d === "5123456789") return "Gerçek bir numara yaz.";
  return "";
}

export function mailHata(v) {
  v = String(v || "").trim();
  if (!v) return "E-postanı yaz.";
  if (/\s/.test(v)) return "E-postada boşluk olmaz.";
  if (v.length > 80) return "E-posta çok uzun.";
  const m = v.match(/^([A-Za-z0-9._%+-]+)@([A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,})$/);
  if (!m || /\.\./.test(v) || /^\.|\.@/.test(v)) return "E-posta ornek@mail.com gibi olmalı.";
  const dm = m[2].toLowerCase();
  if (TYPO[dm]) return { t: `${dm} mi? Doğrusu ${TYPO[dm]} olabilir.`, fix: `${m[1]}@${TYPO[dm]}` };
  return "";
}

export const kulupHata = (v) => {
  v = String(v || "").trim();
  if (v.length < 3) return "Kulübünü ve şehrini yaz.";
  return v.length > 80 ? "Kulüp ve şehir çok uzun." : "";
};

const msg = (r) => (r && typeof r === "object" ? r.t : r);

// Sunucuda: gelen başvuruyu temizler. { ok, hatalar: { alan: uyarı }, veri }
// veri.tel "+905321234567" biçiminde; rol listede yoksa ilk rol (Antrenör) değil, hata.
export function basvuruTemizle(g = {}) {
  const hatalar = {};
  const ad = String(g.ad || "").trim().replace(/\s+/g, " ");
  const tel = String(g.tel || "");
  const mail = String(g.mail || "").trim();
  const kulup = String(g.kulup || "").trim().replace(/\s+/g, " ");
  const rol = String(g.rol || "");
  if (msg(adHata(ad))) hatalar.ad = msg(adHata(ad));
  if (telHata(tel)) hatalar.tel = telHata(tel);
  // Yazım hatası önerisi sunucuda engel değil (kişi "Düzelt"e basmadan da gönderebilir)
  const mh = mailHata(mail);
  if (typeof mh === "string" && mh) hatalar.mail = mh;
  if (kulupHata(kulup)) hatalar.kulup = kulupHata(kulup);
  if (!ROLLER.includes(rol)) hatalar.rol = "Kim olduğunu seç.";
  if (Object.keys(hatalar).length) return { ok: false, hatalar };
  return { ok: true, hatalar, veri: { ad, tel: `+90${dig(tel)}`, mail: mail.toLowerCase(), kulup, rol } };
}

// +905321234567 -> "+90 532 123 45 67"
export const telGoster = (t) => (String(t || "").startsWith("+90") ? `+90 ${telYaz(String(t).slice(3))}` : String(t || ""));
