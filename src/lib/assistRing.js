// Asistanın ilerleme halkası (Seyhun'un onayladığı örnek, 2026-10-17; /mnt/project-files/asistan/halka-ornek.png):
// dinlerken kırmızı halka ve ses çubukları, düşünürken kehribar (az dolu), işler yapılırken işlerin sayısıyla dolar
// ("2 / 3"), bitince yeşil tam halka ve onay işareti ("Tamam", "3 iş bitti"). Saf işlev: ekran yalnız sonucu çizer.

const DONE = new Set(["done", "fail", "skip"]);

// list: görev listesi ya da adımlar [{ label, st }]; ilerleme = (bitenler + sürmekte olanın yarısı) / toplam
export function progressOf(list = []) {
  const total = list.length;
  const done = list.filter((x) => DONE.has(x.st)).length;
  const run = list.some((x) => x.st === "run");
  return { total, done, run, fill: total ? Math.min(1, (done + (run ? 0.5 : 0)) / total) : 0 };
}

// state: listening | busy | speaking | idle; status: şu an yapılan işin yazısı; talked: sohbette en az bir tur var;
// shown: liste ekranda görünüyor (görev listesi): süren işin adı orada parlıyor, halkada ikinci kez yazılmaz.
// Çalışırken durum yazısı yalnız halkada (Seyhun: "çalışırken iki farklı yerde bilgilendirme mesajları oluyor", 2026-10-17)
export function ringOf({ state = "idle", transcribing = false, status = "", list = [], talked = false, shown = false } = {}) {
  const p = progressOf(list);
  if (state === "listening") return { tone: "listen", fill: 0, label: "Dinliyorum", sub: "", bars: true };
  if (state === "busy" || transcribing) {
    if (p.total > 1) return { tone: "work", fill: Math.max(0.08, p.fill), label: (!shown && status) || "Yapıyorum", sub: `${Math.min(p.total, p.done + (p.run ? 1 : 0)) || 1} / ${p.total}` };
    if (status && !transcribing) return { tone: "work", fill: 0.12, label: "Yapıyorum", sub: status, creep: true };
    return { tone: "work", fill: 0.12, label: "Düşünüyorum", sub: transcribing ? "" : "İstek inceleniyor", creep: true };
  }
  if (state === "speaking") return { tone: "speak", fill: 1, label: "Anlatıyorum", sub: "" };
  if (!talked) return { tone: "idle", fill: 0, label: "", sub: "" };
  if (p.total < 2) return { tone: "ok", fill: 1, label: "Tamam", sub: "", check: true };
  const bad = list.filter((x) => x.st === "fail").length;
  const ok = list.filter((x) => x.st === "done").length;
  return { tone: "ok", fill: 1, label: "Tamam", sub: bad ? `${ok} iş bitti, ${bad} olmadı` : `${ok} iş bitti`, check: true };
}
