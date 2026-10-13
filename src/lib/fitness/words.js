// Fitness ana asistanla (sayfanın kendi dinleyicisi yok): bu cümle fitness işi mi? Yapay zekasız, yalnız sözcüklere bakar.
// Her yerde: "fitness", "egzersiz", "spor salonu", "vücut geliştirme", ya da hareket + sayı ("squat 3 set 10 tekrar 60 kilo yaptım").
// Fitness sayfasında ya da açık fitness planında: başka iş olmayan her cümle ("çarşambayı bacak günü yap", "bugünkünü yaptım").
// Yelken antrenmanı ("antrenman günlüğü", "14 knot") fitness değildir.
import { fold } from "./exercises";

const FIT_W = /\b(fitness?\w*|fitnes\w*|egzersiz\w*|spor salon\w*|salon antrenman\w*|vucut gelistirme\w*|workout\w*|gym\w*|kardiyo\w*)\b/;
const EX_W = /\b(squat\w*|skuat\w*|sinav\w*|mekik\w*|plank\w*|barfiks\w*|deadlift\w*|bench\w*|lunge\w*|biceps\w*|triceps\w*|dambil\w*|halter\w*|burpee\w*|leg press\w*|lat pull\w*|omuz press\w*|kalca kopru\w*|hip thrust\w*)\b/;
const NUM_W = /\b\d+\s*(set|tekrar|kilo|kg|sn|saniye|dakika|dk)\b|\b(set|tekrar)\b/;
const SAIL = /\b(knot|not\b.*ruzgar|ruzgar|yelken|optimist|ilca|tramola|kavanca|start calis\w*|gunlug\w*|yoklama\w*)\b/;
// Fitness sayfasında bile başka iş olan cümleler (mesaj, görev, not, yoklama) ana akışa gider
const OTHER = /\b(mesaj\w*|yaz\b|soyle\w*|haber ver\w*|gonder\w*|gorev\w*|not al\w*|notlara\w*|hatirlat\w*|yoklama\w*|whatsapp\w*)\b/;
// Sayfa açma ("fitness'ı aç") sayfa geçişidir
const NAV = /^(fitness?|fitnes)\w*( [iua])?( sayfa\w*| ekran\w*)? (ac\w*|goster\w*|git|gec\w*|getir\w*)( lutfen)?$/;

