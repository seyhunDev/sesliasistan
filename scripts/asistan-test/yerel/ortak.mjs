// Testlerin ortak parçaları: örnek veri (bugüne göre), grup yazıcı ve sonuç listesi.
// Her test dosyası suite("alan") ile kendi alanına yazar; calistir.mjs alanları ayrı ayrı gösterir.
import { todayStr } from "@/lib/utils/format";
import { addDate } from "@/lib/ai/digest";

export const today = todayStr(), tom = addDate(today, 1), y1 = addDate(today, -2);
export const data = {
  plans: [
    { id: "p1", title: "Optimist antrenmanı", date: today, time: "17:00", place: "Kulüp iskelesi", cat: "Antrenman" },
    { id: "p2", title: "Yönetim kurulu toplantısı", date: tom, time: "10:00", cat: "Toplantı" },
    { id: "p3", title: "Bölge yarışı", date: addDate(today, 3), time: "", cat: "Yarış" },
  ],
  tasks: [
    { id: "t1", title: "Tekneleri hazırla", due: today, done: false },
    { id: "t2", title: "Römork lastiklerini kontrol et", due: tom, done: false },
    { id: "t3", title: "Motor yağını değiştir", due: y1, done: false },
    { id: "t4", title: "Yelken onarımı için teklif al", due: tom, done: false },
    { id: "t5", title: "Yelken kılıfını yıka", due: tom, done: false },
  ],
  notes: [],
};

export const results = [];
const pending = [];
const short = (got) => (typeof got === "string" ? got : JSON.stringify(got)?.slice(0, 160));

// group("Ad")([[söz, { desc, fn, ok }, not?], …]): fn(söz) sonucu ok() ile denetlenir; fn Promise dönebilir (PDF gibi)
export function suite(area) {
  const group = (name) => (cases) => {
    for (const [say, check, note] of cases) {
      const row = { area, group: name, say, ok: false, expect: check.desc, got: "", note: note || "" };
      results.push(row);
      const fail = (e) => { row.got = "HATA: " + (e?.message || e); row.ok = false; };
      try {
        const got = check.fn(say);
        if (got && typeof got.then === "function") {
          pending.push(got.then((g) => { row.got = short(g); row.ok = !!check.ok(g); }, fail).catch(fail));
        } else {
          row.got = short(got);
          row.ok = !!check.ok(got);
        }
      } catch (e) { fail(e); }
    }
  };
  return { group, results };
}

// Promise dönen testlerin bitmesini bekler
export const settle = () => Promise.all(pending);
