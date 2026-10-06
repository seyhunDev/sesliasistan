// Asistanın yapabildiği işlerin listesi (src/lib/assistTasks.js) Markdown olarak: node scripts/gorev-listesi.mjs > gorev-listesi.md
import { TASKS } from "../src/lib/assistTasks.js";

const WHO = { herkes: "Herkes", ana: "Yalnız ana hesap", sporcu: "Sporcu yetkisi olan", "yönetici": "Sporcu/veli dışı" };
const BY = { yerel: "Anında (yapay zekasız)", yz: "Yapay zeka (görev listesi)", "yz-ayrı": "Yapay zeka (kendi akışı)" };
const out = ["# Asistanın yapabildiği işler", "", "Her işin örnek cümlesi, kimin kullanabildiği, nasıl yapıldığı, onay isteyip istemediği ve asistanın o işte söylediği/gösterdiği ara yazı. Liste koddan üretilir (`src/lib/assistTasks.js`, `node scripts/gorev-listesi.mjs`).", ""];
for (const g of [...new Set(TASKS.map((x) => x.group))]) {
  out.push(`## ${g}`, "", "| İş | Örnek | Kim | Nasıl | Onay | Asistan der / gösterir |", "|---|---|---|---|---|---|");
  for (const x of TASKS.filter((t) => t.group === g)) {
    // Yapay zekanın görev listesindeki işlerde önce kısa cümle söylenir; kendi akışı olan işlerde adım yazısı görünür
    const cue = x.by === "yz" ? `${x.doing} · ${x.work}…` : x.work ? `${x.work}…` : "Sonucu söyler";
    out.push(`| ${x.name} | “${x.say}” | ${WHO[x.who]} | ${BY[x.by]} | ${x.confirm ? "Evet" : "Hayır"} | ${cue} |`);
  }
  out.push("");
}
console.log(out.join("\n"));
