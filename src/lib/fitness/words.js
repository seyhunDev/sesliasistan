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
export function fitLocal(raw) {
  const t = fold(raw).replace(/'/g, "");
  if (!t) return null;
  if (/\bprogram\w*\b.*\b(planlar\w*|takvim\w*)\b.*\b(kaldir\w*|sil\w*|cikar\w*)\b/.test(t)) return { op: "unplan" };
  if (/\b(planlar\w*|takvim\w*)\b.*\b(ekle\w*|isle\w*|koy\w*|yaz\b|aktar\w*)\b/.test(t) && !/\b(set|tekrar|kilo|gun\w* yap)\b/.test(t)) return { op: "plans" };
  if (/\bkac\b.*\b(antrenman\w*|fitness\w*|idman\w*|gun)\b.*\b(yaptim|yapmisim|yaptik|kacirdim)\b|\b(bu hafta|bu ay)\b.*\bdurum\w*\b/.test(t)) return { op: "stats" };
  // Hareket ya da sayı söylendiyse ayrıntılı sonuçtur (yapay zeka ayırır)
  if (/\d|\b(set|tekrar|kilo)\b/.test(t)) return null;
  if (/\b(atladim|yapamadim|yapmadim|kacirdim|gidemedim|gitmedim|atla|atlandi)\b/.test(t)) return { op: "skip" };
  if (/\b(yaptim|bitirdim|tamamladim|yapildi|bitti|tamamlandi)\b/.test(t) && /\b(antrenman\w*|fitness\w*|idman\w*|egzersiz\w*|bugunku\w*|programi?)\b/.test(t)) return { op: "done" };
  return null;
}
