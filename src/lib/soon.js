// Firestore yazması zayıf bağlantıda sunucu onayını uzun bekleyebilir; yazma cihazda zaten yapılmıştır.
// soon(yazma) en çok ms bekler: onay gelirse "ok", gelmezse "late" döner ve yazma arkada sürer. Sonradan reddedilirse
// "sa-save-failed" olayı (ekranda uyarı) çıkar. Önceden onay gelmeden hata gelirse hata fırlatılır (denetim B11; plan ve
// görevlerdeki 2,5 sn kuralının aynısı, DataProvider saveDrafts).
// Onay gecikince "sa-write-wait" olayı da çıkar: üstteki şerit bekleyen kaydı izlemeye başlar (features/pwa/netWatch.js).
const offline = () => typeof navigator !== "undefined" && navigator.onLine === false;
const fire = (ev) => typeof window !== "undefined" && typeof window.dispatchEvent === "function" && window.dispatchEvent(ev);

export function soon(write, ms = 2500, what = "Kayıt") {
  let late = false;
  let over = false;
  const done = Promise.resolve(write).then(
    (v) => ((over = true), { v }),
    (e) => {
      over = true;
      if (!late) throw e;
      fire(new CustomEvent("sa-save-failed", { detail: { what, message: e?.message || "" } }));
      return { e };
    },
  );
  const wait = new Promise((r) =>
    setTimeout(() => {
      if (over) return;
      late = true;
      fire(new Event("sa-write-wait"));
      r("late");
    }, offline() ? 300 : ms),
  );
  return Promise.race([done.then((x) => (x.e ? "late" : "ok")), wait]);
}

// soon gibi, ama yazmanın kendi değerini döndürür (geç kalırsa undefined): lib/firebase/write.js
export function settle(write, ms = 2500, what = "Kayıt") {
  let val;
  return soon(
    Promise.resolve(write).then((v) => (val = v)),
    ms,
    what,
  ).then(() => val);
}
