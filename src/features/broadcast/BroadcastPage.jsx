"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { BackButton } from "@/components/ui/BackButton";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { card } from "@/components/ui/Page";
import { useToast } from "@/components/ui/ToastProvider";
import { loadRace } from "@/features/athletes/races";
import { raceDays } from "@/features/athletes/raceWeather";
import { addCourseObs, loadCourse, loadLive, loadRoundsOf, savePlan, saveRounds, saveStarts } from "@/features/athletes/raceLiveStore";
import { GROUP_PICK, groupColor } from "@/lib/roundScore";
import { Countdown, ownHere, useTimerRun } from "@/features/training/Countdown";
import { useLiveSync } from "@/features/raceMedia/useLiveSync";
import { VoidSheet, useRaceFlow } from "@/features/raceMedia/useRaceFlow";
import { AddSheet } from "@/features/raceMedia/CourseTab";
import { RoundsScreen } from "@/features/rounds/RoundsScreen";
import { EntriesView } from "@/features/rounds/EntriesView";
import { loadEntryDoc } from "@/features/rounds/roundsStore";
import { ensurePublic, liveUrl, recName, setStream, showOnScreen } from "@/features/liveScreen/liveActions";
import { AP_MIN, AP_WHY, addMin, apText, cleanLive, cleanPlan, dirShort, nextRaceNo, ownedBy, raceName, raceTitle, zeroRace } from "@/lib/raceLive";
import { cleanCourse, cleanObs, obsTitle, withLiveWind } from "@/lib/raceCourse";
import { cardOf, cardSvg } from "@/lib/courseCard";
import { CLASS_PICK, PREP_PICK, currentStart, markName, prepName, ytEmbed } from "@/lib/raceRounds";
import { todayStr } from "@/lib/utils/format";

// Yarışın yayın sayfası (/athletes/races/<id>/yayin, yalnız ana hesap; Seyhun 2026-11-01 "herkese açık multimedyasını ayrı bir sayfada
// yöneteceğiz"): herkese açık /canli ekranına giden her şey tek yerde. Lacivert üstte start sayacı (Başlat · İptal · Eşitle; sayaç diğer
// cihazlara ve herkese açık sayfaya useLiveSync ile gider), Linki kopyala / Ekranı aç. Açık alanda üç bölüm:
// Ekranda (canlı yayın linki ya da bu yarışın videoları, telefondan seçilen video yüklenir; dikey/yatay yazılır; Göster ekrana verir),
// Parkur ve rüzgâr (son rüzgâr, parkur kartı, ölçüm ekleme; Parkur sekmesiyle aynı kayıt), Dönüşler (sesle giriş, kayıt listesi),
// Sonuç PDF'i ayrı sayfada (/sonuclar, 2026-11-01); Linki kopyala, Ekranı aç, Kayıt listesi, gün durumu ⋯ menüsünde. Multimedya sayfası kalktı (Seyhun 2026-11-01 "tek bu yayın olanı kullanacağız").
// Bugünün startları tek liste (Seyhun 2026-11-01 "sınıf/grup seçimi ile sıra ekleme birbirinden bağımsız olamaz"): biten ve süren startlar
// saatiyle üstte, sonra yapılacak startlar (raceLive.plan.order [{ cls, grp, prep }]); ilk bekleyen "Sıradaki"dir, sayacın üstünde yazar ve
// Başlat onun sınıf/grup/bayrağını rounds[start]'a yazıp listeden düşer. "Start ekle" satır ekler; satıra dokununca sınıf, grup, bayrak,
// Yukarı/Aşağı/Çıkar aynı yerde. Biten yarışın seçimi de satırından düzeltilir.
const hm = (iso) => (iso ? new Date(iso).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }) : "");
const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const orient = (m) => (m.w && m.h ? (m.h > m.w ? "Dikey" : "Yatay") : "");

