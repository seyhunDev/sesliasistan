// Asistanda envanter cümleleri (yapay zekaya gitmeden tanınır).
// Her yerde: "envantere 3 telsiz ekle", "demirbaşlara yazıcı ekle", "envanterden 2 şamandıra çıkar", "envanterde kaç tekne var".
// Envanter sayfasında: başka bir işe benzemeyen her cümle ("2 can yeleği kayboldu", "Optimist 4 bakımda").

const lower = (s) => String(s || "").toLocaleLowerCase("tr-TR").replace(/[.,!?;:"“”()]/g, " ").replace(/\s+/g, " ").trim();

const INV = /(^|\s)(envanter\S*|demirbaş\S*|stok(ta|tan|a|u|lar\S*|umuz\S*|lara)?)(?=\s|$)/;
// Yalnız sayfa açma: "envanteri aç", "envanter sayfasına git", "envanter"
const NAV = /^(?:(?:hadi|şimdi|bir)\s+)?(?:yelken kulübü |kulüp |normal )?(?:envanter|demirbaş)\S*(?: sayfa\S*| ekran\S*)?(?: (?:aç|git|göster|gel|geç)\S*)?(?: lütfen)?$/;
// Sayfadayken başka işler (envanter sözcüğü yoksa): plan, görev, mesaj, not, yoklama…
const OTHER = /(^|\s)(antrenman\S*|toplantı\S*|takvim\S*|plan|planı|planla\S*|planlara|görev\S*|hatırlat\S*|mesaj\S*|whatsapp\S*|yaz|yazar mısın|yazsana|notlara|notlar|yoklama\S*|aidat\S*|instagram\S*|gönderi\S*|doğum günü\S*|alışveriş\S*|listeye)(?=\s|$)|not (al|düş)|kişi ekle/;

export const isInvNav = (text) => NAV.test(lower(text));

// Açıkça kayıt istenen cümle: "plan yap", "takvime ekle", "hatırlat", "görev ekle", "not al", "mesaj at", "Ali'ye yaz"
const RECORD = /(^|\s)(plan(ı|a)? (yap|ekle|oluştur|kur|aç)\S*|planla\S*|takvime|hatırlat\S*|görev(i)? (ekle|oluştur|ver|aç|yaz)\S*|not (al|düş)\S*|notlara|mesaj (at|yaz|gönder)\S*|haber ver\S*)(?=\s|$)|('|’)(ye|ya|e|a) (yaz|söyle)(?=\s|$)/;
// Envantere yönelik iş: "envantere … ekle", "envanterden … çıkar", "envanterde kaç …", "stoktan", "demirbaşlara"
const INV_OP = /(^|\s)(envanter(e|den|de|deki|i|ime|imden|imde|ine|inden|inde)|demirbaş(a|lara|tan|lardan|ta|larda)|sto(ğa|ktan|kta))(?=\s|$)/;

export function wantsInventory(text, here = false) {
  const t = lower(text);
  if (!t || t.split(" ").length > 60 || isInvNav(text)) return false;
  // "yarın 5'e plan yap, envanter listesi çıkarılacak": envanter sözcüğü geçse de iş plandır (Seyhun, 2026-10-06);
  // yalnız "envantere/envanterden …" gibi envantere yönelik cümle envantere gider
  if (RECORD.test(t) && !INV_OP.test(t)) return false;
  if (INV.test(t)) return true;
  return here && !OTHER.test(t);
}

// Silme onayı
export const isDrop = (text) => /^(vazgeç|iptal|gerek yok|istemiyorum|kalsın|silme|hayır)/.test(lower(text));