export function wantsFitness(raw, here = false) {
  const t = fold(raw).replace(/'/g, "");
  if (!t || NAV.test(t)) return false;
  if (FIT_W.test(t)) return true;
  if (SAIL.test(t)) return false;
  if (EX_W.test(t) && (NUM_W.test(t) || /\b(yaptim|yapildi|yaptik|ekle|cikar|program\w*)\b/.test(t))) return true;
  return here && !OTHER.test(t);
}

// Yapay zekaya gitmeden yapılanlar (yalnız fitness cümlesinde). Dönüş: { op } | null
//   plans: "programı planlara ekle" · unplan: "programı planlardan kaldır" · done: "bugünkü antrenmanı yaptım"
//   skip: "bugünkü antrenmanı atladım" · stats: "bu hafta kaç antrenman yaptım"
//   athletes (ana hesap): "sporcular bugün antrenman yaptı mı" · today: "bugünkü antrenmanım ne" · start: "antrenmana başla"
export function fitLocal(raw) {
  const t = fold(raw).replace(/'/g, "");
  if (!t) return null;
  if (/\bfitness\w*\b.*\bsifirla\w*|\bsifirla\w*\b.*\bfitness\w*|\b(butun|tum)\b.*\bfitness\w*\b.*\bsil\w*/.test(t)) return { op: "reset" };
  if (/\bprogram\w*\b.*\b(planlar\w*|takvim\w*)\b.*\b(kaldir\w*|sil\w*|cikar\w*)\b/.test(t)) return { op: "unplan" };
  if (/\b(planlar\w*|takvim\w*)\b.*\b(ekle\w*|isle\w*|koy\w*|yaz\b|aktar\w*)\b/.test(t) && !/\b(set|tekrar|kilo|gun\w* yap)\b/.test(t)) return { op: "plans" };
  if (/\bkac\b.*\b(antrenman\w*|fitness\w*|idman\w*|gun)\b.*\b(yaptim|yapmisim|yaptik|kacirdim)\b|\b(bu hafta|bu ay)\b.*\bdurum\w*\b/.test(t)) return { op: "stats" };
  if (/\bsporcu\w*\b.*\b(fitness\w*|antrenmanlar\w*|antrenman\w* (yapt\w*|yapma\w*))|\bkim(ler)?\b.*\b(fitness\w*|antrenman\w*)\b.*\b(yapt\w*|yapma\w*)\b/.test(t) && !/\bprogram\w*\b.*\b(hazirla\w*|yap\b|olustur\w*)/.test(t)) return { op: "athletes" };
  // Hareket ya da sayı söylendiyse ayrıntılı sonuçtur (yapay zeka ayırır)
  if (/\d|\b(set|tekrar|kilo)\b/.test(t)) return null;
  if (/\b(atladim|yapamadim|yapmadim|kacirdim|gidemedim|gitmedim|atla|atlandi)\b/.test(t)) return { op: "skip" };
  if (/\b(yaptim|bitirdim|tamamladim|yapildi|bitti|tamamlandi)\b/.test(t) && /\b(antrenman\w*|fitness\w*|idman\w*|egzersiz\w*|bugunku\w*|programi?)\b/.test(t)) return { op: "done" };
  if (/\b(antrenman\w*|idman\w*|fitness\w*|egzersiz\w*)\b.*\b(basla\w*|baslat\w*)\b|^(hadi )?basla(yalim|yayim|t)?$/.test(t)) return { op: "start" };
  if (/\b(antrenman\w*|idman\w*|fitness\w*|program\w*)\b.*\b(ne|neler|nedir|ne var|var mi|hangi\w*)\b|\bne calis\w*|\bhangi hareket\w*/.test(t) && !/\bsporcu\w*/.test(t)) return { op: "today" };
  return null;
}

// Adım adım antrenman ekranı açıkken söylenenler. Dönüş: { op } | null
//   done: "tamam", "tamamlandı", "sonraki", "devam" (set yapıldı; dinlenirken dinlenmeyi bitirir) · skip: "bu hareketi atla"
//   more: "15 saniye ekle", "biraz daha dinlen" · how: "nasıl yapılır" · finish: "antrenmanı bitir" · feel: "zor geçti" (k 1-3)
export function guideWord(raw) {
  const t = fold(raw).replace(/'/g, "").trim();
  if (!t || t.split(" ").length > 7) return null;
  if (/\bnasil (yapil|yapar|yapac)\w*/.test(t)) return { op: "how" };
  if (/\b(15|on bes|onbes) (sn|saniye)\b|\bbiraz daha dinlen\w*|\bdinlen\w* (uzat|ekle)\w*/.test(t)) return { op: "more" };
  if (/\b(antrenman\w*|idman\w*) (bitir\w*|bitti)\b|^bitirelim$|^bitir$/.test(t)) return { op: "finish" };
  const f = t.match(/\b(zor|iyi|kolay)\w*\b( gecti| geldi)?$/);
  if (f && (f[2] || t.split(" ").length <= 2)) return { op: "feel", k: { zor: 1, iyi: 2, kolay: 3 }[f[1]] };
  if (/\b(atla\w*|hareket\w* gec\w*|sonraki harekete gec\w*|bunu gec\w*|yapamiyorum)\b/.test(t)) return { op: "skip" };
  if (/^(tamam\w*|tamamlandi|tamamladim|bitti|bitirdim|yaptim|yapildi|oldu|sonraki\w*|devam\w*|hazirim|gec|gectim|evet|basla\w*|hadi|ok|okey)( (tamam\w*|set\w*|seti|bitti|yaptim|devam\w*|lutfen|ettim|edelim))*$|^(set\w*|seti) (tamam\w*|bitti|bitirdim|yaptim|yapildi)$/.test(t)) return { op: "done" };
  return null;
}

// Cümlede geçen sporcu (ana hesap: "Ali için program hazırla", "Ali bu hafta kaç antrenman yaptı").
// people: [{ uid, name }]. Tam ad ya da tek kişiye uyan ilk ad; bulunamazsa null.
export function athleteIn(raw, people = []) {
  const t = ` ${fold(raw)} `;
  const names = people.map((a) => ({ a, f: fold(a.name).trim() })).filter((x) => x.f.length >= 3);
  const one = (list) => (list.length === 1 ? list[0].a : null);
  // Önce tam ad, sonra ad tam kelime ("Ali'nin" → "ali nin"), en son ad ekli yazılmış ("Aliye")
  return (
    one(names.filter((x) => x.f.includes(" ") && t.includes(` ${x.f} `))) ||
    one(names.filter((x) => t.includes(` ${x.f.split(" ")[0]} `))) ||
    one(names.filter((x) => x.f.split(" ")[0].length >= 3 && new RegExp(` ${x.f.split(" ")[0]}[a-z]{1,4} `).test(t)))
  );
}
// Sporcunun adı yapay zekaya gitmesin: cümleden çıkarılır ("Ali için" → "")
export function withoutName(raw, name) {
  let out = String(raw || "");
  for (const w of String(name || "").split(/\s+/).filter((x) => x.length >= 3)) out = out.replace(new RegExp(`${w}('?\\p{L}*)?( için| icin)?`, "giu"), " ");
  return out.replace(/\s+/g, " ").trim();
}
