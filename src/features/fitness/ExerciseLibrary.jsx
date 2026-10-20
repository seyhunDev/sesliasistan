"use client";

import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/ui/ToastProvider";
import { Icon } from "@/components/ui/Icon";
import { createPortal } from "react-dom";
import { fold } from "@/lib/fitness/exercises";
import { ytThumb } from "@/lib/fitness/youtube";
import { libAdd, libDupes, libKeepOf, libKey, libList, libMediaIds } from "@/lib/fitness/library";
import { Thumb } from "./ExerciseMedia";
import { ExerciseScreen } from "./ExerciseScreen";
import { getThumb, loadMedia, looseMedia } from "./fitMedia";
import { ExercisePicker } from "./ExercisePicker";
import { saveLib, similarGroups } from "./fitnessData";
import { useFitLib } from "./useFitLib";

// Hareketler: kulübün hareket kütüphanesi (programlarda geçen her hareket bir kez, numarasıyla). Harekete eklenen
// fotoğraf, video ve YouTube bağlantısı o hareketin geçtiği bütün programlarda ve sporcuların antrenmanlarında görünür.
const hasMedia = (x) => !!(x.yt?.id || (x.media || []).length);

export function ExerciseLibrary({ open, onClose, orgId, progs = [] }) {
  const { lib, setMedia, merge, attach, rename, drop } = useFitLib();
  const toast = useToast();
  const [join, setJoin] = useState(false);
  const [naming, setNaming] = useState(null);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState("");
  const [pick, setPick] = useState(false);
  const [only, setOnly] = useState("");
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);
  const all = libList(lib, q);
  const list = only === "v" ? all.filter(hasMedia) : only === "n" ? all.filter((x) => !hasMedia(x)) : all;
  // Hareketin kaç programda geçtiği
  const uses = useMemo(() => {
    const m = {};
    for (const pr of progs) {
      const keys = new Set();
      for (const d of pr.days || []) for (const it of d.items || []) keys.add(libKey(lib, it));
      for (const k of keys) m[k] = (m[k] || 0) + 1;
    }
    return m;
  }, [progs, lib]);
  const dupes = libDupes(lib);
  const e = sel ? list.find((x) => x.key === sel) || libList(lib).find((x) => x.key === sel) : null;
  const it = e ? { ex: e.ex, name: e.name, kind: e.kind } : null;
  const add = async (p) => {
    const item = p.custom ? { ex: "", name: p.name } : { ex: p.id, name: p.name, kind: p.kind };
    const { lib: next } = libAdd(lib, [item]);
    const saved = await saveLib(orgId, next).catch(() => null);
    const k = libList(saved || next).find((x) => fold(x.name) === fold(item.name) || (item.ex && x.key === item.ex));
    if (k) setSel(k.key);
  };
  const close = () => {
    setSel("");
    setJoin(false);
    onClose();
  };
  const failed = () => toast("Kaydedilemedi, tekrar dene");
  const back = () => {
    setSel("");
    setJoin(false);
    setNaming(null);
  };
  const saveName = async () => {
    try {
      await rename(e.key, naming);
      setNaming(null);
      toast("Adı değişti");
    } catch (x) {
      toast(x.message || "Kaydedilemedi");
    }
  };
  // Programda geçen hareket silinmez (yeniden eklenirdi); fotoğraf/video dosyaları silinmez
  const remove = async () => {
    const n = uses[e.key] || 0;
    if (n) return toast(`${n} programda var; önce programdan çıkar`);
    if (!confirm(`“${e.name}” listeden silinsin mi? Fotoğraf ve videoları silinmez, "Hareketsiz kalan dosyalar"da durur.`)) return;
    try {
      await drop(e.key);
      back();
      toast("Silindi");
    } catch {
      failed();
    }
  };
  // Bu hareketi seçilenle birleştirir: fotoğrafı/videosu çok olan kalır, öbürünün adı da ileride ona gider
  const joinWith = async (x) => {
    if (!confirm(`“${e.name}” ile “${x.name}” aynı hareket olarak birleştirilsin mi? Fotoğraf ve videoların hepsi kalır.`)) return;
    const keep = libKeepOf(lib, [e.key, x.key]);
    try {
      await merge(keep, [e.key, x.key]);
      setJoin(false);
      setSel(keep);
      toast("Birleştirildi");
    } catch {
      failed();
    }
  };
  if (!open) return null;
  // Tam ekran: arama en üstte sabit, sonuçlar yukarıdan aşağı (klavye listeyi örtmez)
  return createPortal(
    <div role="dialog" aria-label="Hareketler" className="fixed inset-0 z-[45] overflow-y-auto overscroll-contain bg-bg">
      {e && (
        <ExerciseScreen e={e} uses={uses[e.key] || 0} put={(fn) => setMedia(it, fn)} onBack={back}>
          {join ? (
            <Choose lib={lib} not={e.key} title="Hangi hareketle aynı?" onPick={joinWith} onCancel={() => setJoin(false)} />
          ) : naming !== null ? (
            <section className="mt-4 rounded-2xl border border-line bg-card p-3">
              <input value={naming} onChange={(x) => setNaming(x.target.value)} onKeyDown={(x) => x.key === "Enter" && saveName()} autoFocus maxLength={60} className="h-12 w-full rounded-xl bg-bg px-3 text-[1rem] outline-none" />
              <div className="mt-2 flex gap-2">
                <button type="button" onClick={() => setNaming(null)} data-press className="btn btn-secondary flex-1">
                  Vazgeç
                </button>
                <button type="button" disabled={!naming.trim()} onClick={saveName} data-press className="btn btn-primary flex-1">
                  Kaydet
                </button>
              </div>
            </section>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setNaming(e.name)} data-press className="btn btn-secondary">
                Adı değiştir
              </button>
              <button type="button" onClick={() => setJoin(true)} data-press className="btn btn-secondary">
                Birleştir
              </button>
              <button type="button" onClick={remove} data-press className="btn btn-danger col-span-2">
                Hareketi sil
              </button>
            </div>
          )}
        </ExerciseScreen>
      )}
      <div className="sticky top-0 z-10 mx-auto max-w-[30rem] bg-bg/95 px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur">
        <div className="flex h-11 items-center justify-between">
          <button type="button" onClick={close} data-press className="btn btn-text btn-sm -ml-1 text-acc">
            <Icon name="chev" className="size-4 rotate-180" />
            Fitness
          </button>
          <b className="text-[1.0625rem] font-semibold">Hareketler</b>
          <span className="w-16" />
        </div>
        <div className="mt-1 flex items-center gap-2">
          <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl bg-card px-3 ring-1 ring-line">
            <Icon name="search" className="size-4 text-mut" />
            <input value={q} onChange={(x) => setQ(x.target.value)} placeholder="Ara: ad ya da numara" className="h-12 w-full min-w-0 bg-transparent text-[1rem] outline-none" />
          </label>
          <button type="button" onClick={() => setPick(true)} aria-label="Hareket ekle" className="grid size-12 shrink-0 place-items-center rounded-xl bg-acc text-white">
            <Icon name="plus" className="size-6" />
          </button>
        </div>
        <div className="mt-2 flex gap-2">
          {[
            ["", `Hepsi ${all.length}`],
            ["v", "Fotoğraflı"],
            ["n", "Fotoğrafsız"],
          ].map(([k, label]) => (
            <button key={k || "all"} type="button" onClick={() => setOnly(k)} className={`h-9 rounded-full px-3.5 text-[0.8125rem] font-semibold ${only === k ? "bg-deep text-white" : "bg-card text-mut ring-1 ring-line"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="mx-auto max-w-[30rem] px-4 pb-[max(2rem,env(safe-area-inset-bottom))]">
        {!q && !only && dupes.length > 0 && <Dupes groups={dupes} uses={uses} onMerge={merge} />}
        {!q && !only && <Similar lib={lib} uses={uses} onMerge={merge} />}
        {!q && !only && <Loose orgId={orgId} lib={lib} progs={progs} onAttach={attach} />}
        <ul className="mt-2 divide-y divide-line">
          {list.map((x) => {
            const v = hasMedia(x);
            const n = uses[x.key] || 0;
            return (
              <li key={x.key}>
                <button type="button" onClick={() => setSel(x.key)} data-press="row" className="flex min-h-[4.5rem] w-full items-center gap-3 py-2.5 text-left">
                  <span className="relative size-14 shrink-0">
                    <Mini orgId={orgId} x={x} />
                    <span className="absolute -left-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-card px-1 text-[0.6875rem] font-bold tabular-nums text-fg ring-1 ring-line">{x.no}</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-[1rem] font-semibold">{x.name}</b>
                    <small className="block truncate text-[0.8125rem] text-mut">{[mediaText(x), n ? `${n} programda` : ""].filter(Boolean).join(" · ")}</small>
                  </span>
                  {v ? (
                    <Icon name="chev" className="size-5 shrink-0 text-mut" />
                  ) : (
                    <span className="shrink-0 rounded-full bg-acc/10 px-3 py-1.5 text-[0.8125rem] font-semibold text-acc">Ekle</span>
                  )}
                </button>
              </li>
            );
          })}
          {!list.length && <li className="py-6 text-center text-[0.875rem] text-mut">{q || only ? "Bulunamadı" : "Program hazırlayınca hareketler burada numarasıyla görünür"}</li>}
        </ul>
      </div>
      <ExercisePicker open={pick} onClose={() => setPick(false)} onPick={add} />
    </div>,
    document.body,
  );
}

// Aynı adlı hareketler: hangisi kalacak (fotoğrafı/videosu çok olan), birleştirince programlar kalanı kullanır.
// Fotoğraf ve videolar silinmez, hepsi kalana geçer.
const mediaText = (x) => {
  const m = [...(x.media || []), ...(x.spare || [])];
  const ph = m.filter((y) => y.kind === "photo").length;
  const vd = m.filter((y) => y.kind === "video").length + (x.yt?.id ? 1 : 0);
  return [ph ? `${ph} fotoğraf` : "", vd ? `${vd} video` : ""].filter(Boolean).join(" · ") || "Fotoğraf yok";
};
function Dupes({ groups, uses, onMerge, title = "Aynı adlı hareketler", start = false }) {
  const [open, setOpen] = useState(start);
  const [busy, setBusy] = useState("");
  const run = async (list) => {
    const names = list.map((g) => g.name).join(", ");
    if (!confirm(`${names} birleştirilsin mi? Fotoğraf ve videolar silinmez, kalan harekete geçer.`)) return;
    setBusy(list.length > 1 ? "*" : list[0].keep);
    try {
      for (const g of list) await onMerge(g.keep, g.items.map((x) => x.key));
    } catch (e) {
      console.warn("[fitness] birleştirilemedi", e);
    } finally {
      setBusy("");
    }
  };
  return (
    <section className="mt-3 rounded-2xl border border-line">
      <button type="button" onClick={() => setOpen(!open)} data-press="row" className="flex h-12 w-full items-center justify-between px-3 text-left">
        <b className="text-[0.9375rem] font-semibold">
          {title} · {groups.length}
        </b>
        <Icon name="chev" className={`size-4 text-mut transition ${open ? "rotate-90" : ""}`} />
      </button>
      {open && (
        <div className="px-3 pb-3">
          <ul className="flex flex-col gap-2">
            {groups.map((g) => (
              <li key={g.keep} className="rounded-xl bg-bg p-3">
                <b className="block text-[0.9375rem] font-semibold">{g.name}</b>
                <ul className="mt-1.5 flex flex-col gap-1">
                  {g.items.map((x, i) => (
                    <li key={x.key} className="flex items-baseline justify-between gap-2 text-[0.8125rem]">
                      <span className="min-w-0 truncate">
                        No {x.no} · {mediaText(x)}
                        {uses[x.key] ? ` · ${uses[x.key]} programda` : ""}
                      </span>
                      <span className={`shrink-0 font-semibold ${i ? "text-mut" : "text-acc"}`}>{i ? "Birleşecek" : "Kalacak"}</span>
                    </li>
                  ))}
                </ul>
                <button type="button" disabled={!!busy} onClick={() => run([g])} data-press className="btn btn-secondary btn-sm mt-2 w-full text-acc">
                  {busy === g.keep ? "Birleştiriliyor…" : "Birleştir"}
                </button>
              </li>
            ))}
          </ul>
          {groups.length > 1 && (
            <button type="button" disabled={!!busy} onClick={() => run(groups)} data-press className="btn btn-primary mt-2 w-full">
              {busy === "*" ? "Birleştiriliyor…" : `Hepsini birleştir (${groups.length})`}
            </button>
          )}
        </div>
      )}
    </section>
  );
}

// Hareket seçimi (birleştirme ve dosya ekleme): ara, dokun
function Choose({ lib, not = "", title, onPick, onCancel }) {
  const [q, setQ] = useState("");
  const list = libList(lib, q).filter((x) => x.key !== not);
  return (
    <section className="mt-3 rounded-2xl border border-line p-3">
      <div className="flex items-center justify-between">
        <b className="text-[0.9375rem] font-semibold">{title}</b>
        <button type="button" onClick={onCancel} data-press className="btn btn-text btn-sm text-mut">
          Vazgeç
        </button>
      </div>
      <input value={q} onChange={(x) => setQ(x.target.value)} placeholder="Ara: ad ya da numara" className="mt-2 h-11 w-full rounded-xl bg-bg px-3 text-[1rem] outline-none" />
      <ul className="mt-1 max-h-72 divide-y divide-line overflow-y-auto">
        {list.map((x) => (
          <li key={x.key}>
            <button type="button" onClick={() => onPick(x)} data-press="row" className="flex min-h-12 w-full items-center justify-between gap-2 py-2 text-left">
              <span className="min-w-0 truncate text-[0.9375rem]">
                <span className="tabular-nums text-mut">{x.no} · </span>
                {x.name}
              </span>
              <small className="shrink-0 text-[0.75rem] text-mut">{mediaText(x)}</small>
            </button>
          </li>
        ))}
        {!list.length && <li className="py-4 text-center text-[0.875rem] text-mut">Bulunamadı</li>}
      </ul>
    </section>
  );
}

// Storage'da duran ama hiçbir harekete bağlı olmayan fotoğraf/videolar: bulunur, seçilen harekete geri eklenir (silinmez)
function Loose({ orgId, lib, progs, onAttach }) {
  const toast = useToast();
  const [list, setList] = useState(null);
  const [busy, setBusy] = useState(false);
  const [pick, setPick] = useState([]);
  const [to, setTo] = useState(false);
  const used = () => {
    const ids = libMediaIds(lib);
    for (const p of progs) for (const d of p.days || []) for (const it of d.items || []) for (const m of it.media || []) ids.add(m.id);
    return ids;
  };
  const find = async () => {
    setBusy(true);
    try {
      setList(await looseMedia(orgId, used()));
    } catch {
      toast("Dosyalar okunamadı");
    } finally {
      setBusy(false);
    }
  };
  const put = async (x) => {
    const metas = list.filter((m) => pick.includes(m.id));
    try {
      await onAttach(x.key, metas);
      setList(list.filter((m) => !pick.includes(m.id)));
      setPick([]);
      setTo(false);
      toast(`${metas.length} dosya “${x.name}” hareketine eklendi`);
    } catch {
      toast("Eklenemedi, tekrar dene");
    }
  };
  if (!list)
    return (
      <button type="button" disabled={busy} onClick={find} className="mt-3 flex h-12 w-full items-center justify-between rounded-2xl border border-line px-3 text-left disabled:opacity-60">
        <b className="text-[0.9375rem] font-semibold">{busy ? "Aranıyor…" : "Hareketsiz kalan fotoğraf ve videolar"}</b>
        <Icon name="chev" className="size-4 text-mut" />
      </button>
    );
  return (
    <section className="mt-3 rounded-2xl border border-line p-3">
      <b className="block text-[0.9375rem] font-semibold">{list.length ? `Hareketsiz kalan dosyalar · ${list.length}` : "Hareketsiz kalan dosya yok"}</b>
      {list.length > 0 && (
        <>
          <p className="mt-1 text-[0.8125rem] text-mut">Seç, sonra hangi harekete ait olduğunu göster.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {list.map((m) => (
              <span key={m.id} className={`rounded-[1.1rem] p-0.5 ${pick.includes(m.id) ? "bg-acc" : ""}`}>
                <Thumb orgId={orgId} m={m} onOpen={() => setPick(pick.includes(m.id) ? pick.filter((x) => x !== m.id) : [...pick, m.id])} />
              </span>
            ))}
          </div>
          {to ? (
            <Choose lib={lib} title="Hangi hareketin?" onPick={put} onCancel={() => setTo(false)} />
          ) : (
            <button type="button" disabled={!pick.length} onClick={() => setTo(true)} data-press className="btn btn-primary mt-2 w-full">
              {pick.length ? `Harekete ekle (${pick.length})` : "Dosya seç"}
            </button>
          )}
        </>
      )}
    </section>
  );
}

// Aynı hareketin farklı adlı kayıtları (yapay zeka bulur, antrenör bakıp birleştirir): "Backpack split squat" ↔ "Sırt çantalı split squat"
function Similar({ lib, uses, onMerge }) {
  const toast = useToast();
  const [groups, setGroups] = useState(null);
  const [busy, setBusy] = useState(false);
  const find = async () => {
    setBusy(true);
    try {
      const keys = await similarGroups(lib);
      setGroups(
        keys.map((g) => {
          const keep = libKeepOf(lib, g);
          const items = libList(lib).filter((x) => g.includes(x.key)).sort((a, b) => (a.key === keep ? -1 : b.key === keep ? 1 : a.no - b.no));
          return { name: items.map((x) => x.name).join(" = "), keep, items };
        }),
      );
    } catch (e) {
      toast(e.message || "Bulunamadı, tekrar dene");
    } finally {
      setBusy(false);
    }
  };
  const merge = async (keep, keys) => {
    await onMerge(keep, keys);
    setGroups((gs) => (gs || []).filter((g) => g.keep !== keep));
  };
  if (groups?.length) return <Dupes groups={groups} uses={uses} onMerge={merge} title="Aynı hareket, farklı ad" start />;
  return (
    <button type="button" disabled={busy} onClick={find} className="mt-3 flex h-12 w-full items-center justify-between rounded-2xl border border-line px-3 text-left disabled:opacity-60">
      <b className="text-[0.9375rem] font-semibold">{busy ? "Aranıyor…" : groups ? "Farklı adlı kopya yok" : "Farklı adlı kopyaları bul"}</b>
      <Icon name="chev" className="size-4 text-mut" />
    </button>
  );
}

// Listedeki küçük resim: önce bu telefondaki önizleme (yüklenirken yapılır), yoksa fotoğrafın kendisi (tarayıcı önbelleğinde
// kalır), YouTube kapağı; video için video işareti, hiçbiri yoksa artı
function Mini({ orgId, x }) {
  const m = (x.media || [])[0];
  const [src, setSrc] = useState("");
  useEffect(() => {
    if (!m?.id) return undefined;
    let live = true;
    let u = "";
    getThumb(m)
      .then((b) => {
        if (b) return (u = URL.createObjectURL(b));
        if (m.kind !== "photo") return "";
        return loadMedia(orgId, m).then(({ src: s0, blob }) => (blob ? (u = URL.createObjectURL(blob)) : s0));
      })
      .then((s1) => live && setSrc(s1 || ""))
      .catch(() => {});
    return () => {
      live = false;
      if (u) URL.revokeObjectURL(u);
    };
  }, [orgId, m?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const img = src || (x.yt?.id ? ytThumb(x.yt.id) : "");
  if (img) return <img src={img} alt="" loading="lazy" onError={() => setSrc("")} className="size-14 rounded-2xl bg-bg object-cover" />;
  return (
    <span className={`grid size-14 place-items-center rounded-2xl ${m ? "bg-deep text-white" : "bg-bg text-mut"}`}>
      <Icon name={m ? (m.kind === "video" ? "video" : "camera") : "plus"} className="size-6" />
    </span>
  );
}
