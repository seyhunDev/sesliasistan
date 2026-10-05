// Whisper sessiz ya da çok gürültülü kayıtta video altyazılarından öğrendiği cümleleri uydurur
// ("Altyazı M.K.", "İzlediğiniz için teşekkür ederim"). Bunlar komut sanılmasın: cümleden çıkarılır,
// geriye bir şey kalmazsa metin boş sayılır ("ses duyulmadı"). İpucu metninin aynen geri gelmesi de uydurmadır.
const lower = (s) => String(s || "").toLocaleLowerCase("tr-TR");
const flat = (s) => lower(s).replace(/[^\p{L}\p{N}]+/gu, " ").trim();

const JUNK = [
  /altyazı\s*m\s*\.?\s*k\.?/giu,
  /altyazı(lar)?\s*:?\s*[\p{L}.\s]{0,20}?(tarafından|ile)\s*(yapıldı|hazırlandı)\.?/giu,
  /izlediğiniz\s+için\s+(çok\s+)?teşekkür(ler| ederim| ederiz)[.!]?/giu,
  /(kanal(ım|ımız)a\s+)?abone\s+olmayı\s+(ve\s+\S+\s+)?unutmayın[.!]?/giu,
  /(videoyu\s+)?beğenmeyi\s+(ve\s+\S+\s+)?unutmayın[.!]?/giu,
  /bir\s+sonraki\s+video(da|muzda)\s+görüşmek\s+üzere[.!]?/giu,
  /bu\s+videoyu\s+izlediğiniz\s+için[^.!]*[.!]?/giu,
  /\[(müzik|alkış|gülüşmeler|sessizlik)\]|\((müzik|alkış|gülüşmeler)\)|♪+/giu,
];

export function dropHallucination(text, prompt = "") {
  let t = String(text || "");
  // Eşleşme küçük harfli kopyada aranır ("İ" büyük-küçük harf eşlemesine girmez), aynı aralık özgün metinden silinir
  for (const re of JUNK) {
    const low = lower(t);
    if (low.length !== t.length) {
      t = t.replace(re, " ");
      continue;
    }
    let out = "";
    let at = 0;
    for (const m of low.matchAll(re)) {
      out += t.slice(at, m.index) + " ";
      at = m.index + m[0].length;
    }
    t = out + t.slice(at);
  }
  t = t.replace(/\s+/g, " ").replace(/^[\s.,!?…-]+/, "").trim();
  if (!/[\p{L}\p{N}]/u.test(t)) return "";
  // İpucunun aynen geri gelmesi (baştan, sık kelimeler listesi): konuşma yok. Ortadaki tek ad (yarış adı) sayılmaz.
  const f = flat(t);
  if (prompt && f.length >= 20 && flat(prompt).startsWith(f.slice(0, 20))) return "";
  return t;
}

// Whisper'ın parça parça yanıtı (Groq verbose_json): sessiz parçalar atılır. Konuşma yok olasılığı yüksek VE model
// kendinden emin değilse (Whisper burada uydurur). Parça yoksa düz metin.
export function spokenText(data) {
  const segs = Array.isArray(data?.segments) ? data.segments : null;
  if (!segs?.length) return String(data?.text || "").trim();
  return segs
    .filter((g) => !(g.no_speech_prob > 0.6 && g.avg_logprob < -0.7))
    .map((g) => String(g.text || "").trim())
    .filter(Boolean)
    .join(" ");
}
