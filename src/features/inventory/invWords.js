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

export function wantsInventory(text, here = false) {
  const t = lower(text);
  if (!t || t.split(" ").length > 60 || isInvNav(text)) return false;
  if (INV.test(t)) return true;
  return here && !OTHER.test(t);
}

// Silme onayı
export const isDrop = (text) => /^(vazgeç|iptal|gerek yok|istemiyorum|kalsın|silme|hayır)/.test(lower(text));
