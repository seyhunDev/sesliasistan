// Firestore yazması zayıf bağlantıda sunucu onayını uzun bekleyebilir; yazma cihazda zaten yapılmıştır.
// soon(yazma) en çok ms bekler: onay gelirse "ok", gelmezse "late" döner ve yazma arkada sürer. Sonradan reddedilirse
// "sa-save-failed" olayı (ekranda uyarı) çıkar. Önceden onay gelmeden hata gelirse hata fırlatılır (denetim B11; plan ve
// görevlerdeki 2,5 sn kuralının aynısı, DataProvider saveDrafts).
export function soon(write, ms = 2500, what = "Kayıt") {
  let late = false;
  const done = Promise.resolve(write).then(
    (v) => ({ v }),
    (e) => {
      if (!late) throw e;
      if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("sa-save-failed", { detail: { what, message: e?.message || "" } }));
      return { e };
    },
  );
  const offline = typeof navigator !== "undefined" && navigator.onLine === false;
  const wait = new Promise((r) =>
    setTimeout(() => {
      late = true;
      r("late");
    }, offline ? 300 : ms),
  );
  return Promise.race([done.then((x) => (x.e ? "late" : "ok")), wait]);
}
