// PDF sayfasındaki yazı parçaları (pdf.js getTextContent items) → satırlar. Uzun kayıt listeleri (200+ tekne) yapay zekaya
// tek seferde gidince süre aşıyordu (Seyhun 2026-11-03, 9 sayfalık TYF sporcu listesi); yazı satır satır çıkarılıp parça parça okunur.
export function linesOf(items) {
  const rows = [];
  for (const it of items || []) {
    const s = String(it?.str ?? "");
    if (!s.trim()) continue;
    const x = Number(it.transform?.[4]) || 0;
    const y = Number(it.transform?.[5]) || 0;
    const h = Math.abs(Number(it.height) || Number(it.transform?.[3]) || 8);
    let r = rows.find((q) => Math.abs(q.y - y) <= Math.max(2, h * 0.4));
    if (!r) rows.push((r = { y, parts: [] }));
    r.parts.push({ x, s });
  }
  return rows
    .sort((a, b) => b.y - a.y)
    .map((r) => r.parts.sort((a, b) => a.x - b.x).map((p) => p.s.trim()).join("  "))
    .filter(Boolean);
}

// Satırlar → en çok n satırlık parçalar; her parçanın başına belgenin başlığı eklenir ki sınıf/sütun adları bilinsin
// Başlık: her sayfada tekrar eden sütun satırına kadar (yoksa ilk 3 satır)
export function chunkLines(lines, n = 45) {
  let head = 3;
  for (let i = 0; i < Math.min(10, lines.length); i++) if (lines.indexOf(lines[i], i + 1) > -1) head = i + 1;
  const top = lines.slice(0, head);
  const body = lines.slice(head);
  if (body.length <= n) return [lines.join("\n")];
  const out = [];
  for (let i = 0; i < body.length; i += n) out.push([...top, ...body.slice(i, i + n)].join("\n"));
  return out;
}
