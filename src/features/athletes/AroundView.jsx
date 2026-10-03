"use client";

import { useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Chips, Label, card } from "@/components/ui/Page";
import { Loader } from "@/components/ui/Loader";
import { useToast } from "@/components/ui/ToastProvider";
import { authFetch } from "@/lib/authFetch";
import { AroundMap } from "./AroundMap";
import { KINDS, cleanAround, distText, gatherAround, isApple, minText, placeLink, routeLink } from "./raceAround";

const input = "mt-0.5 block h-7 w-full min-w-0 bg-transparent text-[0.9375rem] outline-none placeholder:text-mut/60";
const madeText = (iso) => new Date(iso).toLocaleString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

// Yapay zekaya yalnız yer adları, mesafeler ve aday listesi gider (sporcu bilgisi gitmez)
async function askAi(r, data) {
  const res = await authFetch("/api/race-around", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      race: { name: r.name, startDate: r.startDate, endDate: r.endDate, city: r.city, district: r.district },
      venue: data.venue,
      hotel: data.hotel,
      route: data.route && { km: data.route.km, min: data.route.min },
      places: data.places.map(({ kind, name, near, m }) => ({ kind, name, near, m })),
      sights: data.sights.map(({ id, name, sub, m }) => ({ id, name, sub, m })),
    }),
  });
  const p = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(p.error || "Yapay zeka cevap vermedi");
  return p;
}

