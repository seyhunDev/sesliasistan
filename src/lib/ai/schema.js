import { matchPerson, namesInMessage } from "@/lib/names";
import { z } from "zod";
import { cleanTitle } from "@/lib/titleClean";

export const CATEGORIES = ["Antrenman", "Toplantı", "Kamp", "Yarış", "Ekipman", "Genel"];

// Claude'a verilen araç: çıktı bu şemaya uymak zorunda
export const TOOL = {
  name: "kaydet",
  description: "Kullanıcının söylediklerini plan, görev ve notlara ayırır ve kısa bir yanıt yazar.",
  input_schema: {
    type: "object",
    properties: {
      message: {
        type: "string",
        description: "Kullanıcıya 1-2 cümlelik Türkçe yanıt: ne anladığını söyle. Kritik bilgi eksikse (planın günü, tek günlük planın saati) kısa bir soru sor.",
      },
      items: {
        type: "array",
        items: {
          type: "object",
          properties: {
            type: { type: "string", enum: ["plan", "task", "note"] },
            title: { type: "string", description: "Kısa başlık: yalnız konu (\"Akşam yemeği\"); \"bana\", \"benim için\", \"lütfen\", gün/saat sözleri girmez" },
            body: { type: "string", description: "Yalnızca not için: notun tam metni" },
            date: { type: "string", description: "YYYY-MM-DD ya da boş. Plan tarihi veya görev son tarihi." },
            endDate: { type: "string", description: "Çok günlü plan için bitiş, YYYY-MM-DD ya da boş" },
            time: { type: "string", description: "24 saatlik HH:MM ya da boş (yalnızca plan). Saat uydurma." },
            allDay: { type: "boolean", description: "Yalnızca plan: kullanıcı 'tüm gün', 'fark etmez', 'saat yok' dediyse true" },
            place: { type: "string", description: "Yer (yalnızca plan) ya da boş" },
            weekly: { type: "boolean", description: "Yalnızca plan: 'her salı', 'her hafta', 'salıları' gibi haftalık tekrar söylendiyse true; date ilk günü olur" },
            repeatUntil: { type: "string", description: "Yalnızca haftalık plan: tekrarın son günü YYYY-MM-DD ('yıl sonuna kadar', 'Aralık'a kadar') ya da boş" },
            category: { type: "string", enum: CATEGORIES },
            linkToPlan: { type: "boolean", description: "Aynı ifadedeki plana bağlı görev/not ise true" },
            assignTo: {
              type: "array",
              items: { type: "string" },
              description: "Sorumlu kişiler: yalnızca verilen kişi listesindeki adlar, listedeki yazımla. İş birine verilmediyse boş dizi.",
            },
          },
          required: ["type", "title"],
        },
      },
      send: {
        type: "string",
        description: "Yalnızca kayıt içinden (düzenleme) çağrıldığında: kaydın konuşmasına gönderilecek mesaj metni. Mesaj istenmediyse boş.",
      },
      done: { type: "boolean", description: "Yalnızca kayıt içinden: kullanıcı işi bitirdiğini söylediyse true" },
    },
    required: ["items", "message"],
  },
};

// Kayıt içinden gelen mesaj taslağı: tek paragraf, en çok 1000 karakter
export const cleanSend = (m) => (typeof m === "string" ? m.replace(/\s+/g, " ").trim().slice(0, 1000) : "");

const D = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal("")).catch("");
const T = z.string().regex(/^\d{2}:\d{2}$/).or(z.literal("")).catch("");
const S = z.string().catch("");

const Item = z.object({
  type: z.enum(["plan", "task", "note"]),
  title: z.string().min(1),
  body: S,
  date: D,
  endDate: D,
  time: T,
  allDay: z.boolean().catch(false),
  place: S,
  weekly: z.boolean().catch(false),
  repeatUntil: D,
  category: S,
  linkToPlan: z.boolean().catch(false),
  assignTo: z.array(z.string()).optional().catch(undefined),
});

export const cleanMessage = (m) => (typeof m === "string" ? m.trim().slice(0, 300) : "");

// Adları kişi listesindeki yazımına çevirir: ekli ("Sanver'e"), soyadsız, ses tanıma hatalı yazımlar da eşleşir; eşleşmeyen atılır
function canon(names, people) {
  const out = [];
  for (const n of names) {
    const hit = matchPerson(n, people);
    if (hit && !out.includes(hit)) out.push(hit);
  }
  return out;
}

// Claude/Gemini çıktısını doğrular ve arayüzün kullandığı taslak biçimine çevirir
// people: çalışan adları; verildiyse her kayda assignTo (sorumlular) eklenir.
// message: yapay zekanın mesajı; "görevi Sanver'e verdim" deyip sorumluyu boş bıraktıysa oradan tamamlanır
export function toDrafts(raw, people = [], message = "") {
  const items = (Array.isArray(raw) ? raw : [])
    .map((x) => Item.safeParse(x))
    .filter((r) => r.success)
    .map((r) => r.data);

  const drafts = items.map((i) => ({
    type: i.type,
    title: i.type === "note" ? i.title.trim() : cleanTitle(i.title),
    body: i.type === "note" ? (i.body || i.title).trim() : "",
    date: i.type === "note" ? "" : i.date,
    endDate: i.type === "plan" ? i.endDate : "",
    time: i.type === "plan" ? i.time : "",
    allDay: i.type === "plan" ? !!i.allDay && !i.time : false,
    place: i.type === "plan" ? i.place : "",
    ...(i.type === "plan" && i.weekly && !i.endDate ? { repeat: "week", repeatUntil: i.repeatUntil } : {}),
    cat: CATEGORIES.includes(i.category) ? i.category : "Genel",
    link: i.linkToPlan,
    ...(people.length ? { assignTo: canon(i.assignTo || [], people) } : {}),
  }));

  if (people.length && drafts.length && drafts.every((d) => !d.assignTo?.length)) {
    const said = namesInMessage(message, people);
    if (said.length) drafts.forEach((d) => (d.assignTo = said));
  }

  const plan = drafts.find((d) => d.type === "plan");
  drafts.forEach((d) => {
    if (d.type === "plan") return;
    d.link = !!plan && d.link;
    if (d.link && d.type === "task" && !d.date) d.date = plan.date; // bağlı görevin tarihi plan tarihi
  });
  return drafts;
}
