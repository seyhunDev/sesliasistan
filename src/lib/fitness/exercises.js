// Fitness hareket listesi (sabit, uygulamanın içinde; Firebase okuması yok). Yapay zeka program yazarken yalnız bu
// listeden seçer (id ile), böylece uydurma hareket çıkmaz ve hareket bazında gelişim doğru tutulur.
// kind: reps (set × tekrar, isteğe bağlı kilo) · time (saniye: plank) · cardio (dakika: koşu, bisiklet)
// equip: body (vücut ağırlığı) · dumbbell · barbell · machine · cable · band · kettlebell · bench · bar (barfiks barı) · cardio (koşu bandı, bisiklet…)
export const GROUPS = ["Göğüs", "Sırt", "Bacak", "Kalça", "Omuz", "Kol", "Karın", "Kardiyo", "Tüm vücut", "Esneme"];
export const EQUIP = {
  body: "Vücut ağırlığı",
  dumbbell: "Dambıl",
  barbell: "Halter (bar)",
  machine: "Makine",
  cable: "Kablo",
  band: "Direnç bandı",
  kettlebell: "Kettlebell",
  bench: "Sehpa",
  bar: "Barfiks barı",
  cardio: "Kardiyo cihazı",
};

// [id, ad, grup, ekipman, tür, kısa tarif]
const L = [
  // Göğüs
  ["pushup", "Şınav", "Göğüs", "body", "reps", "Eller omuz genişliğinde, gövde düz; göğüs yere yaklaşana kadar in, it."],
  ["knee-pushup", "Dizüstü şınav", "Göğüs", "body", "reps", "Dizler yerde, gövde düz; şınavın kolay hâli."],
  ["incline-pushup", "Eğimli şınav", "Göğüs", "body", "reps", "Eller sehpada ya da duvarda; başlangıç için."],
  ["bench-press", "Bench press", "Göğüs", "barbell", "reps", "Sehpada sırt üstü, bar göğse iner, kollar düzleşene kadar it."],
  ["db-bench", "Dambıl göğüs press", "Göğüs", "dumbbell", "reps", "Sehpada dambılları göğüs hizasından yukarı it."],
  ["incline-db-press", "Eğimli dambıl press", "Göğüs", "dumbbell", "reps", "30-45° sehpada dambılları yukarı it; üst göğüs."],
  ["db-fly", "Dambıl fly", "Göğüs", "dumbbell", "reps", "Kollar hafif bükük, yay çizerek aç ve kapat."],
  ["chest-press", "Göğüs press makinesi", "Göğüs", "machine", "reps", "Kolları öne it, yavaş geri bırak."],
  ["cable-fly", "Kablo crossover", "Göğüs", "cable", "reps", "Kabloları önde birleştir, yavaşça aç."],
  ["dips", "Dips (paralel bar)", "Göğüs", "bar", "reps", "Paralelde dirsekleri bükerek in, it."],
  // Sırt
  ["pullup", "Barfiks", "Sırt", "bar", "reps", "Avuçlar öne, çene bar üstüne çıkana kadar çek."],
  ["chinup", "Ters tutuş barfiks", "Sırt", "bar", "reps", "Avuçlar sana dönük; kol ve sırt."],
  ["band-pullup", "Bant destekli barfiks", "Sırt", "band", "reps", "Bant ayağın ya da dizinin altında, barfiksi yardımla yap."],
  ["lat-pulldown", "Lat pulldown", "Sırt", "cable", "reps", "Barı göğsün üstüne çek, kürek kemiklerini sık."],
  ["seated-row", "Oturarak kablo row", "Sırt", "cable", "reps", "Sırt dik, tutacağı karnına çek."],
  ["db-row", "Tek kol dambıl row", "Sırt", "dumbbell", "reps", "Bir el ve diz sehpada, dambılı kalçaya doğru çek."],
  ["barbell-row", "Barbell row", "Sırt", "barbell", "reps", "Öne eğil, sırt düz; barı karna çek."],
  ["inverted-row", "Ters row", "Sırt", "body", "reps", "Bel hizasındaki barın altında, gövde düz, göğsü bara çek."],
  ["band-row", "Bantla row", "Sırt", "band", "reps", "Bandı sabitle, dirsekleri geriye çek."],
  ["deadlift", "Deadlift", "Sırt", "barbell", "reps", "Sırt düz, barı yerden kalçayı iterek kaldır."],
  ["back-ext", "Sırt ekstansiyonu (Superman)", "Sırt", "body", "reps", "Yüzüstü, kol ve bacakları birlikte kaldır."],
  // Bacak
  ["squat", "Squat", "Bacak", "body", "reps", "Ayaklar omuz genişliğinde, kalçayı geri it, uyluklar yere paralel olana kadar çök."],
  ["goblet-squat", "Goblet squat", "Bacak", "dumbbell", "reps", "Dambıl ya da kettlebell göğüste, squat yap."],
  ["back-squat", "Barbell squat", "Bacak", "barbell", "reps", "Bar sırtta, kontrollü çök ve kalk."],
  ["front-squat", "Front squat", "Bacak", "barbell", "reps", "Bar omuzların önünde, gövde dik squat."],
  ["lunge", "Lunge (hamle)", "Bacak", "body", "reps", "Bir adım öne, arka diz yere yaklaşana kadar in; bacak başına sayılır."],
  ["db-lunge", "Dambıl lunge", "Bacak", "dumbbell", "reps", "Ellerde dambılla hamle."],
  ["walking-lunge", "Yürüyerek lunge", "Bacak", "body", "reps", "Hamle yaparak ilerle."],
  ["split-squat", "Bulgarian split squat", "Bacak", "dumbbell", "reps", "Arka ayak sehpada, öndeki bacakla çök."],
  ["step-up", "Step-up (basamağa çıkış)", "Bacak", "bench", "reps", "Basamağa tek bacakla çık, kontrollü in."],
  ["leg-press", "Leg press", "Bacak", "machine", "reps", "Platformu ayaklarla it, dizler kilitlenmesin."],
  ["leg-ext", "Leg extension", "Bacak", "machine", "reps", "Oturarak bacakları düzleştir; ön bacak."],
  ["leg-curl", "Leg curl", "Bacak", "machine", "reps", "Topukları kalçaya çek; arka bacak."],
  ["rdl", "Romanian deadlift", "Bacak", "dumbbell", "reps", "Dizler hafif bükük, kalçadan menteşe; arka bacak gerilir."],
  ["calf-raise", "Baldır kaldırma", "Bacak", "body", "reps", "Parmak uçlarına yüksel, yavaş in."],
  ["wall-sit", "Duvarda oturma", "Bacak", "body", "time", "Sırt duvarda, dizler 90°, bekle."],
  ["jump-squat", "Sıçramalı squat", "Bacak", "body", "reps", "Squattan patlayıcı sıçra, yumuşak in."],
  // Kalça
  ["glute-bridge", "Kalça köprüsü", "Kalça", "body", "reps", "Sırt üstü, dizler bükük; kalçayı kaldır, sık."],
  ["hip-thrust", "Hip thrust", "Kalça", "barbell", "reps", "Sırt sehpada, bar kalçada; kalçayı yukarı it."],
  ["single-bridge", "Tek bacak köprü", "Kalça", "body", "reps", "Tek ayak yerde, kalçayı kaldır."],
  ["donkey-kick", "Donkey kick", "Kalça", "body", "reps", "Dört ayak üstünde bir bacağı yukarı it."],
  ["side-leg-raise", "Yana bacak kaldırma", "Kalça", "body", "reps", "Yan yat, üstteki bacağı kaldır."],
  ["band-walk", "Bantla yan yürüyüş", "Kalça", "band", "reps", "Bant dizlerin üstünde, yarım çömelik yana yürü."],
  ["kb-swing", "Kettlebell swing", "Kalça", "kettlebell", "reps", "Kalçadan itişle kettlebell'i göğüs hizasına savur."],
  // Omuz
  ["ohp", "Omuz press (bar)", "Omuz", "barbell", "reps", "Ayakta barı omuzdan başın üstüne it."],
  ["db-shoulder-press", "Dambıl omuz press", "Omuz", "dumbbell", "reps", "Dambılları omuzdan yukarı it."],
  ["lateral-raise", "Yana kol açış", "Omuz", "dumbbell", "reps", "Dambılları yana omuz hizasına kaldır."],
  ["front-raise", "Öne kol kaldırma", "Omuz", "dumbbell", "reps", "Dambılları öne omuz hizasına kaldır."],
  ["rear-fly", "Arka omuz fly", "Omuz", "dumbbell", "reps", "Öne eğil, dambılları yana aç."],
  ["face-pull", "Face pull", "Omuz", "cable", "reps", "İpi yüzüne doğru çek, dirsekler yukarıda."],
  ["pike-pushup", "Pike şınav", "Omuz", "body", "reps", "Kalça yukarıda ters V, başı yere yaklaştır."],
  ["band-pull-apart", "Bant açma", "Omuz", "band", "reps", "Bandı göğüs önünde iki yana aç."],
  ["shoulder-press-machine", "Omuz press makinesi", "Omuz", "machine", "reps", "Tutacakları yukarı it."],
  // Kol
  ["db-curl", "Dambıl biceps curl", "Kol", "dumbbell", "reps", "Dirsekler sabit, dambılları omuza kaldır."],
  ["hammer-curl", "Hammer curl", "Kol", "dumbbell", "reps", "Avuçlar birbirine dönük curl."],
  ["barbell-curl", "Barbell curl", "Kol", "barbell", "reps", "Barı dirsekten bükerek kaldır."],
  ["band-curl", "Bantla curl", "Kol", "band", "reps", "Bandın üstüne bas, curl yap."],
  ["triceps-pushdown", "Triceps pushdown", "Kol", "cable", "reps", "Dirsekler yanda, kabloyu aşağı it."],
  ["overhead-ext", "Baş üstü triceps", "Kol", "dumbbell", "reps", "Dambıl başın arkasında, kolu düzleştir."],
  ["bench-dips", "Sehpada dips", "Kol", "bench", "reps", "Eller arkada sehpada, dirsekleri bükerek in."],
  ["close-pushup", "Dar şınav", "Kol", "body", "reps", "Eller yakın, dirsekler gövdeye yakın şınav."],
  ["skull-crusher", "Skull crusher", "Kol", "barbell", "reps", "Sırt üstü, barı alna doğru indir, düzleştir."],
  // Karın
  ["plank", "Plank", "Karın", "body", "time", "Dirsekler omuz altında, gövde düz, bekle."],
  ["side-plank", "Yan plank", "Karın", "body", "time", "Yan dirsek üstünde gövde düz; taraf başına."],
  ["crunch", "Mekik (crunch)", "Karın", "body", "reps", "Sırt üstü, omuzları yerden kaldır."],
  ["situp", "Tam mekik", "Karın", "body", "reps", "Sırt üstünden oturur pozisyona gel."],
  ["leg-raise", "Bacak kaldırma", "Karın", "body", "reps", "Sırt üstü, düz bacakları yukarı kaldır."],
  ["hanging-leg-raise", "Asılı bacak kaldırma", "Karın", "bar", "reps", "Barda asılı, dizleri ya da bacakları kaldır."],
  ["russian-twist", "Russian twist", "Karın", "body", "reps", "Oturarak gövdeyi iki yana çevir."],
  ["bicycle", "Bisiklet mekik", "Karın", "body", "reps", "Karşı dirsek karşı dize."],
  ["mountain-climber", "Mountain climber", "Karın", "body", "time", "Şınav duruşunda dizleri sırayla göğse çek."],
  ["dead-bug", "Dead bug", "Karın", "body", "reps", "Sırt üstü, karşı kol ve bacağı uzat; bel yerde."],
  ["bird-dog", "Bird dog", "Karın", "body", "reps", "Dört ayak, karşı kol ve bacağı uzat."],
  ["hollow-hold", "Hollow hold", "Karın", "body", "time", "Sırt üstü, kol ve bacaklar havada, bel yerde."],
  ["ab-wheel", "Karın tekerleği", "Karın", "body", "reps", "Dizler yerde, tekerleği öne yuvarla, geri gel."],
  // Tüm vücut
  ["burpee", "Burpee", "Tüm vücut", "body", "reps", "Çömel, şınav duruşu, geri gel, sıçra."],
  ["jumping-jack", "Jumping jack", "Tüm vücut", "body", "time", "Kol ve bacakları açıp kapatarak zıpla."],
  ["thruster", "Thruster", "Tüm vücut", "dumbbell", "reps", "Squattan kalkarken dambılları başın üstüne it."],
  ["kb-clean", "Kettlebell clean & press", "Tüm vücut", "kettlebell", "reps", "Kettlebell'i omuza al, yukarı it."],
  ["farmer-walk", "Çiftçi yürüyüşü", "Tüm vücut", "dumbbell", "time", "Ağır dambıllarla dik yürü."],
  ["bear-crawl", "Ayı yürüyüşü", "Tüm vücut", "body", "time", "Dizler yerden az yukarıda dört ayak üstünde ilerle."],
  ["turkish-getup", "Turkish get-up", "Tüm vücut", "kettlebell", "reps", "Kettlebell yukarıda, yerden ayağa kalk ve geri yat."],
  // Kardiyo
  ["run", "Koşu", "Kardiyo", "body", "cardio", "Rahat tempo koşu."],
  ["treadmill", "Koşu bandı", "Kardiyo", "cardio", "cardio", "Koşu ya da tempolu yürüyüş."],
  ["walk", "Tempolu yürüyüş", "Kardiyo", "body", "cardio", "Konuşabileceğin hızda tempolu yürü."],
  ["bike", "Bisiklet", "Kardiyo", "cardio", "cardio", "Sabit ya da açık hava bisiklet."],
  ["rower", "Kürek makinesi", "Kardiyo", "cardio", "cardio", "Bacakla it, kolla çek."],
  ["elliptical", "Eliptik", "Kardiyo", "cardio", "cardio", "Eliptik cihazda sabit tempo."],
  ["jump-rope", "İp atlama", "Kardiyo", "body", "cardio", "Ritmik ip atlama."],
  ["swim", "Yüzme", "Kardiyo", "body", "cardio", "Sabit tempoda yüzme."],
  ["stairs", "Merdiven", "Kardiyo", "body", "cardio", "Merdiven çıkma ya da step cihazı."],
  ["hiit", "HIIT aralıklı", "Kardiyo", "body", "cardio", "Kısa yüksek tempo + kısa dinlenme, tekrar."],
  // Esneme / ısınma
  ["warmup", "Isınma", "Esneme", "body", "cardio", "Hafif kardiyo ve eklem çevirme."],
  ["stretch", "Esneme", "Esneme", "body", "cardio", "Çalışılan kaslara 20-30 sn esneme."],
  ["hip-opener", "Kalça açma", "Esneme", "body", "time", "Derin hamlede kalçayı aç, bekle."],
  ["hamstring-stretch", "Arka bacak esneme", "Esneme", "body", "time", "Bacak düz, öne eğil, bekle."],
  ["cat-cow", "Kedi-inek", "Esneme", "body", "reps", "Dört ayak, sırtı yuvarla ve çukurlaştır."],
  ["foam-roll", "Foam roller", "Esneme", "body", "cardio", "Kasları silindirle gevşet."],
  ["yoga", "Yoga", "Esneme", "body", "cardio", "Yoga akışı."],
];