// Yarış › Çevre: yarış alanı ve otel çevresi (ulaşım, market, eczane, restoran, gezilecek yerler, harita).
// Yalnız "Getir"e basınca istenir; sonuç yarışın `around` alanına kaydedilir, istenen yer silinir.
export function AroundView({ r, onChange }) {
  const toast = useToast();
  const a = cleanAround(r.around);
  const [venueName, setVenueName] = useState(a?.venue.q || r.notice?.venue || "");
  const [hotelName, setHotelName] = useState(a ? a.hotel?.q || "" : r.hotelName || r.notice?.hotels?.[0]?.name || "");
  const [busy, setBusy] = useState("");
  const [show, setShow] = useState("all");
  const [focus, setFocus] = useState(null);
  const mapRef = useRef(null);

  const fetchAll = async () => {
    if (!venueName.trim() && !r.district.trim()) return toast("Yarış alanının adını yaz (kulüp, marina…)");
    setBusy("Başlıyor");
    try {
      const next = await gatherAround(r, { venueName: venueName.trim() || [r.district, r.city].filter(Boolean).join(", "), hotelName: hotelName.trim() }, { step: setBusy, askAi: (d) => askAi(r, d) });
      onChange(next);
      setShow("all");
      setFocus(null);
      if (hotelName.trim() && !next.hotel) toast("Otel haritada bulunamadı; adını değiştirip yeniden getirebilirsin");
      else toast("Çevre bilgisi getirildi");
    } catch (e) {
      toast(e?.message || "Çevre bilgisi getirilemedi, internet bağlantısını kontrol et");
    }
    setBusy("");
  };
  const removePlace = (id) => onChange({ ...a, places: a.places.filter((p) => p.id !== id) });
  const removeAll = () => confirm("Çevre bilgisi (harita, yerler, ulaşım) silinsin mi?") && onChange(null);
  const look = (p) => {
    setFocus(null);
    setTimeout(() => setFocus(p.id), 0);
    mapRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const places = a?.places || [];
  const count = (k) => places.filter((p) => p.kind === k).length;
  const shown = places.filter((p) => show === "all" || p.kind === show);
  const groups = [
    ["venue", "YARIŞ ALANI YAKINI", shown.filter((p) => p.kind !== "sight" && p.near !== "hotel")],
    ["hotel", "OTEL YAKINI", shown.filter((p) => p.kind !== "sight" && p.near === "hotel")],
    ["sight", "GEZİLECEK YERLER", shown.filter((p) => p.kind === "sight")],
  ];
  const appName = isApple() ? "Apple Haritalar" : "Google Haritalar";

  return (
    <>
      <Label>YARIŞ ALANI VE OTEL</Label>
      <div className={`${card} divide-y divide-line overflow-hidden`}>
        <label className="block px-4 py-2.5">
          <span className="block text-[0.6875rem] font-semibold tracking-wide text-mut">Yarış alanı</span>
          <input value={venueName} onChange={(e) => setVenueName(e.target.value)} placeholder={`Kulüp, marina ya da tesis (boşsa ${r.district || "ilçe"})`} className={input} />
        </label>
        <label className="block px-4 py-2.5">
          <span className="block text-[0.6875rem] font-semibold tracking-wide text-mut">Otel (isteğe bağlı)</span>
          <input value={hotelName} onChange={(e) => setHotelName(e.target.value)} placeholder="Otel adı" className={input} />
        </label>
      </div>
      <button
        type="button"
        onClick={fetchAll}
        disabled={!!busy}
        className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-acc text-[0.9375rem] font-semibold text-white active:scale-[.98] disabled:opacity-70"
      >
        {busy ? <Loader size="sm" className="text-white" label={busy} /> : <Icon name="spark" className="size-[1.125rem]" />}
        {busy ? `${busy}…` : a ? "Yeniden getir" : "Yapay zekayla getir"}
      </button>
      <p className="mt-2 px-1 text-[0.75rem] text-mut">
        {a?.at ? `${madeText(a.at)} getirildi. ` : "Ulaşım, yakındaki market, eczane, restoranlar ve gezilecek yerler haritada gösterilir. "}
        {"Yerler OpenStreetMap'ten gelir; yapay zeka ulaşımı özetler ve gezilecek yerleri seçer."}
      </p>

      {a && (
        <>
          <div ref={mapRef} className="mt-4">
            <AroundMap a={a} places={shown} focus={focus} />
          </div>

          {(a.hotel || a.transport) && (
            <>
              <Label right={a.route ? `${String(a.route.km).replace(".", ",")} km · ${minText(a.route.min)}` : ""}>ULAŞIM</Label>
              <div className={`${card} px-4 py-3`}>
                <span className="flex items-center gap-2 text-[0.8125rem] text-mut">
                  <span className="truncate">{a.hotel ? `Otel: ${a.hotel.q}` : "Otel girilmedi"}</span>
                  <Icon name="chev" className="size-3.5 shrink-0" />
                  <span className="truncate">Yarış alanı</span>
                </span>
                {a.transport && <p className="mt-1.5 text-[0.9375rem] leading-relaxed">{a.transport}</p>}
                {a.hotel && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <a href={routeLink(a.hotel, a.venue)} target="_blank" rel="noreferrer" className="flex h-9 items-center gap-1.5 rounded-full bg-acc px-3.5 text-[0.8125rem] font-semibold text-white active:scale-95">
                      <Icon name="nav" className="size-4" />
                      Yol tarifi
                    </a>
                    <a href={routeLink(a.hotel, a.venue, !isApple())} target="_blank" rel="noreferrer" className="flex h-9 items-center rounded-full bg-bg px-3.5 text-[0.8125rem] font-semibold text-acc active:scale-95">
                      {isApple() ? "Google Haritalar" : "Apple Haritalar"}
                    </a>
                  </div>
                )}
                {a.tip && <p className="mt-3 border-t border-line pt-2.5 text-[0.8125rem] text-mut">{a.tip}</p>}
              </div>
            </>
          )}

          {places.length > 0 && (
            <Chips
              value={show}
              onChange={setShow}
              options={[["all", "Hepsi", places.length], ...Object.entries(KINDS).filter(([k]) => count(k)).map(([k, v]) => [k, v.label, count(k)])]}
              className="mt-5"
            />
          )}
          {!places.length && <p className={`${card} mt-4 px-4 py-3 text-[0.875rem] text-mut`}>Yakında market, eczane ya da restoran bulunamadı.</p>}

          {groups.map(([g, title, list]) =>
            list.length ? (
              <div key={g}>
                <Label right={list.length}>{title}</Label>
                <ul className={`${card} divide-y divide-line overflow-hidden`}>
                  {list.map((p) => (
                    <li key={p.id} className="flex items-center pl-4 pr-1">
                      <button type="button" onClick={() => look(p)} className="flex min-w-0 flex-1 items-center gap-3 py-2.5 text-left">
                        <span className="grid size-8 shrink-0 place-items-center rounded-full text-[0.75rem] font-bold text-white" style={{ background: KINDS[p.kind].tone }}>
                          {KINDS[p.kind].letter}
                        </span>
                        <span className="min-w-0 flex-1">
                          <b className="block truncate text-[0.9375rem] font-semibold">{p.name}</b>
                          <span className="block text-[0.8125rem] leading-snug text-mut">{[p.sub || KINDS[p.kind].label, distText(p.m)].join(" · ")}</span>
                          {p.why && <span className="mt-0.5 block text-[0.8125rem] leading-snug">{p.why}</span>}
                        </span>
                      </button>
                      <a href={placeLink(p)} target="_blank" rel="noreferrer" aria-label={`${p.name}: ${appName}'da aç`} className="grid size-10 shrink-0 place-items-center text-acc">
                        <Icon name="nav" className="size-[1.125rem]" />
                      </a>
                      <button type="button" onClick={() => removePlace(p.id)} aria-label={`${p.name} sil`} className="grid size-10 shrink-0 place-items-center text-mut">
                        <Icon name="x" className="size-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null,
          )}

          <button type="button" onClick={removeAll} className={`${card} mt-6 flex h-12 w-full items-center justify-center gap-2 text-[0.9375rem] font-semibold text-rec`}>
            <Icon name="trash" className="size-[1.125rem]" />
            Çevre bilgisini sil
          </button>
        </>
      )}
    </>
  );
}
