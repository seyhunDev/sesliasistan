"use client";

import { lastBody } from "@/lib/athleteBody";
import { useEffect, useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { EQUIP } from "@/lib/fitness/exercises";
import { AGE_GROUPS, DOWS, DOW_LONG, GOALS, LEVELS, PLACES, SPORTS, ageFrom, ageGroupOf, labelOf, sexFrom } from "@/lib/fitness/model";
import { bmiOf, bmiText } from "@/lib/fitness/forecast";
import { todayStr } from "@/lib/utils/format";
import { TEMPLATES } from "@/lib/fitness/templates";

// Seçenek kartlarının simgesi ve kısa açıklaması (yazı model.js'teki listelerden)
const GOAL_UI = {
  kilo: ["flame", "Yağ yak, hafifle"],
  kas: ["dumbbell", "Kas kütlesi kazan"],
  guc: ["zap", "Daha ağır kaldır"],
  kondisyon: ["trend", "Nefes ve dayanıklılık"],
  saglik: ["sun", "Formda ve zinde kal"],
};
const LEVEL_UI = { yeni: [1, "Yeni ya da uzun aradan sonra"], orta: [2, "Düzenli spor yapıyorum"], ileri: [3, "Yıllardır antrenman"] };
const PLACE_UI = { salon: "dumbbell", ev: "home", dis: "sun" };
const SLOTS = [
  ["sabah", "Sabah", "sun", "07:00"],
  ["ogle", "Öğle", "clock", "12:30"],
  ["aksam", "Akşam", "moon", "19:00"],
];

const Q = ({ title, sub }) => (
  <div className="pb-3 pt-1">
    <h3 className="text-[1.375rem] font-bold leading-tight tracking-tight">{title}</h3>
    {sub && <p className="mt-1 text-[0.875rem] text-mut">{sub}</p>}
  </div>
);
const pill = (on) => `h-10 rounded-full px-4 text-[0.875rem] font-semibold transition active:scale-95 ${on ? "bg-acc text-white" : "bg-bg"}`;

// Büyük seçenek kartı: simge + başlık + açıklama, seçilince yeşil çerçeve ve tik
function Option({ on, icon, title, sub, onClick, tall }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`relative flex w-full items-center gap-3 rounded-2xl border-2 px-3 text-left transition active:scale-[.98] ${tall ? "flex-col justify-center gap-2 py-4 text-center" : "py-3"} ${on ? "border-acc bg-acc/[.07]" : "border-transparent bg-bg"}`}
    >
      <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${on ? "bg-acc text-white" : "bg-card text-acc"}`}>
        {typeof icon === "number" ? <Bars n={icon} /> : <Icon name={icon} className="size-5" />}
      </span>
      <span className={`min-w-0 ${tall ? "w-full text-center" : "flex-1"}`}>
        <b className="block text-[0.9375rem] font-semibold leading-tight">{title}</b>
        {sub && <small className="mt-0.5 block text-[0.8125rem] leading-snug text-mut">{sub}</small>}
      </span>
      {on && !tall && (
        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-acc text-white">
          <Icon name="check" className="size-3.5" />
        </span>
      )}
    </button>
  );
}
// Seviye simgesi: 1-3 yükselen çubuk
const Bars = ({ n, big }) => (
  <span className={`flex items-end gap-[3px] ${big ? "h-7" : "h-5"}`}>
    {[1, 2, 3].map((k) => (
      <span key={k} className={`rounded-sm bg-current ${big ? "w-[7px]" : "w-[5px]"} ${k > n ? "opacity-25" : ""}`} style={{ height: `${k * (big ? 8 : 6) + 2}px` }} />
    ))}
  </span>
);
// Seçmeli şerit (30/45/60/90 dk, 4/6/8/12 hafta)
function Segment({ list, value, onChange, unit }) {
  return (
    <div className="grid rounded-2xl bg-bg p-1" style={{ gridTemplateColumns: `repeat(${list.length}, 1fr)` }}>
      {list.map((v) => (
        <button key={v} type="button" aria-pressed={value === v} onClick={() => onChange(v)} className={`h-11 rounded-xl text-[0.9375rem] font-semibold transition ${value === v ? "bg-card text-acc shadow-[0_2px_8px_-4px_rgba(0,0,0,.25)]" : "text-mut"}`}>
          {v}
          <small className="ml-0.5 text-[0.75rem] font-medium">{unit}</small>
        </button>
      ))}
    </div>
  );
}

// Sakatlık bölgeleri: seçilenler kaçınılacaklar yazısının başına "Diz, Bel" diye yazılır, kalan serbest not "·" ile ayrılır
const AREAS = ["Diz", "Bel", "Omuz", "Bilek", "Boyun", "Dirsek"];
const avoidOf = (s) => {
  const parts = String(s || "").split(/[,·]/).map((x) => x.trim()).filter(Boolean);
  const areas = AREAS.filter((a) => parts.some((p) => p.toLocaleLowerCase("tr") === a.toLocaleLowerCase("tr")));
  const rest = parts.filter((p) => !areas.some((a) => a.toLocaleLowerCase("tr") === p.toLocaleLowerCase("tr"))).join(", ");
  return { areas, rest };
};
const avoidText = (areas, rest) => [areas.join(", "), rest.trim()].filter(Boolean).join(" · ");
const PLACE_BG = { salon: "linear-gradient(135deg,#2f8f76,#174d40)", ev: "linear-gradient(135deg,#d98a4e,#a4512a)", dis: "linear-gradient(135deg,#4f9bd1,#22618f)" };
const EQUIP_KEYS = ["dumbbell", "band", "kettlebell", "bar", "bench", "barbell"];

// Bölüm kartı: başlık + sağda kısa durum, içerik altında
const Box = ({ title, note, children }) => (
  <section className="mt-3 rounded-[1.25rem] border border-line bg-card p-3.5">
    <div className="mb-3 flex items-baseline justify-between gap-2">
      <h4 className="text-[0.9375rem] font-bold">{title}</h4>
      {note && <small className="truncate text-[0.75rem] font-medium text-mut">{note}</small>}
    </div>
    {children}
  </section>
);
// Profil alanları (Program hazırla 2. adım ve Profil penceresi): seviye, yer, ekipman, ölçüler, sakatlık.
// withPlace: yer kutusu (Program hazırla'da ayrı soru). withGoal: hedef de gösterilir (Profil penceresi; Program hazırla'da hedef ayrı adım).
export function ProfileFields({ f, set, withGoal = true, withPlace = true }) {
  const eq = f.equip || [];
  const hasBody = Number(f.height) > 0 && Number(f.weight) > 0;
  const [bodyOpen, setBodyOpen] = useState(!hasBody);
  const { areas, rest } = avoidOf(f.avoid);
  const lvl = LEVELS.find(([k]) => k === f.level);
  const b = hasBody ? bmiOf({ height: Number(f.height), weight: Number(f.weight) }) : 0;
  const num = (k, label, unit) => (
    <label className="block min-w-0 rounded-xl bg-bg px-3 pb-2 pt-1.5">
      <small className="block text-[0.6875rem] font-semibold text-mut">{label}</small>
      <span className="flex items-baseline gap-1">
        <input inputMode="decimal" value={f[k] || ""} onChange={(e) => set(k, e.target.value.replace(",", "."))} placeholder="–" className="h-7 w-full min-w-0 bg-transparent text-[1.125rem] font-semibold outline-none" />
        <span className="text-[0.8125rem] text-mut">{unit}</span>
      </span>
    </label>
  );
  return (
    <>
      {withGoal && (
        <Box title="Hedef">
          <div className="space-y-2">
            {GOALS.map(([k, l]) => (
              <Option key={k} on={f.goal === k} icon={GOAL_UI[k][0]} title={l} sub={GOAL_UI[k][1]} onClick={() => set("goal", k)} />
            ))}
          </div>
        </Box>
      )}

      <Box title="Seviyen" note={lvl ? LEVEL_UI[lvl[0]][1] : "Birini seç"}>
        <div className="grid grid-cols-3 gap-2">
          {LEVELS.map(([k, l]) => {
            const on = f.level === k;
            return (
              <button key={k} type="button" aria-pressed={on} onClick={() => set("level", k)} className={`relative flex h-[5.5rem] flex-col items-center justify-center gap-2 rounded-2xl border-2 transition active:scale-[.97] ${on ? "border-acc bg-acc text-white" : "border-transparent bg-bg text-acc"}`}>
                <Bars n={LEVEL_UI[k][0]} big />
                <b className={`text-[0.8125rem] font-semibold leading-tight ${on ? "text-white" : "text-fg"}`}>{l}</b>
              </button>
            );
          })}
        </div>
      </Box>

      {withPlace && (
      <Box title="Nerede çalışacaksın">
        <div className="grid grid-cols-3 gap-2">
          {PLACES.map(([k, l]) => {
            const on = f.place === k;
            return (
              <button key={k} type="button" aria-pressed={on} onClick={() => set("place", k)} className={`relative overflow-hidden rounded-2xl text-left text-white transition active:scale-[.97] ${on ? "ring-[3px] ring-acc ring-offset-2 ring-offset-card" : "opacity-80"}`} style={{ background: PLACE_BG[k] }}>
                <Icon name={PLACE_UI[k]} className="absolute -bottom-4 -right-4 size-14 opacity-[.12]" />
                <span className="flex h-[5.5rem] flex-col justify-between p-2.5">
                  <Icon name={PLACE_UI[k]} className="size-5" />
                  <b className="text-[0.8125rem] font-semibold leading-tight">{l}</b>
                </span>
                {on && <span className="absolute right-2 top-2 grid size-5 place-items-center rounded-full bg-white text-acc"><Icon name="check" className="size-3" /></span>}
              </button>
            );
          })}
        </div>
      </Box>
      )}

      {f.place && f.place !== "salon" && (
        <Box title="Ekipman" note={eq.length ? `${eq.length} seçili` : "Vücut ağırlığı"}>
          <div className="grid grid-cols-2 gap-2">
            {[["", "Hiçbiri"], ...EQUIP_KEYS.map((k) => [k, EQUIP[k]])].map(([k, l]) => {
              const on = k ? eq.includes(k) : !eq.length;
              return (
                <button key={k || "yok"} type="button" aria-pressed={on} onClick={() => set("equip", !k ? [] : on ? eq.filter((x) => x !== k) : [...eq, k])} className={`flex h-12 items-center gap-2.5 rounded-xl border-2 px-3 text-left text-[0.875rem] font-semibold transition active:scale-[.98] ${on ? "border-acc bg-acc/[.07]" : "border-transparent bg-bg"}`}>
                  <span className={`grid size-5 shrink-0 place-items-center rounded-md border-2 ${on ? "border-acc bg-acc text-white" : "border-line"}`}>{on && <Icon name="check" className="size-3" />}</span>
                  <span className="min-w-0 truncate">{l}</span>
                </button>
              );
            })}
          </div>
        </Box>
      )}

      <Box title="Ölçülerin" note={hasBody && !bodyOpen ? "" : "Kalori ve yükler buna göre"}>
        {hasBody && !bodyOpen ? (
          <button type="button" onClick={() => setBodyOpen(true)} className="flex w-full items-center gap-2 text-left">
            {[
              [f.height, "cm", "Boy"],
              [f.weight, "kg", "Kilo"],
              [f.age || "–", "", "Yaş"],
            ].map(([v, u, l]) => (
              <span key={l} className="flex-1 rounded-xl bg-bg px-3 py-2">
                <small className="block text-[0.6875rem] font-semibold text-mut">{l}</small>
                <b className="text-[1.0625rem] font-semibold">{v}</b>
                <small className="ml-0.5 text-[0.75rem] text-mut">{u}</small>
              </span>
            ))}
            <Icon name="edit" className="ml-1 size-4 shrink-0 text-mut" />
          </button>
        ) : (
          <>
            <div className="grid grid-cols-2 rounded-xl bg-bg p-1">
              {[["k", "Kadın"], ["e", "Erkek"]].map(([k, l]) => (
                <button key={k} type="button" aria-pressed={f.sex === k} onClick={() => set("sex", k)} className={`h-9 rounded-lg text-[0.875rem] font-semibold ${f.sex === k ? "bg-card text-acc shadow-[0_2px_8px_-4px_rgba(0,0,0,.25)]" : "text-mut"}`}>{l}</button>
              ))}
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {num("height", "Boy", "cm")}
              {num("weight", "Kilo", "kg")}
              {num("age", "Yaş", "")}
            </div>
          </>
        )}
        {b > 0 && <p className="mt-2 text-[0.75rem] text-mut">VKİ {String(Math.round(b * 10) / 10).replace(".", ",")} · {bmiText(b)}</p>}
      </Box>

      <Box title="Sakatlık ya da ağrı" note="İsteğe bağlı">
        <div className="flex flex-wrap gap-2">
          {AREAS.map((a) => {
            const on = areas.includes(a);
            return (
              <button key={a} type="button" aria-pressed={on} onClick={() => set("avoid", avoidText(on ? areas.filter((x) => x !== a) : [...areas, a], rest))} className={pill(on)}>
                {on && <Icon name="check" className="-ml-1 mr-1 inline size-3.5" />}
                {a}
              </button>
            );
          })}
        </div>
        <input value={rest} onChange={(e) => set("avoid", avoidText(areas, e.target.value))} placeholder="Başka bir not: ör. sırt üstü yatamıyorum" className="mt-2 h-11 w-full min-w-0 rounded-xl bg-bg px-3 text-[0.875rem] outline-none" />
      </Box>
    </>
  );
}
// Program hazırla, tek ekran: kimin için, ne için, günler ve saat. Gerisi varsayılanla (45 dk, 4 hafta, bugün başlar,
// yer ve seviye profilden) ve kapalı "Ayrıntılar"da. Sonunda yapay zekaya giden cümle ya da boş program. Serbest yazı kutusu yok (tek asistan kuralı).
// athletes: [{ uid, name }] (yalnız ana hesapta, hesabı olan sporcular); forUid: sporcunun sayfasından açıldıysa seçili sporcu
// Üç yol: yapay zeka seçimlere göre hazırlar ("ai"), elindeki programı (PDF, fotoğraf, metin) okur ("file"), hazır program ("tpl").
// onImport({ file, text, ask }, f, pre), onTemplate(id, f, pre): sonuç kaydedilmeden düzenleme ekranında açılır.
export function NewProgram({ open, onClose, profile, onAsk, onBlank, onImport, onTemplate, busy, goal, athletes = [], forUid = "", error = "" }) {
  const [mode, setMode] = useState("ai");
  const [file, setFile] = useState(null);
  const [paste, setPaste] = useState("");
  const [ask, setAsk] = useState("");
  const [days, setDays] = useState([1, 3, 5]);
  const [slot, setSlot] = useState("sabah");
  const [time, setTime] = useState("07:00");
  const [weeks, setWeeks] = useState(4);
  const [min, setMin] = useState(45);
  const [start, setStart] = useState(todayStr());
  const [more, setMore] = useState(false);
  const base = { goal: "saglik", level: "yeni", place: "salon", equip: [] };
  const [who, setWho] = useState(forUid);
  // Sporcunun doğum tarihi Kişiler kaydındaysa yaşı hemen; yoksa kulüp kartından (aşağıda)
  const birthAge = (id) => ageFrom(athletes.find((a) => a.uid === id)?.birth, todayStr());
  const [f, setF] = useState(() => (forUid ? { ...base, sport: "yelken", ...(birthAge(forUid) ? { age: birthAge(forUid) } : {}) } : { ...base, ...profile, ...(goal ? { goal } : {}) }));
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  // Sporcu seçilince senin boy/kilo/seviyen ona taşınmaz: varsayılanlarla başlar
  // Sporcu için spor (varsayılan yelken) ve yaş: doğum tarihinden ("birth"), bilinmezse yaş grubu seçilir ("group")
  const [ageSrc, setAgeSrc] = useState(() => (forUid && birthAge(forUid) ? "birth" : ""));
  const pickWho = (id) => {
    if (id === who) return;
    setWho(id);
    const age = id ? birthAge(id) : 0;
    setAgeSrc(age ? "birth" : "");
    setF((x) => (id ? { ...base, goal: x.goal, sport: "yelken", ...(age ? { age } : {}) } : { ...base, ...profile, goal: x.goal }));
  };
  const whoName = athletes.find((a) => a.uid === who)?.name || "";
  // Sporcu seçilince yaş doğum tarihinden: önce Kişiler kaydı, yoksa kulüp kartı (3 dk bellekte, adı yapay zekaya gitmez)
  useEffect(() => {
    if (!who) return;
    const a = athletes.find((x) => x.uid === who);
    if (!a?.athleteId) return;
    let stop = false;
    const put = (birth, g, body) => {
      const age = ageFrom(birth, todayStr());
      if (stop) return;
      // Son boy/kilo sporcu sayfasındaki ölçümlerden (boşsa)
      const { h, kg } = lastBody(body);
      setF((x) => ({
        ...x,
        ...(age && !x.age ? { age } : {}),
        ...(sexFrom(g) ? { sex: sexFrom(g) } : {}),
        ...(h && !Number(x.height) ? { height: h } : {}),
        ...(kg && !Number(x.weight) ? { weight: kg } : {}),
      }));
      if (age) setAgeSrc((s) => s || "birth");
    };
    if (a.athleteId)
      import("@/features/athletes/data")
        .then(({ loadAthletes }) => loadAthletes())
        .then(({ athletes: list }) => {
          const c = list.find((x) => x.id === a.athleteId);
          if (c) put(a.birth || c.studentBirthDate, c.studentGender, c.body);
        })
        .catch(() => {});
    return () => {
      stop = true;
    };
  }, [who, athletes]);
  const group = ageGroupOf(f.age);
  const pickSlot = ([k, , , t]) => {
    setSlot(k);
    setTime(t);
  };
  const sorted = [...days].sort((a, b) => a - b);
  // Yapay zekaya giden cümle: seçilenler (ve varsayılanlar) açıkça yazılır
  const text = () =>
    [
      `Haftada ${sorted.length} gün fitness programı hazırla: ${sorted.map((d) => `${DOW_LONG[d]} ${time}`).join(", ")}.`,
      `${weeks} hafta, her antrenman ${min} dakika, başlangıç ${start}.`,
      `Hedef: ${labelOf(GOALS, f.goal)}. Seviye: ${labelOf(LEVELS, f.level)}. Yer: ${labelOf(PLACES, f.place)}.`,
      f.place !== "salon" && (f.equip?.length ? `Ekipman: ${f.equip.map((k) => EQUIP[k]).join(", ")}.` : "Ekipman yok, yalnız vücut ağırlığı."),
      f.avoid && `Kaçınılacak: ${f.avoid}.`,
      who && f.age && (ageSrc === "group" ? `Sporcu ${group} yaş grubunda.` : `Sporcu ${f.age} yaşında.`),
      who && f.sport && `Spor: ${labelOf(SPORTS, f.sport)}. Program bu spora yardımcı olsun.`,
    ]
      .filter(Boolean)
      .join(" ");
  const pre = { days: sorted, time, weeks, min, start, ...(who ? { for: who, forName: whoName } : {}) };
  // Eksik seçim: düğmenin üstünde yazar (önceden düğme yalnız soluk kalıyordu)
  const missing = !sorted.length ? "En az bir gün seç." : !f.goal ? "Hedef seç." : !f.place ? "Nerede çalışılacağını seç." : !time ? "Saati seç." : who && !f.age ? "Sporcunun yaşını seç." : "";
  const startText = start === todayStr() ? "bugün" : new Date(`${start}T12:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "long" });

  const chips = (list, value, onPick) => (
    <div className="flex flex-wrap gap-2">
      {list.map(([k, l]) => (
        <button key={k} type="button" aria-pressed={value === k} onClick={() => onPick(k)} className={pill(value === k)}>
          {l}
        </button>
      ))}
    </div>
  );

  // Tek ekran: kimin için (sporcu seçiliyse tek satır), ne için, günler ve saat; yer, süre, hafta, seviye kapalı "Ayrıntılar"da
  const [picking, setPicking] = useState(!forUid);
  const initials = (s) => s.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toLocaleUpperCase("tr-TR");
  const slotName = SLOTS.find(([k]) => k === slot)?.[1];
  const details = [labelOf(PLACES, f.place), labelOf(LEVELS, f.level), `${min} dk`, `${weeks} hafta`, startText === "bugün" ? "" : `${startText} başlar`].filter(Boolean).join(" · ");
  return (
    <Sheet open={open} onClose={onClose} title="Program hazırla">
      {athletes.length > 0 && (
        <Box title="Kimin için">
          {who && !picking ? (
            <div className="flex items-center gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-acc/10 text-[0.9375rem] font-bold text-acc">{initials(whoName)}</span>
              <span className="min-w-0 flex-1">
                <b className="block truncate text-[1rem] font-semibold">{whoName}</b>
                <small className="block truncate text-[0.8125rem] text-mut">{[f.age ? `${f.age} yaş` : "", labelOf(SPORTS, f.sport)].filter(Boolean).join(" · ")}</small>
              </span>
              <button type="button" onClick={() => setPicking(true)} className="h-9 shrink-0 px-1 text-[0.875rem] font-semibold text-acc">
                Değiştir
              </button>
            </div>
          ) : (
            chips([["", "Ben"], ...athletes.map((a) => [a.uid, a.name])], who, (id) => (pickWho(id), setPicking(!id)))
          )}
        </Box>
      )}
      {who && (!f.age || ageSrc === "group") && (
        <Box title="Yaşı" note="Doğum tarihi yok, yaş grubunu seç">
          {chips(AGE_GROUPS.map(([k]) => [k, k]), group, (k) => (set("age", AGE_GROUPS.find(([x]) => x === k)[1]), setAgeSrc("group")))}
        </Box>
      )}
      <div className="mt-3 grid grid-cols-3 rounded-2xl bg-bg p-1">
        {[["ai", "Yapay zeka"], ["file", "PDF / metin"], ["tpl", "Hazır program"]].map(([k, l]) => (
          <button key={k} type="button" aria-pressed={mode === k} onClick={() => setMode(k)} className={`h-11 rounded-xl text-[0.8125rem] font-semibold transition ${mode === k ? "bg-card text-acc shadow-[0_2px_8px_-4px_rgba(0,0,0,.25)]" : "text-mut"}`}>
            {l}
          </button>
        ))}
      </div>
      {mode === "file" && (
        <>
          <Box title="Elindeki program" note="PDF, fotoğraf ya da metin">
            <label className="flex h-12 cursor-pointer items-center gap-2.5 rounded-xl bg-bg px-3 text-[0.875rem] font-semibold">
              <Icon name="paperclip" className="size-5 shrink-0 text-acc" />
              <span className="min-w-0 flex-1 truncate">{file ? file.name : "PDF ya da fotoğraf seç"}</span>
              {file && (
                <button type="button" aria-label="Dosyayı kaldır" onClick={(e) => (e.preventDefault(), setFile(null))} className="grid size-7 place-items-center rounded-full text-mut">
                  <Icon name="x" className="size-4" />
                </button>
              )}
              <input type="file" accept="application/pdf,image/*,text/plain,.pdf,.txt" className="hidden" onChange={(e) => (setFile(e.target.files?.[0] || null), (e.target.value = ""))} />
            </label>
            <textarea value={paste} onChange={(e) => setPaste(e.target.value)} rows={5} placeholder="ya da programın metnini buraya yapıştır" className="mt-2 w-full min-w-0 resize-y rounded-xl bg-bg px-3 py-2.5 text-[0.875rem] outline-none" />
            <p className="mt-2 text-[0.75rem] leading-snug text-mut">Yapay zeka bütün antrenmanları, set, tekrar, süre, dinlenme, nefes, çanta ağırlığı ve notlarla okur. Sonra düzenleyip kaydedersin.</p>
          </Box>
          <Box title="Eklemek istediğin" note="İsteğe bağlı">
            <textarea value={ask} onChange={(e) => setAsk(e.target.value)} rows={2} placeholder="ör. Salı ve perşembe 17:45, 4 hafta; Cuma günü olmasın" className="w-full min-w-0 resize-y rounded-xl bg-bg px-3 py-2.5 text-[0.875rem] outline-none" />
          </Box>
        </>
      )}
      {mode === "tpl" && (
        <Box title="Hazır programlar" note={who ? `${whoName} için` : ""}>
          <div className="space-y-2">
            {TEMPLATES.map((t) => (
              <div key={t.id} className="rounded-2xl bg-bg p-3">
                <b className="block text-[0.9375rem] font-semibold">{t.title}</b>
                <small className="mt-0.5 block text-[0.8125rem] leading-snug text-mut">{t.sub}</small>
                <Button className="mt-2.5" loading={busy} onClick={() => onTemplate?.(t.id, f, pre)}>
                  <Icon name="plus" className="size-5" />
                  Örnek programı ekle
                </Button>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[0.75rem] leading-snug text-mut">Program düzenleme ekranında açılır; günleri, saati ve hareketleri değiştirip kaydedersin.</p>
        </Box>
      )}
      {mode !== "ai" && (
        <Box title="Başlangıç">
          <label className="flex h-11 items-center justify-between rounded-xl bg-bg px-3">
            <span className="text-[0.875rem] text-mut">İlk hafta</span>
            <input type="date" value={start} min={todayStr()} onChange={(e) => setStart(e.target.value)} className="appearance-none bg-transparent text-right text-[0.9375rem] font-semibold outline-none" />
          </label>
        </Box>
      )}
      {mode === "ai" && (
      <>
      <Box title="Ne için">{chips(GOALS, f.goal, (k) => set("goal", k))}</Box>
      <Box title="Günler ve saat" note={sorted.length ? `Haftada ${sorted.length} gün` : "En az bir gün seç"}>
        <div className="grid grid-cols-7 gap-1.5">
          {DOWS.slice(1).map((d, i) => {
            const on = days.includes(i + 1);
            return (
              <button key={d} type="button" aria-pressed={on} onClick={() => setDays(on ? days.filter((x) => x !== i + 1) : [...days, i + 1])} className={`aspect-square rounded-full text-[0.8125rem] font-bold transition active:scale-90 ${on ? "bg-acc text-white" : "bg-bg text-mut"}`}>
                {d}
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {SLOTS.map((s) => (
            <button key={s[0]} type="button" aria-pressed={slot === s[0]} onClick={() => pickSlot(s)} className={pill(slot === s[0])}>
              {slot === s[0] ? `${s[1]} ${time}` : s[1]}
            </button>
          ))}
          {!slotName && <span className={pill(true)}>{time}</span>}
        </div>
      </Box>

      {/* Ayrıntılar: varsayılanlar yazılı, istenirse açılır */}
      <button type="button" aria-expanded={more} onClick={() => setMore(!more)} className="mt-3 flex w-full items-center gap-2 rounded-[1.25rem] border border-line bg-card px-3.5 py-3 text-left">
        <b className="shrink-0 text-[0.9375rem] font-bold">Ayrıntılar</b>
        <small className="min-w-0 flex-1 truncate text-right text-[0.8125rem] text-mut">{more ? "" : details}</small>
        <Icon name="chev" className={`size-4 shrink-0 text-mut transition-transform ${more ? "-rotate-90" : "rotate-90"}`} />
      </button>
      {more && (
        <>
          <Box title="Nerede">{chips(PLACES, f.place, (k) => set("place", k))}</Box>
          {who && (
            <Box title="Yaşı ve sporu" note={ageSrc === "birth" ? "Yaş doğum tarihinden" : ""}>
              <div className="flex items-center gap-3">
                <button type="button" aria-label="Azalt" onClick={() => (set("age", Math.max(6, (f.age || 12) - 1)), setAgeSrc("hand"))} className="grid size-10 place-items-center rounded-full bg-bg text-[1.25rem] font-bold">−</button>
                <span className="min-w-16 text-center text-[1.375rem] font-bold tabular-nums">{f.age ? `${f.age} yaş` : "—"}</span>
                <button type="button" aria-label="Artır" onClick={() => (set("age", Math.min(60, (f.age || 11) + 1)), setAgeSrc("hand"))} className="grid size-10 place-items-center rounded-full bg-bg text-[1.25rem] font-bold">+</button>
              </div>
              <div className="mt-3">{chips(SPORTS, f.sport, (k) => set("sport", k))}</div>
            </Box>
          )}
          <Box title="Saat ve süre">
            <label className="flex h-11 items-center justify-between rounded-xl bg-bg px-3">
              <span className="text-[0.875rem] text-mut">Saat</span>
              <input type="time" value={time} onChange={(e) => (setTime(e.target.value), setSlot(""))} className="appearance-none bg-transparent text-right text-[0.9375rem] font-semibold outline-none" />
            </label>
            <small className="mb-1.5 mt-3 block text-[0.75rem] font-semibold text-mut">Her antrenman</small>
            <Segment list={[30, 45, 60, 90]} value={min} onChange={setMin} unit="dk" />
            <small className="mb-1.5 mt-3 block text-[0.75rem] font-semibold text-mut">Program</small>
            <Segment list={[4, 6, 8, 12]} value={weeks} onChange={setWeeks} unit="hafta" />
            <label className="mt-3 flex h-11 items-center justify-between rounded-xl bg-bg px-3">
              <span className="text-[0.875rem] text-mut">Başlangıç</span>
              <input type="date" value={start} min={todayStr()} onChange={(e) => setStart(e.target.value)} className="appearance-none bg-transparent text-right text-[0.9375rem] font-semibold outline-none" />
            </label>
          </Box>
          <ProfileFields f={f} set={set} withGoal={false} withPlace={false} />
        </>
      )}
      </>
      )}

      {/* Alt düğmeler; eksik ya da hata burada açıkça yazar */}
      <div className="sticky bottom-0 -mx-5 mt-5 bg-card px-5 pt-3">
        {((mode === "ai" && missing) || error) && (
          <p role="alert" className="mb-2 rounded-xl bg-red-50 px-3 py-2 text-[0.8125rem] font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {(mode === "ai" && missing) || error}
          </p>
        )}
        {mode === "file" && (
          <div className="flex flex-col gap-1 pb-2">
            <Button loading={busy} disabled={!file && paste.trim().length < 30} onClick={() => onImport?.({ file, text: paste, ask }, f, pre)}>
              <Icon name="spark" className="size-5" />
              Programı oku
            </Button>
            {busy && <small className="text-center text-[0.75rem] text-mut">Uzun programlarda bir dakika sürebilir.</small>}
          </div>
        )}
        {mode === "ai" && (
        <div className="flex flex-col gap-1">
          <Button loading={busy} disabled={!!missing} onClick={() => onAsk(text(), f, pre)}>
            <Icon name="spark" className="size-5" />
            {who ? "Programı hazırla" : "Programımı hazırla"}
          </Button>
          <button type="button" disabled={busy || !!missing} onClick={() => onBlank(pre, f)} className="h-10 px-2 text-[0.875rem] font-semibold text-mut">
            Kendim hazırlayacağım
          </button>
        </div>
        )}
      </div>
    </Sheet>
  );
}
