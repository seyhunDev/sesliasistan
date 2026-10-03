// Yoklamada gelmeyen sporcunun velisine haber: metin ve WhatsApp numarası (saf fonksiyonlar, test edilir)

// "0532 123 45 67", "+90 532…", "532…" → "905321234567"; geçersizse ""
export function waPhone(raw) {
  let d = String(raw || "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.length === 11 && d.startsWith("0")) d = `90${d.slice(1)}`;
  if (d.length === 10 && d.startsWith("5")) d = `90${d}`;
  return /^90\d{10}$/.test(d) ? d : "";
}

const first = (name) => String(name || "").trim().split(/\s+/)[0] || "";
function dayWord(date, today) {
  if (date === today) return "bugünkü";
  return `${new Date(`${date}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "long" })} günkü`;
}

// "Merhaba, Ali bugünkü antrenmana gelmedi. Bir sorun varsa bize haber verebilir misiniz? Dikili Yelken Spor Kulübü"
export function absentText(name, date, today, club = "Dikili Yelken Spor Kulübü") {
  return `Merhaba, ${first(name)} ${dayWord(date, today)} antrenmana gelmedi. Bir sorun varsa bize haber verebilir misiniz?${club ? ` ${club}` : ""}`;
}

// Bildirim (uygulamada hesabı olan veliye): başlık + kısa metin
export const absentPush = (name, date, today) => ({ title: `Devamsızlık: ${first(name)}`, body: `${first(name)} ${dayWord(date, today)} antrenmana gelmedi.` });

export const waTo = (phone, text) => `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
