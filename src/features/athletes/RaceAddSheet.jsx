"use client";

// Yarış ekleme (Seyhun 2026-11-09 "TFF'den seç, manuel, talimatla"; örnek e3-*.png, yp-*.png "Yap"): "+ Yarış" penceresi (Sheet) ve
// /athletes/races/new sayfası AYNI gövdeyi (RaceAdd) gösterir: üstte TFF'den seç · Talimatla · Elle.
// - TFF'den seç: sezon seçici, ayak ayak sınıflar; "Ekle" yarışı siteden alır (siteTake.startTake, arka planda), eklenmişte "Eklendi";
//   son 14 günde sitede ilk görülenlerde "Yeni" (siteListLive yanıtındaki fresh, saatlik tarama).
// - Talimatla: Dosya seç · Metin yapıştır (NoticeRows); ad, tarih, yer talimattan dolar.
// - Elle: ad, tarih, il, ilçe (yurt dışında ülke, şehir).
// Pencerede Talimatla/Elle işi yeni yarış sayfasına aktarılır (raceDraft), orada talimat okunur ya da yarış başlar.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sheet } from "@/components/ui/Sheet";
import { LoadFail } from "@/components/ui/LoadFail";
import { useToast } from "@/components/ui/ToastProvider";
import { siteListLive } from "./raceSite";
import { clearTask, startTake, useSiteTasks } from "./siteTake";
import { RaceSeg } from "./raceUi";
import { NoticeRows } from "./NoticeView";
import { raceNames } from "./raceNames";
import { setRaceDraft } from "./raceDraft";

const ayak = (s) => String(s || "").replace(/AYAK/i, "Ayak");
const dm = (at) => new Date(`${String(at).slice(0, 10)}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "short" });

export function RaceAddSheet({ open, onClose, orgId, uid, races, onAdded }) {
  const router = useRouter();
  // Talimatla / Elle: yeni yarış sayfası açılır, iş orada sürer
  const toNew = (d) => (setRaceDraft(d), onClose(), router.push("/athletes/races/new"));
  return (
    <Sheet open={open} onClose={onClose} title="Yarış ekle" navy>
      <RaceAdd site live={open} orgId={orgId} uid={uid} races={races} onAdded={onAdded} onGo={onClose} onNotice={(f) => toNew({ notice: f })} onManual={(f) => toNew({ fields: f })} />
    </Sheet>
  );
}

// Ortak gövde. site: TFF listesi gösterilsin mi (ana hesap); busy: talimat okunuyor
export function RaceAdd({ site = false, live = true, orgId, uid, races, onAdded, onGo, onNotice, onManual, busy = false }) {
  const [tab, setTab] = useState(site ? "tff" : "tal");
  const tabs = [site && ["tff", "TFF'den seç"], ["tal", "Talimatla"], ["el", "Elle"]].filter(Boolean);
  return (
    <div className="ra">
      <RaceSeg tabs={tabs} value={tab} onChange={setTab} className="mt-1" />
      {tab === "tff" && <SiteList live={live} orgId={orgId} uid={uid} races={races} onAdded={onAdded} onGo={onGo} />}
      {tab === "tal" && <NoticeRows busy={busy} onFile={onNotice} onText={onNotice} />}
      {tab === "el" && <Manual onDone={onManual} />}
    </div>
  );
}

function SiteList({ live, orgId, uid, races, onAdded, onGo }) {
  const router = useRouter();
  const toast = useToast();
  const tasks = useSiteTasks();
  const [season, setSeason] = useState("");
  const [data, setData] = useState(null);
  const [fail, setFail] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!live) return;
    return siteListLive(season, { onData: setData, onSeason: setSeason, onFail: () => setFail(true) });
  }, [live, season, retry]);
  const pick = (name) => {
    if (name === season) return;
    setData(null);
    setFail(false);
    setSeason(name);
  };
  const go = (id) => (onGo?.(), router.push(`/athletes/races/${id}?sec=site`));
  const add = (leg, c) => {
    clearTask(c.act);
    startTake({
      orgId, uid, races: races || [], season: data.season, leg, c,
      onDone: (id, name) => (onAdded?.(), toast(`${name || c.cls} eklendi`, { action: { label: "Aç", onClick: () => router.push(`/athletes/races/${id}?sec=site`) } })),
      onFail: (m) => toast(m),
    });
  };
  const have = (act) => (races || []).find((r) => r.site?.act === act);
  const fresh = data?.fresh || {};
  return (
    <>
      {(data?.seasons?.length || 0) > 1 && (
        <div className="tk-days mt-3">
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
                  <b>
                    {c.cls}
                    {!id && fresh[c.act] && <span className="ra-new">Yeni</span>}
                  </b>
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
    </>
  );
}

// Elle: ad, tarih, yer (yurt dışında ülke ve şehir)
function Manual({ onDone }) {
  const [known] = useState(raceNames);
  const [f, setF] = useState({ name: "", startDate: "", endDate: "", abroad: false, city: "İzmir", district: "" });
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const abroad = (on) => setF((p) => ({ ...p, abroad: on, city: on && p.city === "İzmir" ? "" : !on && !p.city.trim() ? "İzmir" : p.city }));
  return (
    <div className="ra-form">
      <RaceSeg tabs={[["in", "Yurt içi"], ["out", "Yurt dışı"]]} value={f.abroad ? "out" : "in"} onChange={(v) => abroad(v === "out")} className="mt-3" />
      <label className="ra-f">
        <span>Yarışın adı</span>
        <input value={f.name} onChange={set("name")} list="ra-names" autoComplete="off" />
        <datalist id="ra-names">
          {known.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
      </label>
      <div className="ra-2">
        <label className="ra-f">
          <span>Başlangıç</span>
          <input type="date" value={f.startDate} onChange={set("startDate")} />
        </label>
        <label className="ra-f">
          <span>Bitiş</span>
          <input type="date" value={f.endDate} onChange={set("endDate")} />
        </label>
      </div>
      <div className="ra-2">
        <label className="ra-f">
          <span>{f.abroad ? "Ülke" : "İl"}</span>
          <input value={f.city} onChange={set("city")} />
        </label>
        <label className="ra-f">
          <span>{f.abroad ? "Şehir" : "İlçe"}</span>
          <input value={f.district} onChange={set("district")} />
        </label>
      </div>
      <button type="button" disabled={!f.name.trim()} onClick={() => onDone({ ...f, name: f.name.trim() })} data-press className="ra-big">
        Yarışı ekle
      </button>
    </div>
  );
}
