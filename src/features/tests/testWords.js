// "Testleri çalıştır", "bütün testleri yap" → run; "testleri aç", "testler sayfasını göster" → open (Testler sayfası, ana hesap).
// Asistan raporu ("test raporu") ve başka sözler değil.
export function testsAsk(s) {
  const t = String(s || "").toLocaleLowerCase("tr-TR").replace(/[.!?,]+/g, " ").replace(/\s+/g, " ").trim();
  if (!/^(bütün |tüm )?(testlerin hepsini|testleri|testler|test)( sayfa\S*)? /.test(`${t} `)) return null;
  const rest = t.replace(/^(bütün |tüm )?(testlerin hepsini|testleri|testler|test)( sayfa\S*)?/, "").trim();
  if (/^(hepsini )?(çalıştır|başlat|yap|koş)\S*( m[ıi]s[ıi]n)?( hepsini)?$/.test(rest)) return "run";
  if (/^(aç|göster|git)\S*( m[ıi]s[ıi]n)?$/.test(rest) || (!rest && /sayfa/.test(t))) return "open";
  return null;
}