export function BroadcastPage({ orgId, id }) {
  const toast = useToast();
  const today = todayStr();
  const [race, setRace] = useState(null);
  const [live, setLive] = useState(() => cleanLive({}));
  const [L, setL] = useState(null); // rounds, screen, stream (loadRoundsOf)
  const [course, setCourse] = useState(() => cleanCourse({}));
  const [yt, setYt] = useState("");
  const [sel, setSel] = useState(null); // ekrana verilecek seçim { kind, mid }
  const [busy, setBusy] = useState("");
  const [add, setAdd] = useState(null); // ölçüm penceresi: PICKS sırası
  const [voice, setVoice] = useState(false);
  const [list, setList] = useState(false);
  const [entries, setEntries] = useState([]);
  const [groups, setGroups] = useState({});
  const [pickId, setPickId] = useState(""); // listede seçilen biten start (boşsa sayacın yarışı)
  const [editI, setEditI] = useState(-1); // listede açık olan bekleyen start (plan.order sırası)
  const [menu, setMenu] = useState(false); // ⋯ menüsü (Seyhun 2026-11-01 "çok fazla buton, yanlışlıkla tıklanmasın": az kullanılan ve riskli işler burada)
  const [askEnd, setAskEnd] = useState(false); // Günü bitir bir daha sorar
  const [ap, setAp] = useState(null); // tehir penceresi { min, why } (Seyhun 2026-11-01 "bir sebep belirterek tehir, bir saatlik")
  const [plan, setPlan] = useState(() => cleanPlan({})); // günün programı (raceLive.plan; herkese açık ekranın evresi buna göre)
  const file = useRef(null);
  const liveIn = useRef(false); // yarışlar yüklendi mi (yüklenmeden boş listeye yazılırsa günün yarışları silinirdi; multimedya sayfasındaki koruma)
  const rdays = race ? raceDays(race) : null;

  const reload = useCallback(
    () =>
      loadRoundsOf(orgId, id).then((d) => {
        setL(d);
        return d;
      }),
    [orgId, id],
  );
  useEffect(() => {
    let on = true;
    loadRace(orgId, id).then((r) => on && setRace(r || {}), () => on && setRace({}));
    loadLive(orgId, id).then((l) => on && ((liveIn.current = true), setLive(l)), () => {});
    loadCourse(orgId, id, today).then((c) => on && setCourse(c), () => {});
    loadEntryDoc(orgId, id).then((d) => on && (setEntries(d.rows), setGroups(d.groups)), () => {});
    reload().then((d) => {
      if (!on) return;
      setPlan(d.plan);
      setYt(d.stream.url);
      setSel(d.screen.kind ? { kind: d.screen.kind, mid: d.screen.mid } : null);
    }, () => toast("Yüklenemedi, tekrar dene."));
    ensurePublic(id).catch(() => {});
    return () => {
      on = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, id, today]);

  // Bu sayfada yapılan değişiklik hemen görünür; kayıt arkada gider
  const change = useCallback(
    (patch, job) => {
      setLive((l) => cleanLive({ ...l, ...(typeof patch === "function" ? patch(l) : patch) }));
      Promise.resolve(job?.()).catch(() => toast("Kaydedilemedi. İnterneti kontrol et."));
    },
    [toast],
  );
  // Sayaç 0 olunca günün sıradaki yarışı start saati ve son rüzgârla yazılır (RaceMedia ile aynı)
  const onZero = useCallback(
    (end, t) => {
      if (Date.now() - end > 20 * 60e3) return;
      if (!liveIn.current) return;
      if (t?.mode !== "start" || !t.rid || !ownedBy(t.own, ownHere())) return;
      change((l) => {
        const next = zeroRace(l.starts, t.rid, end, l.wind, rdays);
        if (next === l.starts) return {};
        saveStarts(orgId, id, next).catch(() => {});
        return { starts: next };
      });
    },
    [change, orgId, id, rdays],
  );
  const tr = useTimerRun({ onZero });
  useLiveSync({ orgId, raceId: id, setLive });
  const rf = useRaceFlow({ orgId, raceId: id, live, onChange: change, rdays, today });
  const cur = tr.t.end != null || tr.t.left != null ? live.starts.find((x) => x.id === rf.ridOf(tr.t)) : null;
  // Program: değişiklik hemen görünür, kayıt arkada (savePlan)
  const tomorrow = new Date(Date.parse(`${today}T12:00:00`) + 864e5).toLocaleDateString("sv-SE");
  const changePlan = (patch) => {
    const next = cleanPlan({ ...plan, ...patch });
    setPlan(next);
    savePlan(orgId, id, next).catch(() => toast("Kaydedilemedi. İnterneti kontrol et."));
  };
  const planDay = plan.day || today;
  const nextPlan = plan.order[0] || null; // sıradaki start (listenin ilk bekleyeni)
  // Tehir: start saati min dakika ileri alınır (0 = belirsiz, saat silinir), sebep ekranda yazar; "Erteleme kalktı" eski saati geri getirir
  const postpone = () => {
    const from = plan.ap?.from || plan.at;
    changePlan({ day: planDay, status: "ap", at: ap.min ? addMin(from, ap.min) : "", ap: { from, why: ap.why } });
    setAp(null);
  };
  const unpostpone = () => changePlan({ day: planDay, status: "", at: plan.ap?.from || plan.at, ap: null });
  // Başlat: yarış açılır, sıradaki startın sınıf/grup/bayrağı o startın dönüş kaydına yazılır ve listeden düşer
  const flow = {
    ...rf.flow,
    onStart: (end, rid, prevT) => {
      if (!liveIn.current) return toast("Yarışlar yükleniyor, bir saniye sonra tekrar başlat.");
      rf.flow.onStart(end, rid, prevT);
      if (!nextPlan) return;
      const { cls, grp, prep } = nextPlan;
      if (rid) saveRounds(orgId, id, rid, { ...(L?.rounds?.[rid] || { route: [], legs: [] }), grp, cls, prep }).then(reload, () => {});
      setEditI(-1);
      changePlan({ order: plan.order.slice(1) });
    },
  };
  // Bekleyen start satırı: ekle, düzenle, sırala, çıkar
  const editRow = (i, patch) => changePlan({ order: plan.order.map((o, k) => (k === i ? { ...o, ...patch } : o)) });
  const moveRow = (i, d) => {
    const j = i + d;
    if (j < 0 || j >= plan.order.length) return;
    const order = [...plan.order];
    [order[i], order[j]] = [order[j], order[i]];
    changePlan({ order });
    setEditI(j);
  };
  const addRow = () => {
    if (plan.order.length >= 12) return toast("En çok 12 start.");
    const last = plan.order.at(-1);
    const o = { cls: last?.cls || "Optimist", grp: "", prep: last?.prep || "" };
    changePlan({ order: [...plan.order, o] });
    setPickId("");
    setEditI(plan.order.length);
  };
  // Biten yarışın grubu / sınıfı / bayrağı düzeltilir (rounds[sid])
  const setPickOf = async (sid, patch) => {
    try {
      await saveRounds(orgId, id, sid, { ...(L?.rounds?.[sid] || { route: [], legs: [] }), ...patch });
      await reload();
    } catch {
      toast("Kaydedilemedi. İnterneti kontrol et.");
    }
  };

  const copy = async () => {
    try {
      await ensurePublic(id);
      await navigator.clipboard.writeText(liveUrl(id));
      toast("Link kopyalandı");
    } catch (e) {
      toast(e?.message || "Kopyalanamadı");
    }
  };
  const openScreen = async () => {
    const w = window.open("", "_blank");
    try {
      await ensurePublic(id);
      if (w) w.location.href = liveUrl(id);
      else window.location.href = liveUrl(id);
    } catch (e) {
      w?.close();
      toast(e?.message || "Açılamadı");
    }
  };
  const show = async (s) => {
    setBusy("x");
    try {
      if (s.kind === "live" && yt !== (L?.stream.url || "")) await setStream(orgId, id, yt);
      await showOnScreen(orgId, id, s);
      setSel(s.kind ? { kind: s.kind, mid: s.mid } : null);
      toast(s.kind ? "Ekranda" : "Ekrandan kaldırıldı");
      await reload();
    } catch {
      toast("Kaydedilemedi, tekrar dene.");
    }
    setBusy("");
  };
  const pick = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    try {
      const { uploadForScreen } = await import("./broadcastStore");
      const meta = await uploadForScreen(orgId, id, f, live.starts, setBusy);
      setLive((l) => cleanLive({ ...l, media: [...l.media, meta] }));
      setBusy("");
      await show({ kind: "rec", mid: meta.id, loop: false });
    } catch (err) {
      toast(err?.message || "Yüklenemedi");
      setBusy("");
    }
  };
  const addObs = async (o) => {
    setAdd(null);
    const obs = cleanObs(o);
    setCourse((c) => cleanCourse({ ...c, obs: [...c.obs, obs] }));
    try {
      await addCourseObs(orgId, id, today, obs);
      toast(`${obsTitle(obs)} · ${obs.deg}°`);
    } catch {
      toast("Kaydedilemedi. İnterneti kontrol et.");
    }
  };

  const vids = [...live.media].filter((m) => m.kind === "video").reverse().slice(0, 6);
  const ytOk = !!ytEmbed(yt);
  const ytBad = !!yt.trim() && !ytOk;
  const onScreen = L?.screen.kind ? L.screen : null;
  const isOn = (k, mid = "") => onScreen?.kind === k && (k !== "rec" || onScreen.mid === mid);
  const isSel = (k, mid = "") => sel?.kind === k && (k !== "rec" || sel.mid === mid);
  const c = withLiveWind(course, live.wind, today);
  const wind = [...c.obs].reverse().find((x) => x.kind === "wind");
  const svg = (() => {
    try {
      return cardSvg(cardOf(c));
    } catch {
      return "";
    }
  })();
  const st = (pickId && live.starts.find((x) => x.id === pickId)) || (L ? currentStart(live.starts, L.timer) : null);
  const entry = st && L ? L.rounds[st.id] : null;
  const todays = [...live.starts].filter((x) => x.day === today); // eskiden yeniye (listede 1., 2., …)
  const nextNo = nextRaceNo(live.starts, today, rdays);
  const stE = st ? L?.rounds?.[st.id] || {} : {};
  const stGrp = stE.grp || "";
  // Seçim çipleri: Sınıf, Grup, Bayrak; set(key, değer) satırın kaydına yazar (bekleyen start: plan.order; biten yarış: rounds[sid])
  const chipRows = (val, set, size = "h-7 px-2.5") => [
    ["Sınıf", CLASS_PICK, "cls", false],
    ["Grup", GROUP_PICK, "grp", true],
    ["Bayrak", PREP_PICK, "prep", false],
  ].map(([lab, list, key, dot]) => (
    <div key={key} className="flex items-center gap-2">
      <span className="w-11 shrink-0 text-[0.8125rem] text-mut">{lab}</span>
      <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto [scrollbar-width:none]">
        {list.map((g) => (
          <button key={g} type="button" aria-pressed={val[key] === g} onClick={() => set(key, val[key] === g ? "" : g)} className={`flex ${size} shrink-0 items-center gap-1.5 rounded-full text-[0.8125rem] font-semibold ${val[key] === g ? "bg-acc text-white" : "bg-bg"}`}>
            {dot ? <span className="size-2 rounded-full" style={{ background: groupColor(g) }} aria-hidden="true" /> : null}
            {key === "prep" && g === "Kara" ? "Kara bayrak" : g}
          </button>
        ))}
      </div>
    </div>
  ));
  const pickText = (e, name) => [e.cls, e.grp ? `${e.grp} grup` : "", name, prepName(e.prep)].filter(Boolean).join(" · ");
  const row = "flex w-full items-center gap-3 px-4 py-3 text-left";

  return (
    <main className="mx-auto max-w-[30rem] px-5 pb-[calc(env(safe-area-inset-bottom)+2rem)]">
      <section className="ck -mx-5 px-5 pb-9 pt-[calc(0.75rem+env(safe-area-inset-top))]" aria-label="Yayın">
        <header className="flex items-center gap-2.5">
          <BackButton href={`/athletes/races/${id}`} />
          <div className="min-w-0 flex-1 leading-tight">
            <h1 className="truncate text-[1.375rem] font-bold tracking-[-.02em]">{cur ? `Yayın · ${raceName(cur)}` : "Yayın"}</h1>
            <p className="truncate text-[0.8125rem] text-white/65">{race?.name || ""}</p>
          </div>
          <button type="button" onClick={() => setMenu(true)} aria-label="Diğer işler" data-press className="ck-glass flex size-9 shrink-0 items-center justify-center rounded-full text-[1.25rem] font-bold leading-none">
            ⋯
          </button>
        </header>
        {cur ? (
          // Başlat'tan sonra seçim kilitli: grup ve kaçıncı yarış yalnız yazar (Seyhun 2026-11-01 "yarış seçimi yapılıp kapanmalı")
          <div className="mt-3 flex h-8 items-center gap-2 text-[0.9375rem] font-semibold">
            {stGrp ? <span className="size-2.5 shrink-0 rounded-full" style={{ background: groupColor(stGrp) }} aria-hidden="true" /> : null}
            <span className="truncate">{pickText(stE, raceName(cur))}</span>
          </div>
        ) : (
          // Sıradaki start listeden gelir (Bugünün startları'nın ilk bekleyeni); Başlat'ta o startın kaydına yazılır
          <div className="mt-3">
            <p className="text-[0.8125rem] text-white/65">{`Sıradaki · ${nextNo}. yarış`}</p>
            <div className="flex h-7 items-center gap-2 text-[1.0625rem] font-semibold">
              {nextPlan?.grp ? <span className="size-2.5 shrink-0 rounded-full" style={{ background: groupColor(nextPlan.grp) }} aria-hidden="true" /> : null}
              <span className={`truncate ${nextPlan ? "" : "text-white/65"}`}>{nextPlan ? pickText(nextPlan, "") : "Start seçilmedi"}</span>
            </div>
          </div>
        )}
        <Countdown dark mode="start" race={flow} startRace title={cur ? raceName(cur) : ""} where={race?.name || "Yarış"} />
      </section>

      <div className="relative -mx-5 -mt-6 space-y-6 rounded-t-[1.75rem] bg-bg px-5 pb-1 pt-5">
        {/* Bugünün startları (Seyhun 2026-11-01): biten/süren startlar saatiyle, sonra bekleyenler; ilk bekleyen Sıradaki. Satıra dokununca
            sınıf, grup, bayrak, sıra ve çıkar aynı yerde. Program: ilk start saati, erteleme / yarış yok / günü bitir, yarının saati. */}
        <section>
          <Head title="Bugünün startları" right={plan.status === "done" ? "Gün bitti" : plan.status === "none" ? "Bugün yarış yok" : plan.status === "ap" ? "Start ertelendi" : plan.at ? `İlk start ${plan.at}` : `${todays.length + plan.order.length} start`} />
          <div className={`${card} overflow-hidden`}>
            {todays.map((x, i) => {
              const e = L?.rounds?.[x.id] || {};
              const g = e.grp || "";
              const on = st?.id === x.id && cur?.id !== x.id;
              const state = cur?.id === x.id ? "Canlı" : x.void ? x.void : x.fin ? "Bitti" : "";
              return (
                <div key={x.id} className={`border-b border-line ${on ? "bg-accbg" : ""}`}>
                  <button type="button" onClick={() => (setEditI(-1), setPickId(on ? "" : x.id))} className={row}>
                    <span className="w-6 shrink-0 text-mut">{i + 1}.</span>
                    {g ? <span className="size-2.5 shrink-0 rounded-full" style={{ background: groupColor(g) }} aria-hidden="true" /> : null}
                    <span className={`min-w-0 flex-1 truncate font-semibold ${on ? "text-acc" : ""}`}>{[e.cls, g, e.prep].filter(Boolean).join(" · ") || raceTitle(x)}</span>
                    <span className={`shrink-0 text-[0.875rem] ${cur?.id === x.id ? "font-semibold text-acc" : "text-mut"}`}>{[hm(x.at), state].filter(Boolean).join(" · ")}</span>
                  </button>
                  {on && (
                    // Biten yarışın sınıfı / grubu / bayrağı yanlış seçildiyse burada düzeltilir (süren yarışta kilitli)
                    <div className="space-y-2 border-t border-line px-4 py-2.5">{chipRows(e, (k, v) => setPickOf(x.id, { [k]: v }))}</div>
                  )}
                </div>
              );
            })}
            {plan.order.map((o, i) => {
              const on = editI === i;
              return (
                <div key={i} className={`border-b border-line ${on || i === 0 ? "bg-accbg" : ""}`}>
                  <button type="button" onClick={() => (setPickId(""), setEditI(on ? -1 : i))} className={row}>
                    <span className="w-6 shrink-0 text-mut">{todays.length + i + 1}.</span>
                    {o.grp ? <span className="size-2.5 shrink-0 rounded-full" style={{ background: groupColor(o.grp) }} aria-hidden="true" /> : null}
                    <span className="min-w-0 flex-1 truncate font-semibold">{[o.cls, o.grp, o.prep].filter(Boolean).join(" · ") || "Start"}</span>
                    <span className={`shrink-0 text-[0.875rem] ${i === 0 && !on ? "font-semibold text-acc" : "text-mut"}`}>{on ? "Düzenle" : i === 0 ? "Sıradaki" : ""}</span>
                  </button>
                  {on && (
                    <div className="space-y-2 border-t border-line px-4 py-2.5">
                      {chipRows(o, (k, v) => editRow(i, { [k]: v }))}
                      <div className="flex gap-2 pt-1">
                        <Button variant="secondary" size="sm" disabled={i === 0} onClick={() => moveRow(i, -1)}>
                          Yukarı
                        </Button>
                        <Button variant="secondary" size="sm" disabled={i === plan.order.length - 1} onClick={() => moveRow(i, 1)}>
                          Aşağı
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => (setEditI(-1), changePlan({ order: plan.order.filter((_, k) => k !== i) }))}>
                          Çıkar
                        </Button>
                        <Button size="sm" className="ml-auto" onClick={() => setEditI(-1)}>
                          Tamam
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {plan.status === "ap" ? <p className="border-b border-line px-4 py-2.5 text-[0.875rem] font-semibold text-warn">{apText(plan)}</p> : null}
            {ap && plan.status !== "ap" ? (
              // Tehir penceresi: süre (30 dk … 2 sa, Belirsiz) ve sebep; Ertele yeni saati yazar, ekranda sebep görünür
              <div className="space-y-2 border-b border-line px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-11 shrink-0 text-[0.8125rem] text-mut">Süre</span>
                  <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto [scrollbar-width:none]">
                    {[...AP_MIN, 0].map((m) => (
                      <button key={m} type="button" aria-pressed={ap.min === m} onClick={() => setAp({ ...ap, min: m })} className={`h-7 shrink-0 rounded-full px-2.5 text-[0.8125rem] font-semibold ${ap.min === m ? "bg-acc text-white" : "bg-bg"}`}>
                        {m === 0 ? "Belirsiz" : m < 60 ? `${m} dk` : `${m / 60} sa`}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-11 shrink-0 text-[0.8125rem] text-mut">Sebep</span>
                  <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto [scrollbar-width:none]">
                    {AP_WHY.map((w) => (
                      <button key={w} type="button" aria-pressed={ap.why === w} onClick={() => setAp({ ...ap, why: w })} className={`h-7 shrink-0 rounded-full px-2.5 text-[0.8125rem] font-semibold ${ap.why === w ? "bg-acc text-white" : "bg-bg"}`}>
                        {w}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <span className="min-w-0 flex-1 truncate text-[0.875rem] text-mut">{ap.min ? `Yeni start ${addMin(plan.at, ap.min) || "—"}` : "Yeni saat sonra belirlenir"}</span>
                  <Button variant="secondary" size="sm" onClick={() => setAp(null)}>
                    Vazgeç
                  </Button>
                  <Button size="sm" onClick={postpone} disabled={!!ap.min && !plan.at}>
                    Ertele
                  </Button>
                </div>
              </div>
            ) : null}
            <div className="flex gap-2 p-3">
              <Button onClick={addRow} className="flex-1">
                Start ekle
              </Button>
              <Button variant={plan.status === "ap" ? "primary" : "secondary"} onClick={() => (plan.status === "ap" ? unpostpone() : setAp(ap ? null : { min: 60, why: AP_WHY[0] }))}>
                {plan.status === "ap" ? "Erteleme kalktı" : "Tehir"}
              </Button>
            </div>
          </div>
        </section>
        <section>
          <Head title="Program" right={plan.status === "done" ? "Gün bitti" : plan.status === "none" ? "Bugün yarış yok" : ""} />
          <div className={`${card} overflow-hidden`}>
            <div className={row}>
              <span className="font-semibold">İlk start</span>
              <div className="ml-auto flex items-center gap-1.5">
                {[
                  [today, "Bugün"],
                  [tomorrow, "Yarın"],
                ].map(([d, lab]) => (
                  <button key={d} type="button" aria-pressed={planDay === d} onClick={() => changePlan({ day: d })} className={`h-8 rounded-full px-3 text-[0.8125rem] font-semibold ${planDay === d ? "bg-acc text-white" : "bg-bg"}`}>
                    {lab}
                  </button>
                ))}
                <input type="time" value={plan.at} onChange={(e) => changePlan({ day: planDay, at: e.target.value })} aria-label="İlk start saati" className="h-9 rounded-lg bg-bg px-2 text-[0.9375rem] font-semibold tabular-nums outline-none" />
              </div>
            </div>
            {plan.status === "done" || plan.status === "none" ? (
              <div className="space-y-2 border-t border-line px-4 py-3 text-[0.9375rem]">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Yarın ilk start</span>
                  <input type="time" value={plan.next?.at || ""} onChange={(e) => changePlan({ next: { day: tomorrow, at: e.target.value } })} aria-label="Yarının ilk start saati" className="ml-auto h-9 rounded-lg bg-bg px-2 font-semibold tabular-nums outline-none" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Ekran yeni güne geçer</span>
                  <input type="time" value={plan.showAt} onChange={(e) => changePlan({ showAt: e.target.value })} aria-label="Ekranın yeni güne geçeceği saat" className="ml-auto h-9 rounded-lg bg-bg px-2 font-semibold tabular-nums outline-none" />
                </div>
              </div>
            ) : null}
          </div>
        </section>
        <section>
          <Head title="Ekranda" right={onScreen ? (onScreen.kind === "live" ? "Canlı yayın" : "Video") : "Boş"} />
          <div className={`${card} overflow-hidden`}>
            <div className={`${row} border-b border-line ${isSel("live") ? "bg-accbg" : ""}`}>
              <button type="button" disabled={!ytOk} onClick={() => setSel({ kind: "live" })} className={`min-w-0 flex-1 text-left font-semibold ${isSel("live") ? "text-acc" : ""}`}>
                Canlı yayın
                {isOn("live") ? <span className="ml-2 text-[0.75rem] font-semibold text-acc">Ekranda</span> : null}
              </button>
              <input
                value={yt}
                onChange={(e) => {
                  setYt(e.target.value);
                  if (ytEmbed(e.target.value)) setSel({ kind: "live" });
                }}
                placeholder="YouTube bağlantısı"
                inputMode="url"
                className="w-[52%] min-w-0 rounded-lg bg-bg px-2.5 py-1.5 text-[0.875rem] outline-none"
              />
            </div>
            {ytBad ? <p className="border-b border-line px-4 py-2 text-[0.8125rem] text-warn">Bağlantı tanınmadı: YouTube video, canlı yayın ya da kanal bağlantısı olmalı.</p> : null}
            {vids.map((m) => (
              <button key={m.id} type="button" onClick={() => setSel({ kind: "rec", mid: m.id })} className={`${row} border-b border-line ${isSel("rec", m.id) ? "bg-accbg text-acc" : ""}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {m.thumb ? <img src={m.thumb} alt="" className={`shrink-0 rounded-lg bg-deep object-cover ${orient(m) === "Dikey" ? "h-14 w-10" : "h-10 w-14"}`} /> : <span className="h-10 w-14 shrink-0 rounded-lg bg-deep" />}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">
                    {recName(m, live.starts)}
                    {isOn("rec", m.id) ? <span className="ml-2 text-[0.75rem] text-acc">Ekranda</span> : null}
                  </span>
                  <span className="block truncate text-[0.8125rem] font-medium text-mut">{[orient(m), m.dur ? mmss(m.dur) : "", hm(m.at)].filter(Boolean).join(" · ")}</span>
                </span>
              </button>
            ))}
            <button type="button" disabled={!!busy} onClick={() => file.current?.click()} className={`${row} border-b border-line font-semibold`}>
              <span className="min-w-0 flex-1 truncate">{busy && busy !== "x" ? busy : "Telefondan video seç"}</span>
            </button>
            <input ref={file} type="file" accept="video/*" className="hidden" onChange={pick} />
            <div className="grid grid-cols-2 gap-2 p-3">
              <Button variant="secondary" disabled={!!busy || !onScreen} onClick={() => show({ kind: "" })}>
                Ekrandan kaldır
              </Button>
              <Button disabled={!!busy || !sel || (sel.kind === "live" && !ytOk)} onClick={() => show({ ...sel, loop: false })}>
                Göster
              </Button>
            </div>
          </div>
        </section>

        <section>
          <Head title="Parkur ve rüzgâr" right={entry?.route?.length ? entry.route.map((m) => (m === "F" ? "Finish" : m)).join(" · ") : ""} />
          <div className={`${card} overflow-hidden`}>
            <div className="flex items-baseline gap-2 px-4 pt-3">
              {wind ? (
                <>
                  <b className="text-[1.75rem] font-bold tabular-nums">{wind.deg}°</b>
                  <span className="text-mut">
                    {dirShort(wind.deg)}
                    {wind.kn != null ? ` · ${wind.kn} kn` : ""}
                  </span>
                  <span className="ml-auto text-[0.875rem] text-mut">{hm(wind.at)}</span>
                </>
              ) : (
                <span className="text-mut">Rüzgâr yazılmadı</span>
              )}
            </div>
            {svg ? <div className="px-3 pt-2 [&>svg]:mx-auto [&>svg]:block [&>svg]:max-h-[22rem] [&>svg]:w-auto" dangerouslySetInnerHTML={{ __html: svg }} /> : <p className="px-4 pt-2 text-[0.875rem] text-mut">Parkur ölçümü yok</p>}
            <div className="grid grid-cols-2 gap-2 p-3">
              <Button variant="secondary" onClick={() => setAdd(0)}>
                Rüzgâr
              </Button>
              <Button variant="secondary" onClick={() => setAdd(1)}>
                Parkur ölçümü
              </Button>
            </div>
          </div>
        </section>

        <section>
          <Head title="Dönüşler" right={st ? `${raceName(st)}${entry?.grp ? ` · ${entry.grp}` : ""}` : "Önce yarışı başlat"} />
          <div className={`${card} overflow-hidden`}>
            {entry?.route?.length ? (
              entry.route.map((m, k) => (
                <div key={k} className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5 text-[0.9375rem]">
                  <span className="font-semibold">{markName(m)}</span>
                  <span className="min-w-0 truncate tabular-nums text-mut">{entry.legs[k]?.join(" ") || "–"}</span>
                </div>
              ))
            ) : (
              <p className="border-b border-line px-4 py-3 text-[0.875rem] text-mut">{entries.length ? `Kayıt listesi ${entries.length} tekne` : "Henüz dönüş yok"}</p>
            )}
            <div className="p-3">
              <Button disabled={!st} onClick={() => setVoice(true)} full>
                Sesle gir
              </Button>
            </div>
          </div>
        </section>

      </div>

      {/* ⋯ menüsü: ekran ve link, sonuç PDF'i (ayrı sayfa), kayıt listesi, gün durumu; Günü bitir bir daha sorar (yanlış dokunuş) */}
      <Sheet open={menu} onClose={() => (setMenu(false), setAskEnd(false))} title="Yayın">
        <div className="divide-y divide-line">
          {[
            ["Ekranı aç", () => (setMenu(false), openScreen())],
            ["Linki kopyala", () => (setMenu(false), copy())],
          ].map(([t, fn]) => (
            <button key={t} type="button" onClick={fn} className={`${row} font-semibold`}>
              {t}
            </button>
          ))}
          <Link href={`/athletes/races/${id}/sonuclar`} className={`${row} font-semibold`}>
            <span className="flex-1">{"Sonuç PDF'i"}</span>
            <span className="text-[0.875rem] text-mut">{race?.results?.fleet ? `${race.results.fleet} tekne` : ""}</span>
          </Link>
          <button type="button" onClick={() => (setMenu(false), setList(true))} className={`${row} font-semibold`}>
            <span className="flex-1">Kayıt listesi</span>
            <span className="text-[0.875rem] text-mut">{entries.length ? `${entries.length} tekne` : ""}</span>
          </button>
          <button type="button" onClick={() => (setMenu(false), changePlan({ day: planDay, status: plan.status === "none" ? "" : "none" }))} className={`${row} font-semibold`}>
            {plan.status === "none" ? "Bugün yarış var" : "Bugün yarış yok"}
          </button>
          {plan.status === "done" ? (
            <button type="button" onClick={() => (setMenu(false), changePlan({ day: planDay, status: "" }))} className={`${row} font-semibold`}>
              Günü yeniden aç
            </button>
          ) : (
            <button type="button" onClick={() => (askEnd ? (setMenu(false), setAskEnd(false), changePlan({ day: planDay, status: "done", next: plan.next || { day: tomorrow, at: plan.at } })) : setAskEnd(true))} className={`${row} font-semibold text-rec`}>
              <span className="flex-1">{askEnd ? "Günü bitir, emin misin?" : "Günü bitir"}</span>
              <span className="text-[0.875rem] font-normal text-mut">{askEnd ? "Ekran gün özetine geçer" : ""}</span>
            </button>
          )}
        </div>
      </Sheet>

      <VoidSheet ask={rf.ask} onChoose={rf.choose} />
      <AddSheet open={add !== null} pick0={add || 0} c={c} onClose={() => setAdd(null)} onAdd={addObs} />
      <RoundsScreen open={voice} onClose={() => (setVoice(false), reload())} orgId={orgId} raceId={id} startId={st?.id || ""} />
      {list && typeof document !== "undefined"
        ? createPortal(
            <div className="fixed inset-0 z-50 flex flex-col bg-bg pt-[env(safe-area-inset-top)]">
              <EntriesView onClose={() => setList(false)} orgId={orgId} raceId={id} rows={entries} setRows={setEntries} groups={groups} setGroups={setGroups} />
            </div>,
            document.body,
          )
        : null}
    </main>
  );
}

function Head({ title, right = "" }) {
  return (
    <div className="mb-1.5 flex items-baseline justify-between gap-3 px-1 text-[0.8125rem] font-semibold text-mut">
      <span>{title}</span>
      <span className="min-w-0 truncate">{right}</span>
    </div>
  );
}
