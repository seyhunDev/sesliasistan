"use client";

// Siteden yarış alma, arka planda (Seyhun 2026-11-04 "orayı kapatsam bile yükleme devam etmeli"): iş sayfadan bağımsız
// (modül düzeyinde) yürür; Siteden ekranı kapansa ya da başka sayfaya geçilse de biter, bitince bildirim (toast "Aç").
// Adımlar: yarış ilanı indirilir → talimat okunur (yapay zeka) → yarış kaydedilir → izlemeye alınır; sonra sunucu belgeleri
// arka planda indirir (netlify/functions/race-site-background.mjs), burada gelen belge sayısı izlenir (ilerleme çubuğu).
// Belgelerin işlenmesi yine tek yerde (raceSite.claimDoc, yarış sayfası / Yayın › Belgeler).
import { useSyncExternalStore } from "react";
import { freshRace, saveRace } from "./races";
import { applyNotice, readNotice } from "./raceNotice";
import { noticeName, saveNoticeFile } from "./noticeFile";
import { followSite, siteFile, watchSiteDocs } from "./raceSite";
import { noticeDoc } from "@/lib/siteBoard";
import { sameRace } from "@/lib/sharedRace";
import { todayStr } from "@/lib/utils/format";
import { focusText } from "@/lib/siteDocs";

export const STEPS = ["Yarış ilanı indiriliyor", "Talimat okunuyor", "Yarış kaydediliyor", "Belgeler alınıyor"];
const ayak = (s) => String(s || "").replace(/AYAK/i, "Ayak");

// act → { step (0..4), got, total, raceId, error }
let tasks = {};
const subs = new Set();
const set = (act, patch) => {
  tasks = { ...tasks, [act]: { ...tasks[act], ...patch } };
  subs.forEach((f) => f());
};
const subscribe = (f) => (subs.add(f), () => subs.delete(f));
export const useSiteTasks = () => useSyncExternalStore(subscribe, () => tasks, () => tasks);
export const clearTask = (act) => {
  const { [act]: _, ...rest } = tasks;
  tasks = rest;
  subs.forEach((f) => f());
};

// Belgeler gelirken sayılır; hepsi gelince ya da 3 dakika sonra izleme biter
function watchDocs(orgId, act, raceId, total) {
  if (!total) return set(act, { step: 4, done: true });
  let off = () => {};
  const stop = () => (off(), clearTimeout(t), set(act, { done: true, step: 4 }));
  const t = setTimeout(stop, 3 * 60e3);
  off = watchSiteDocs(
    orgId,
    raceId,
    (docs) => {
      set(act, { got: Math.min(docs.length, total) });
      if (docs.length >= total) stop();
    },
    () => {},
  );
}

// races: kulübün yarışları (aynı yarış elle açıldıysa ona bağlanır); onDone(raceId, name)
// into: var olan yarış (Seyhun 2026-11-07 "benim kurduğum yarışa bağlayalım"): yeni yarış açılmaz, sporcular ve evrak olduğu gibi kalır;
// talimattan yalnız programı yoksa program (notice) alınır
export function startTake({ orgId, uid, races, season, leg, c, into = null, onDone, onFail }) {
  if (tasks[c.act] && !tasks[c.act].error && !tasks[c.act].done) return;
  const total = c.docs.length;
  set(c.act, { step: 0, got: 0, total, raceId: "", error: "", done: false });
  (async () => {
    try {
      const site = { act: c.act, cls: c.cls, season, n: leg.n, legNo: leg.legNo };
      let r = into || { ...freshRace(races.find((x) => x.signer) || races[0], todayStr()), name: `${season} ${ayak(leg.name)} ${c.cls}` };
      const ilan = noticeDoc(c);
      if (ilan && !(into && into.notice?.schedule?.length)) {
        const file = await siteFile(ilan);
        set(c.act, { step: 1 });
        // Tek talimatta birden çok kategori: yalnız bu sınıfınki (OPT.JUNIOR / OPTIMIST)
        const n = await readNotice(file, { focus: focusText(c.cls) });
        if (into) r = { ...into, notice: applyNotice({ ...into }, n).notice };
        else {
          r = applyNotice({ ...r, name: "" }, n);
          if (!r.name) r.name = `${ayak(leg.name)} ${c.cls}`;
        }
        if (!r.noticeFile) r.noticeFile = await saveNoticeFile(orgId, file, noticeName(r)).catch(() => null);
      }
      set(c.act, { step: 2 });
      const same = into || races.find((x) => !x.site && sameRace(x, r));
      const id = await saveRace(orgId, uid, into ? { ...r, site } : same ? { ...same, site } : { ...r, site });
      set(c.act, { step: 3, raceId: id });
      const got = await followSite(id, site);
      if (got.error) throw new Error(got.error);
      onDone?.(id, (same || r).name);
      watchDocs(orgId, c.act, id, total);
    } catch (e) {
      set(c.act, { error: e?.message || "Yarış alınamadı" });
      onFail?.(e?.message || "Yarış alınamadı");
    }
  })();
}