export const EXERCISES = L.map(([id, name, group, equip, kind, how]) => ({ id, name, group, equip, kind, how }));
const BY_ID = new Map(EXERCISES.map((e) => [e.id, e]));
export const exById = (id) => BY_ID.get(id) || null;

// Türkçe harfsiz, küçük harf karşılaştırma
export const fold = (s) =>
  String(s || "")
    .toLocaleLowerCase("tr-TR")
    .replace(/[çğıöşüâî]/g, (c) => ({ ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u", â: "a", î: "i" })[c])
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

// Sesle/yazıyla söylenen ad → hareket ("squat", "şınavlar", "sınav" (ses tanıma), "plank", "mekik"). Bulunamazsa null.
const ALIAS = [
  ["pushup", /\b(sinav|sinavlar|sinavi|push ?up)\b/],
  ["squat", /\b(squat|skuat|skvat|cokme)\b/],
  ["crunch", /\b(mekik|mekigi|crunch)\b/],
  ["pullup", /\b(barfiks|pull ?up)\b/],
  ["lunge", /\b(lunge|hamle)\b/],
  ["run", /\b(kostum|kosu|kostu|kosmak)\b/],
  ["walk", /\b(yuruyus|yurudum|yurume)\b/],
  ["bike", /\b(bisiklet)\b/],
  ["plank", /\b(plank)\b/],
];
export function findExercise(name) {
  const f = fold(name);
  if (!f) return null;
  if (BY_ID.has(f.replace(/ /g, "-"))) return BY_ID.get(f.replace(/ /g, "-"));
  const exact = EXERCISES.find((e) => fold(e.name) === f);
  if (exact) return exact;
  // En uzun eşleşen ad önce ("dambıl lunge" > "lunge")
  const hit = EXERCISES.filter((e) => ` ${f} `.includes(` ${fold(e.name)} `)).sort((a, b) => b.name.length - a.name.length)[0];
  if (hit) return hit;
  const al = ALIAS.find(([, re]) => re.test(f));
  return al ? BY_ID.get(al[0]) : null;
}

// Yapay zeka istemi için kısa liste: "id: ad (grup, ekipman)"
export const exerciseCatalog = () => EXERCISES.map((e) => `${e.id}: ${e.name} (${e.group}, ${EQUIP[e.equip]})`).join("\n");
