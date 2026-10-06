// Açılış ekranı (BootSplash) durumu. Uygulama açılırken oturum ve veriler birkaç aşamada yüklenir; her aşama
// eskiden kendi açılış ekranını çiziyordu, ekran aşama aralarında kaybolup yeniden geliyordu (yanıp sönme).
// Artık tek bir açılış ekranı var (kök düzende, sabit katman); bekleyen her aşama `holdBoot()` ile onu tutar.
// Son tutan bırakınca kısa bir aralıkta (aşamalar arasında) kimse tutmazsa ekran yumuşakça çekilir.
const GAP = 160; // aşama geçişi için pay (ms): bırakılan ekran bu sürede yeniden tutulursa hiç kıpırdamaz
const MIN = 650; // açılış ekranı bundan kısa görünmez (anlık gelip giden ekran kıpırtı gibi görünür)

let holds = 0;
let shown = true; // sunucu çizimi ekranla başlar
let since = 0; // görünmeye başladığı an (performance.now; ilk açılışta sayfanın yüklenmeye başladığı an = 0)
let timer = 0;
const subs = new Set();

const now = () => (typeof performance !== "undefined" ? performance.now() : 0);
const emit = () => subs.forEach((f) => f(shown));

function schedule() {
  clearTimeout(timer);
  const wait = Math.max(GAP, MIN - (now() - since));
  timer = setTimeout(() => {
    if (holds || !shown) return;
    shown = false;
    emit();
  }, wait);
}

// Bekleyen aşama açılış ekranını tutar; dönen işlev bırakır
export function holdBoot() {
  holds++;
  clearTimeout(timer);
  if (!shown) {
    shown = true;
    since = now();
    emit();
  }
  let done = false;
  return () => {
    if (done) return;
    done = true;
    holds = Math.max(0, holds - 1);
    if (!holds) schedule();
  };
}

// Açılış ekranı kurulunca: hiçbir aşama tutmuyorsa (ör. hata ekranı) yine de çekilsin
export function kickBoot() {
  if (!holds && shown) schedule();
}

export function bootShown() {
  return shown;
}

export function onBoot(fn) {
  subs.add(fn);
  return () => subs.delete(fn);
}
