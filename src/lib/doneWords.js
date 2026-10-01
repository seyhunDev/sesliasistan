// "Tamamladım" yerine türe göre doğal ifade: plan gerçekleşir, görev yapılır, not okunur.
// Saf veri (sunucu ve istemci ortak; göreli içe aktarma ile de kullanılabilir).
export const DONE = {
  plan: { act: "Gerçekleşti", mine: "Gerçekleşti", toast: "Gerçekleşti olarak işaretlendi", past: "gerçekleşti dedi", state: "Gerçekleşti" },
  task: { act: "Yaptım", mine: "Yaptın", toast: "Yapıldı olarak işaretlendi", past: "yaptı", state: "Yapıldı" },
  note: { act: "Okudum", mine: "Okudun", toast: "Okundu olarak işaretlendi", past: "okudu", state: "Okundu" },
};
export const doneOf = (kind) => DONE[kind] || DONE.task;
