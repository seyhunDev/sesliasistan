// Yoklama ay raporu: sporcu başına geldi / gelmedi / izinli sayısı ve devam oranı. Saf fonksiyonlar (Excel'e aktarma hariç).
// Yoklama sporcu kaydında: att = { "2026": { "10-02": "present" | "absent" | "excused" } } (data.js)

export const MARK = { present: "G", absent: "Y", excused: "İ" };

// Ayın günleri (yoklama alınmış olanlar) ve sporcu satırları. ym: "2026-10"
export function monthReport(athletes = [], ym, classes = {}) {
  const [y, m] = [ym.slice(0, 4), ym.slice(5, 7)];
  const marks = (a) => Object.entries(a.att?.[y] || {}).filter(([k, v]) => k.startsWith(`${m}-`) && MARK[v]);
  const days = [...new Set(athletes.flatMap((a) => marks(a).map(([k]) => k)))].sort();
  const rows = athletes
    .map((a) => {
      const own = Object.fromEntries(marks(a));
      const n = (s) => Object.values(own).filter((v) => v === s).length;
      const present = n("present");
      const absent = n("absent");
      return {
        id: a.id,
        name: a.studentName,
        cls: classes[a.currentClassId] || "",
        present,
        absent,
        excused: n("excused"),
        rate: present + absent ? Math.round((present / (present + absent)) * 100) : null, // izinli günler sayılmaz
        days: own,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "tr"));
  return { days, rows };
}

export const monthLabel = (ym) => new Date(`${ym}-15T12:00:00`).toLocaleDateString("tr-TR", { month: "long", year: "numeric" });
export function shiftMonth(ym, n) {
  const d = new Date(`${ym}-15T12:00:00`);
  d.setMonth(d.getMonth() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// Excel tabloları: "Özet" (sayılar) ve "Günler" (gün gün G / Y / İ)
export function reportSheets({ days, rows }) {
  const summary = [["Sporcu", "Sınıf", "Geldi", "Gelmedi", "İzinli", "Devam %"], ...rows.map((r) => [r.name, r.cls, r.present, r.absent, r.excused, r.rate ?? ""])];
  const grid = [["Sporcu", ...days.map((d) => `${d.slice(3)}.${d.slice(0, 2)}`)], ...rows.map((r) => [r.name, ...days.map((d) => MARK[r.days[d]] || "")])];
  return { summary, grid };
}

export async function downloadExcel(report, ym) {
  const XLSX = await import("xlsx");
  const { summary, grid } = reportSheets(report);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summary), "Özet");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(grid), "Günler");
  XLSX.writeFile(wb, `yoklama-${ym}.xlsx`);
}
