// Görev listesinde art arda gelen mesaj işleri tek işte birleşir (Seyhun 2026-10-20: "ikisini birlikte izin alıp ikisini
// birlikte gönderebilir"). Birleşen cümle tek istekte yapay zekaya gider; dönen mesajlar (sends) tek kartta, tek onayla
// gönderilir (beyin/gorevListesi.js runStep → isler/mesaj.js prepareBatch).
// Kayıt sözü geçen iş (not, görev, plan, takvim) mesaj sayılmaz: "notlara yaz" bir nottur.
const MSG = /(^|\s)(mesaj\S*|yaz|yazar\s+mısın|gönder\S*|ilet|haber\s+ver\S*|duyur\S*|bildir)(?=$|[\s.,!?])/i;
const RECORD = /(^|\s)(not\S*|görev\S*|plan\S*|takvim\S*|hatırlat\S*|envanter\S*|gönderi\S*|instagram)(?=$|[\s.,!?])/i;

export const isMessageTask = (t) => !!t && MSG.test(String(t.say || "").toLocaleLowerCase("tr-TR")) && !RECORD.test(String(t.say || "").toLocaleLowerCase("tr-TR"));

export function mergeMessageTasks(tasks = []) {
  const out = [];
  for (const t of tasks) {
    const prev = out.at(-1);
    if (prev && isMessageTask(prev) && isMessageTask(t)) {
      const n = (prev.n || 1) + 1;
      out[out.length - 1] = { ...prev, say: `${prev.say.replace(/[.\s]+$/, "")}. Ayrıca ${t.say}`, label: `${n} mesaj`, n, act: undefined, args: undefined };
    } else out.push(t);
  }
  return out;
}
