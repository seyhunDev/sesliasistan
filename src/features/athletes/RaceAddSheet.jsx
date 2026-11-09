"use client";

// "+ Yarış" penceresi (Seyhun 2026-11-09 "federasyonun sitesinden yarışları alıyoruz; artı yarış butonuna tıkladığımızda o listeyi de
// göstermemiz lazım"; örnek yl-telefon-ekle.png onaylı): ortak alttan açılan pencere (Sheet). Üstte sezon seçici, altında ayak ayak sınıflar;
// "Ekle" yarışı siteden alır (siteTake.startTake, siteden yarış al sayfasıyla aynı iş, arka planda), eklenmişte "Eklendi" ve dokununca yarış.
// En altta sitede olmayan yarış için "Elle ekle". Belgeleri görmek ve var olan yarışa bağlamak siteden yarış al sayfasında (yarış ⋯ › Siteden bağla).
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sheet } from "@/components/ui/Sheet";
import { LoadFail } from "@/components/ui/LoadFail";
import { useToast } from "@/components/ui/ToastProvider";
import { pickSeason } from "@/lib/siteDocs";
import { todayStr } from "@/lib/utils/format";
import { loadSiteList } from "./raceSite";
import { clearTask, startTake, useSiteTasks } from "./siteTake";

const ayak = (s) => String(s || "").replace(/AYAK/i, "Ayak");
const dm = (at) => new Date(`${String(at).slice(0, 10)}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "short" });

export function RaceAddSheet({ open, onClose, orgId, uid, races, onAdded }) {
  const router = useRouter();
  const toast = useToast();
  const tasks = useSiteTasks();
  const [season, setSeason] = useState("");
  const [data, setData] = useState(null);
  const [fail, setFail] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!open) return;
    let on = true;
    loadSiteList(season).then(
      (d) => {
        if (!on) return;
        if (!Array.isArray(d?.legs)) return setFail(true);
        const want = season || pickSeason((d.seasons || []).map((s) => s.name), todayStr());
        if (!season && want !== d.season) return setSeason(want);
        setData(d);
        if (!season) setSeason(d.season);
      },
      () => on && setFail(true),
    );
    return () => void (on = false);
  }, [open, season, retry]);
  const pick = (name) => {
    if (name === season) return;
    setData(null);
    setFail(false);
    setSeason(name);
  };
  const go = (id) => (onClose(), router.push(`/athletes/races/${id}?sec=site`));
  const add = (leg, c) => {
    clearTask(c.act);
    startTake({
      orgId, uid, races: races || [], season: data.season, leg, c,
      onDone: (id, name) => (onAdded?.(), toast(`${name || c.cls} eklendi`, { action: { label: "Aç", onClick: () => router.push(`/athletes/races/${id}?sec=site`) } })),
      onFail: (m) => toast(m),
    });
  };
  const have = (act) => (races || []).find((r) => r.site?.act === act);
  return (
    <Sheet open={open} onClose={onClose} title="Yarış ekle" navy>
      <div className="ra">
        {(data?.seasons?.length || 0) > 1 && (
          <div className="tk-days mt-1">
            {data.seasons.map((s) => (
              <button key={s.name} type="button" role="tab" aria-selected={s.name === season} onClick={() => pick(s.name)} data-press>
                {s.name}
              </button>
            ))}
          </div>
        )}
        {fail && <LoadFail onRetry={() => (setFail(false), setRetry((n) => n + 1))} />}
        {!data && !fail && (
          <div className="py-2" aria-label="Yarışlar yükleniyor">
            {[0, 1, 2].map((i) => (
              <span key={i} className="rz-shim my-3 block h-9 w-full" />
            ))}
          </div>
        )}
        {data && !data.legs.length && <p className="py-6 text-center text-[0.9375rem] text-mut">Bu sezonda yarış yok</p>}
        {data?.legs.map((leg) => (
          <section key={leg.n}>
            <h3 className="ra-h">{ayak(leg.name).toLocaleUpperCase("tr-TR")}</h3>
            {leg.classes.map((c) => {
              const had = have(c.act);
              const t = tasks[c.act];
              const busy = t && !t.done && !t.error;
              const id = had?.id || (t?.done && t.raceId);
              return (
                <div key={c.act} className="ra-r">
                  <div className="min-w-0 flex-1">
                    <b>{c.cls}</b>
                    <small>{t?.error ? t.error : c.docs.length ? `${c.docs.length} belge · son ${dm(c.docs[0].at)}` : "Belge yok"}</small>
                  </div>
                  {id ? (
                    <button type="button" onClick={() => go(id)} data-press className="ra-ok">
                      Eklendi ✓
                    </button>
                  ) : (
                    <button type="button" onClick={() => add(leg, c)} disabled={busy} data-press className="ra-add">
                      {busy ? "Ekleniyor…" : "Ekle"}
                    </button>
                  )}
                </div>
              );
            })}
          </section>
        ))}
        <Link href="/athletes/races/new" onClick={onClose} data-press className="ra-man">
          <span>Elle ekle</span>
          <span aria-hidden="true">›</span>
        </Link>
      </div>
    </Sheet>
  );
}
