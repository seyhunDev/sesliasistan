"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BackButton } from "@/components/ui/BackButton";
import { Button } from "@/components/ui/Button";
import { buttonClass } from "@/components/ui/buttonClass";
import { ListHead, Row, RowList } from "@/components/ui/Row";
import { Sheet } from "@/components/ui/Sheet";
import { authFetch } from "@/lib/authFetch";
import { CAMS_FIRST, CAMS_RADIUS, PLACES, agoLabel, findPlace, kmLabel, nearPlace } from "@/lib/cams";

// Halka açık canlı kameralar (Seyhun 2026-10-23): ana sayfada yok, İşlemler › Kulüp › Kameralar. Lacivert üstte yer
// düğmesi ve en yakın kamera büyük; altta 6 kamera, kalanı "Daha fazla". Kameraya dokununca Windy oynatıcısı açılır.
// Kaynak Windy Webcams (ücretsiz katman: düşük çözünürlük, Windy'ye bağlantı ve "Windy.com" yazısı zorunlu).
// Yer: ?yer= (sesli komut) › son seçilen › telefonun konumu › Dikili.
const SAVE = "cams-place";
const read = () => {
  try {
    return JSON.parse(localStorage.getItem(SAVE) || "null");
  } catch {
    return null;
  }
};
const write = (p) => {
  try {
    localStorage.setItem(SAVE, JSON.stringify(p));
  } catch {}
};
const here = () =>
  new Promise((ok) => {
    if (!navigator.geolocation) return ok(null);
    navigator.geolocation.getCurrentPosition(
      (p) => ok({ name: "Konumum", lat: p.coords.latitude, lon: p.coords.longitude, mine: true }),
      () => ok(null),
      { enableHighAccuracy: false, maximumAge: 10 * 60e3, timeout: 8000 }
    );
  });
// Yer arama (Open-Meteo, anahtarsız); Midilli gibi yurt dışı yerler de çıksın diye ülke süzgeci yok
async function search(name, signal) {
  const u = `https://geocoding-api.open-meteo.com/v1/search?${new URLSearchParams({ name, count: "8", language: "tr", format: "json" })}`;
  const r = await fetch(u, { signal });
  if (!r.ok) throw new Error("Yer aranamadı");
  const j = await r.json();
  return (j.results || []).map((x) => ({ name: x.name, sub: [x.admin1, x.country].filter(Boolean).join(", "), lat: x.latitude, lon: x.longitude }));
}
const label = (p) => (p?.mine ? nearPlace(p) || "Konumum" : p?.name || "");

