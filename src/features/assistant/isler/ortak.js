// Asistanın ekranı ve işleri arasında ortak küçük yardımcılar
import { isQuestion } from "@/lib/steps";

export const RECORD_TO = "Bu kaydın konuşması";
// Belirli bir numaraya WhatsApp mesajı (uygulamada hesabı olmayan kişi)
export const waTo = (phone, text) => `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
export const TEAM_WORD = /^(ekip|ekibe|herkes|herkese|grup|gruba|ekip grubu|aile|aileye|sporcu|sporcular|sporculara|veli|veliler|velilere)/i;
// Söylenen grup adı → sabit grup ("ekibe" → team, "aileye" → family, "sporculara" → athletes; "herkese" → ilk grubum)
export const groupOf = (t, mine = []) => {
  const s = String(t || "").toLocaleLowerCase("tr-TR");
  const g = /^aile/.test(s) ? "family" : /^(sporcu|veli)/.test(s) ? "athletes" : /^(ekip|ekib)/.test(s) ? "team" : mine[0] || "";
  return mine.includes(g) ? g : "";
};
// Taslak varken sorulan soru taslağı değiştirmesin, asistana gitsin
// Soru mu ("kaç görev var", "haftayı özetle"): \b Türkçe harfle biten kelimede çalışmadığı için isQuestion (steps.js) kullanılır
export const QUESTION = { test: (s) => isQuestion(s) || /(?<![\p{L}])(ne var|göster\p{L}*|listele\p{L}*|özetle\p{L}*)(?![\p{L}])/u.test(String(s || "").toLocaleLowerCase("tr-TR")) };
