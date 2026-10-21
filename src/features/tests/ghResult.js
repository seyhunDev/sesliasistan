// GitHub'daki tam testin son sonucu (Testler sayfasının üstü): "Testler" iş akışı her main birleştirmesinde çalışır,
// sonucu depodaki test-sonuclari dalına son.txt olarak yazar (.github/workflows/test.yml). Depo açık, dosya doğrudan okunur.
export const GH_URL = "https://raw.githubusercontent.com/seyhunDev/sesliasistan/test-sonuclari/son.txt";

// son.txt → { commit, when, run, pass, total, secs, sections: [{ key, title, pass, total, body }] }
// Bölüm başlığı "2. ANLAMA: temiz cümleler: 117/121"; key ilk ":"ye kadar ("ANLAMA"), gövde sonraki başlığa kadar.
export function parseGh(txt) {
  const lines = String(txt || "").split("\n");
  const pick = (re) => lines.map((l) => re.exec(l)).find(Boolean);
  const sum = pick(/^SONUÇ: (\d+)\/(\d+) geçti.*?(\d+) sn\s*$/);
  if (!sum) return null;
  const when = pick(/^Zaman: (\d{4})-(\d{2})-(\d{2})-(\d{2})(\d{2})/);
  const sections = [];
  let cur = null;
  for (const l of lines) {
    const h = /^\d\. ([^:]+): (.*?):? ?(\d+)\/(\d+)\s*$/.exec(l);
    if (h) {
      cur = { key: h[1].trim(), title: l.replace(/^\d\. /, "").replace(/:? ?\d+\/\d+\s*$/, ""), pass: +h[3], total: +h[4], body: [] };
      sections.push(cur);
    } else if (/^Okuma: /.test(l)) cur = null;
    else if (cur && l.trim()) cur.body.push(l);
  }
  return {
    commit: pick(/^Commit: (.*)$/)?.[1] || "",
    when: when ? `${when[1]}-${when[2]}-${when[3]}T${when[4]}:${when[5]}:00+03:00` : "",
    run: pick(/^Çalıştırma: (https:\S+)/)?.[1] || "",
    pass: +sum[1],
    total: +sum[2],
    secs: +sum[3],
    sections: sections.map((s) => ({ ...s, body: s.body.join("\n") })),
  };
}

// Bir özelliğin GitHub satırı: adı verilen bölümlerin toplamı ({ pass, total, body } ya da bölüm yoksa null)
export function ghPart(gh, keys) {
  const list = (gh?.sections || []).filter((s) => keys.includes(s.key));
  if (!list.length) return null;
  return {
    pass: list.reduce((a, s) => a + s.pass, 0),
    total: list.reduce((a, s) => a + s.total, 0),
    body: list.map((s) => `${s.title}: ${s.pass}/${s.total}\n${s.body}`).join("\n\n"),
  };
}

export async function loadGh() {
  const r = await fetch(`${GH_URL}?t=${Math.floor(Date.now() / 60000)}`, { cache: "no-store" });
  if (!r.ok) throw new Error("GitHub sonucu okunamadı");
  const gh = parseGh(await r.text());
  if (!gh) throw new Error("GitHub sonucu anlaşılamadı");
  return gh;
}