export function CamsPage() {
  const yer = useSearchParams().get("yer") || "";
  const [place, setPlace] = useState(null);
  const [data, setData] = useState(null);
  const [all, setAll] = useState(false);
  const [open, setOpen] = useState(null);
  const [pick, setPick] = useState(false);

  // Başlangıç yeri
  useEffect(() => {
    let off = false;
    (async () => {
      let p = null;
      if (yer) p = findPlace(yer) || (await search(yer).then((r) => r[0] || null).catch(() => null));
      if (!p) p = read();
      if (!p || p.mine) p = (await here()) || p || PLACES[0];
      if (!off) setPlace(p);
    })();
    return () => {
      off = true;
    };
  }, [yer]);

  useEffect(() => {
    if (!place) return;
    let off = false;
    authFetch(`/api/cams?lat=${place.lat.toFixed(3)}&lon=${place.lon.toFixed(3)}`)
      .then((r) => r.json())
      .catch(() => ({ error: "fail" }))
      .then((j) => !off && setData({ ...j, for: place }));
    return () => {
      off = true;
    };
  }, [place]);

  const choose = (p) => {
    setPick(false);
    setAll(false);
    write(p);
    setPlace(p);
  };
  const cur = data?.for === place ? data : null; // yer değişince eski kameralar görünmez
  const cams = cur?.cams || [];
  const [top, ...rest] = cams;
  const shown = all ? rest : rest.slice(0, CAMS_FIRST);

  return (
    <>
      <section className="ck -mx-5 px-5 pb-9 pt-[calc(0.75rem+env(safe-area-inset-top))]" aria-label="Kameralar">
        <header className="flex items-center gap-2.5">
          <BackButton href="/" />
          <h1 className="min-w-0 flex-1 truncate text-[1.375rem] font-bold tracking-[-.02em]">Kameralar</h1>
          <button type="button" data-press onClick={() => setPick(true)} className="raised h-9 max-w-[45%] shrink-0 truncate rounded-full px-4 text-[0.875rem] font-semibold">
            {label(place) || "Yer"}
          </button>
        </header>
        <div className="mt-4">
          {top ? <BigCam c={top} onOpen={() => setOpen(top)} /> : <div className={`aspect-video rounded-[1.125rem] border border-[#26395c] ${cur ? "" : "shimmer"}`} />}
        </div>
      </section>

      <div className="relative -mx-5 -mt-6 space-y-3 rounded-t-[1.75rem] bg-bg px-5 pt-5">
        {!cur ? (
          <div className="grid grid-cols-2 gap-2.5" aria-hidden="true">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="shimmer aspect-[4/3] rounded-2xl" />
            ))}
          </div>
        ) : cur.error ? (
          <RowList>
            <Row title={cur.error === "nokey" || cur.error === "badkey" ? "Kamera anahtarı yok" : "Kameralar alınamadı"} sub={cur.error === "nokey" ? "Netlify'a WINDY_WEBCAMS_KEY eklenmeli" : cur.error === "badkey" ? "WINDY_WEBCAMS_KEY geçersiz" : "Biraz sonra yeniden dene"} />
          </RowList>
        ) : !cams.length ? (
          <RowList>
            <Row title="Kamera yok" sub={`${label(place)} çevresinde ${CAMS_RADIUS} km içinde`} />
          </RowList>
        ) : (
          rest.length > 0 && (
            <>
              <ListHead title="Yakındakiler" count={rest.length} />
              <div className="grid grid-cols-2 gap-2.5">
                {shown.map((c) => (
                  <SmallCam key={c.id} c={c} onOpen={() => setOpen(c)} />
                ))}
              </div>
              {!all && rest.length > CAMS_FIRST && (
                <Button variant="secondary" full onClick={() => setAll(true)}>
                  Daha fazla ({rest.length - CAMS_FIRST})
                </Button>
              )}
            </>
          )
        )}
        {cams.length > 0 && (
          <a href="https://www.windy.com/webcams" target="_blank" rel="noopener noreferrer" className="block px-1 text-right text-[0.75rem] font-semibold text-mut">
            Kameralar: Windy.com
          </a>
        )}
      </div>

      <CamSheet c={open} onClose={() => setOpen(null)} />
      <PlaceSheet open={pick} onClose={() => setPick(false)} cur={place} onPick={choose} />
    </>
  );
}

