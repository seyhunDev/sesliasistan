// TYF Yelken Ligi İlan Tahtası (https://yelkenligi.tyf.org.tr/home/noticeboard/) sayfasını okur (Seyhun 2026-11-03).
// Sayfa düz HTML (Bootstrap sekmeleri): sezon (2026-2027 …) › ayak (1. AYAK …) › sınıf (OPTIMIST, ILCA …) › tablo
// (Yüklenme Zamanı "05.10.2026 16:24", Dosya Adı: <a class="activityDoc" href="https://www.tyf.org.tr/faaliyetdosyasi/293150/">).
// Şimdiki sezonun ayakları sayfanın içinde gelir; eski sezonların ayakları sonradan yüklenir:
// /Home/GetNoticeBoardLeg?legNumber=9 (ayak sekmesinde data-leg-number) aynı biçimde sınıf sekmeleri + tablolar döner.
// Sınıf sekmesinin kimliği (_285510) TYF'deki faaliyetin kimliğidir; yarışı izlerken bu kimlik kullanılır.
// Saf fonksiyonlar (test: scripts/asistan-test/yerel/yaris.mjs "Yarış sitesi sayfası").

export const SITE = "https://yelkenligi.tyf.org.tr";
export const BOARD_URL = `${SITE}/home/noticeboard/`;
export const legUrl = (n) => `${SITE}/Home/GetNoticeBoardLeg?legNumber=${encodeURIComponent(n)}`;
export const FILE_RE = /^https:\/\/www\.tyf\.org\.tr\/faaliyetdosyasi\/(\d{1,9})\/?$/;
export const fileUrl = (fid) => `https://www.tyf.org.tr/faaliyetdosyasi/${fid}/`;

const NAMED = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
export const decode = (s) =>
  String(s || "")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
    .replace(/&([a-z]+);/gi, (m, n) => NAMED[n.toLowerCase()] ?? m)
    .replace(/\s+/g, " ")
    .trim();

// "05.10.2026 16:24" → "2026-10-05T16:24"
export function timeOf(raw) {
  const m = String(raw || "").match(/(\d{1,2})\.(\d{1,2})\.(\d{4})\s+(\d{1,2}):(\d{2})/);
  return m ? `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}T${m[4].padStart(2, "0")}:${m[5]}` : "";
}

// Sınıf sekmeleri ve tabloları (bir ayağın içi): [{ act, cls, docs: [{ fid, name, at, url }] }]
export function classesOf(html) {
  const s = String(html || "");
  const names = new Map();
  for (const m of s.matchAll(/<button[^>]*\sid="_(\d+)"[^>]*>([\s\S]*?)<\/button>/g)) names.set(m[1], decode(m[2].replace(/<[^>]*>/g, " ")));
  const panes = [...s.matchAll(/<div[^>]*\sid="tab-(\d+)"[^>]*role="tabpanel"[^>]*>/g)];
  const out = [];
  panes.forEach((p, i) => {
    if (!names.has(p[1])) return;
    const part = s.slice(p.index, panes[i + 1]?.index ?? s.length);
    const docs = [];
    for (const r of part.matchAll(/<td[^>]*class="colUploadTime"[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*>\s*<a[^>]*class="activityDoc"[^>]*>/g)) {
      const a = r[0].slice(r[0].lastIndexOf("<a"));
      const href = decode(a.match(/href="([^"]*)"/)?.[1]);
      const title = a.match(/title="([^"]*)"/)?.[1];
      const text = part.slice(r.index + r[0].length).match(/^([\s\S]*?)<\/a>/)?.[1];
      const fid = href.match(FILE_RE)?.[1];
      const name = decode(title ?? text);
      const at = timeOf(decode(r[1]));
      if (fid && name && at) docs.push({ fid, name, at, url: fileUrl(fid) });
    }
    out.push({ act: p[1], cls: names.get(p[1]), docs });
  });
  return out;
}

// Bütün sayfa: { seasons: [{ id: "2627", name: "2026-2027", legs: [{ n, name, legNo, classes|null }] }] }
// legNo: sonradan yüklenen ayağın numarası (classes null, legUrl ile alınır); sayfanın içindeki ayakta legNo "" ve classes dolu.
export function parseBoard(html) {
  const s = String(html || "");
  const seasons = [];
  for (const m of s.matchAll(/<button[^>]*\sid="p(\d{4})"[^>]*>([\s\S]*?)<\/button>/g)) {
    const name = decode(m[2]);
    if (/^\d{4}-\d{4}$/.test(name)) seasons.push({ id: m[1], name, legs: [] });
  }
  const legName = new Map();
  for (const m of s.matchAll(/<button[^>]*\sid="league(\d+)-(\d{4})"[^>]*>([\s\S]*?)<\/button>/g)) legName.set(`${m[1]}-${m[2]}`, decode(m[3]));
  // Bölmeler sırayla: sezon bölmesi (tab-p2627) ve ayak bölmesi (tab-league1-2627); ayağın içi bir sonraki bölmeye kadar
  const marks = [...s.matchAll(/<div[^>]*\sid="tab-(p(\d{4})|league(\d+)-(\d{4}))"[^>]*role="tabpanel"/g)];
  marks.forEach((m, i) => {
    if (!m[3]) return;
    const season = seasons.find((x) => x.id === m[4]);
    if (!season) return;
    const part = s.slice(m.index, marks[i + 1]?.index ?? s.length);
    const legNo = part.match(/class="js-leg-content"[^>]*data-leg-number="(\d+)"/)?.[1] || "";
    season.legs.push({ n: +m[3], name: legName.get(`${m[3]}-${m[4]}`) || `${m[3]}. AYAK`, legNo, classes: legNo ? null : classesOf(part) });
  });
  return { seasons };
}

// Ayağın yarış adı: yarış ilanının adından ("TYF YELKEN LİGİ 1. AYAK MW PHOKAIA BEACH RESORT KUPASI OPTIMIST YARIŞ İLANI")
export const noticeDoc = (c) => (c?.docs || []).filter((d) => /\bILANI?\b|İLANI?\b/i.test(d.name.toLocaleUpperCase("tr-TR"))).sort((a, b) => a.at.localeCompare(b.at)).at(-1) || null;