function Img({ src, className = "" }) {
  const [bad, setBad] = useState(false);
  return (
    <span className={`block overflow-hidden bg-[#182a48] ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- dış bağlantı (Windy), Next görüntü sunucusu yok */}
      {!bad && <img src={src} alt="" loading="lazy" decoding="async" onError={() => setBad(true)} className="size-full object-cover" />}
    </span>
  );
}

function BigCam({ c, onOpen }) {
  return (
    <button type="button" data-press onClick={onOpen} className="relative block w-full overflow-hidden rounded-[1.125rem] border border-[#26395c] text-left">
      <Img src={c.preview} className="aspect-video" />
      {c.live && <span className="absolute left-2.5 top-2.5 rounded-full bg-[#11203a]/80 px-2 py-0.5 text-[0.75rem] font-semibold text-[#67e8f9]">Canlı</span>}
      <span className="absolute inset-x-0 bottom-0 flex items-baseline gap-2 bg-[#11203a]/80 px-3 py-2">
        <b className="min-w-0 flex-1 truncate text-[0.9375rem] font-semibold">{c.title}</b>
        <small className="shrink-0 text-[0.8125rem] font-semibold text-white/65 tabular-nums">
          {kmLabel(c.km)}
          {c.at ? ` · ${agoLabel(c.at)}` : ""}
        </small>
      </span>
    </button>
  );
}

function SmallCam({ c, onOpen }) {
  return (
    <button type="button" data-press onClick={onOpen} className="block min-w-0 overflow-hidden rounded-2xl border border-line bg-card text-left">
      <Img src={c.preview} className="aspect-video" />
      <span className="block px-2.5 py-1.5">
        <b className="block truncate text-[0.875rem] font-semibold">{c.title}</b>
        <small className="block truncate text-[0.75rem] font-semibold text-mut tabular-nums">
          {kmLabel(c.km)}
          {c.at ? ` · ${agoLabel(c.at)}` : ""}
        </small>
      </span>
    </button>
  );
}

// Kamera: Windy oynatıcısı (gün boyu hızlandırılmış ya da canlı); oynatıcı yoksa son görüntü
function CamSheet({ c, onClose }) {
  return (
    <Sheet open={!!c} onClose={onClose} title={c?.title || ""}>
      {c && (
        <div className="space-y-3 px-5">
          <div className="aspect-video overflow-hidden rounded-2xl bg-[#182a48]">
            {c.player ? <iframe src={c.player} title={c.title} allow="autoplay; fullscreen" allowFullScreen className="block size-full border-0" /> : <Img src={c.preview} className="size-full" />}
          </div>
          <p className="px-1 text-[0.8125rem] font-semibold text-mut tabular-nums">
            {kmLabel(c.km)}
            {c.at ? ` · ${agoLabel(c.at)} önce` : ""}
          </p>
          <a href={c.link} target="_blank" rel="noopener noreferrer" data-press className={buttonClass({ variant: "secondary", full: true })}>
            Windy&apos;de aç
          </a>
        </div>
      )}
    </Sheet>
  );
}

function PlaceSheet({ open, onClose, cur, onPick }) {
  const [q, setQ] = useState("");
  const [found, setFound] = useState(null);
  const [mine, setMine] = useState(null);
  const ctl = useRef(null);
  useEffect(() => {
    if (open) here().then(setMine);
  }, [open]);
  const name = q.trim();
  useEffect(() => {
    if (name.length < 2) return;
    const t = setTimeout(() => {
      ctl.current?.abort();
      ctl.current = new AbortController();
      search(name, ctl.current.signal).then((list) => setFound({ name, list })).catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [name]);
  const hits = name.length >= 2 && found?.name === name ? found.list : null;
  const done = (p) => {
    setQ("");
    onPick(p);
  };
  const on = (p) => !!cur && !cur.mine && Math.abs(cur.lat - p.lat) < 0.01 && Math.abs(cur.lon - p.lon) < 0.01;
  return (
    <Sheet open={open} onClose={onClose} title="Yer">
      <div className="space-y-4 px-5">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Yer ara"
          enterKeyHint="search"
          className="h-12 w-full rounded-xl border border-line bg-card px-3.5 text-base text-fg outline-none placeholder:text-mut/70 focus:border-acc"
        />
        {hits ? (
          <RowList>
            {hits.length ? hits.map((p) => <Row key={`${p.lat},${p.lon}`} title={p.name} sub={p.sub} onClick={() => done(p)} chev={false} />) : <Row title="Bulunamadı" />}
          </RowList>
        ) : (
          <RowList>
            {mine && <Row title="Konumum" right={cur?.mine ? "✓" : nearPlace(mine) || null} onClick={() => done(mine)} chev={false} label="Konumum" />}
            {PLACES.map((p) => (
              <Row key={p.name} title={p.name} right={on(p) ? "✓" : null} onClick={() => done(p)} chev={false} />
            ))}
          </RowList>
        )}
      </div>
    </Sheet>
  );
}
