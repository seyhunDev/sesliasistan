"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { OSM, OSM_ATTR, loadLeaflet } from "@/lib/leaflet";
import { addressText, parseReverse, tileOf } from "../address";
import { herePos } from "../store";

// Adres ekleme / düzenleme (Seyhun 2026-10-23 örneği): 1) haritayı kaydırıp iğneyi kapıya getir (sokak haritadan yazılır),
// 2) Ev / İş / Kulüp / Diğer, sokak, kat, daire, zil, kuryeye not. Düzenlemede doğrudan 2. adım açılır.
const DIKILI = { lat: 39.0712, lng: 26.8889 };
const KINDS = ["Ev", "İş", "Kulüp"];
const REVERSE = "https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&accept-language=tr";

export function AddressForm({ start, pos, onSave, onCancel, onDelete }) {
  const [step, setStep] = useState(start ? 2 : 1);
  const [at, setAt] = useState(start?.pos || pos || DIKILI);
  const [found, setFound] = useState(start ? { street: start.street ?? start.text ?? "", area: start.area || "" } : null);
  const [street, setStreet] = useState(start?.street ?? start?.text ?? "");
  const [area, setArea] = useState(start?.area || "");
  const [kind, setKind] = useState(start ? (KINDS.includes(start.name) ? start.name : "Diğer") : "Ev");
  const [name, setName] = useState(start && !KINDS.includes(start.name) ? start.name : "");
  const [floor, setFloor] = useState(start?.floor || "");
  const [flat, setFlat] = useState(start?.flat || "");
  const [bell, setBell] = useState(start?.bell || "");
  const [note, setNote] = useState(start?.note || "");
  const [busy, setBusy] = useState(false);

  const useSpot = () => {
    // Haritadan gelen sokak boşsa ya da konum değiştiyse yazılanın yerine geçer
    if (found?.street) setStreet(found.street);
    if (found?.area) setArea(found.area);
    setStep(2);
  };
  const title = kind === "Diğer" ? name.trim() : kind;
  const save = async () => {
    setBusy(true);
    const a = { id: start?.id || `a${Date.now().toString(36)}`, name: title, street: street.trim(), area, floor: floor.trim(), flat: flat.trim(), bell: bell.trim(), note: note.trim(), pos: at };
    await onSave({ ...a, text: addressText(a) });
    setBusy(false);
  };

  if (step === 1) {
    return (
      <div className="space-y-3 pb-2">
        <MapPick at={at} onMove={setAt} onFound={setFound} />
        <div className="min-h-[2.75rem] px-1 leading-tight">
          <b className="block truncate text-[0.9375rem] font-semibold">{found ? found.street || "Sokak bulunamadı" : "…"}</b>
          <small className="block truncate text-[0.8125rem] text-mut">{found?.area || ""}</small>
        </div>
        <div className="grid grid-cols-[1fr_1.7fr] gap-2.5">
          <Button variant="secondary" onClick={() => (start ? setStep(2) : onCancel())}>{start ? "Geri" : "Vazgeç"}</Button>
          <Button onClick={useSpot}>Bu konum</Button>
        </div>
      </div>
    );
  }

  const tiles = tileOf(at);
  return (
    <div className="space-y-3 pb-2">
      <div className="flex items-center gap-3 rounded-[1.25rem] border border-line bg-bg p-2">
        <span className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-line"
          style={{ backgroundImage: tiles.map((t) => `url(${t.url})`).join(","), backgroundPosition: tiles.map((t) => `${28 + t.dx}px ${28 + t.dy}px`).join(","), backgroundRepeat: "no-repeat" }}>
          <span className="absolute left-1/2 top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white bg-deep shadow" />
        </span>
        <span className="min-w-0 flex-1 leading-tight">
          <b className="block truncate text-[0.9375rem] font-semibold">{street || "Haritadaki yer"}</b>
          <small className="block truncate text-[0.8125rem] text-mut">{area}</small>
        </span>
        <button type="button" onClick={() => setStep(1)} className="shrink-0 px-1.5 text-[0.875rem] font-semibold text-acc">Değiştir</button>
      </div>
      <div className="flex gap-2">
        {[...KINDS, "Diğer"].map((k) => (
          <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)} data-press
            className={`h-11 flex-1 rounded-xl border text-[0.875rem] font-semibold ${kind === k ? "border-acc bg-accbg text-acc" : "border-line bg-card"}`}>{k}</button>
        ))}
      </div>
      {kind === "Diğer" && <Field label="Adı" value={name} set={setName} max={24} />}
      <Field label="Sokak ve bina no" value={street} set={setStreet} max={80} />
      <div className="grid grid-cols-3 gap-2">
        <Field label="Kat" value={floor} set={setFloor} max={6} />
        <Field label="Daire" value={flat} set={setFlat} max={6} />
        <Field label="Zil" value={bell} set={setBell} max={20} />
      </div>
      <Field label="Kuryeye not" value={note} set={setNote} max={120} />
      <div className="grid grid-cols-[1fr_1.7fr] gap-2.5 pt-1">
        <Button variant="secondary" onClick={onCancel}>Vazgeç</Button>
        <Button loading={busy} disabled={!title || !street.trim()} onClick={save}>Kaydet</Button>
      </div>
      {onDelete && (
        <button type="button" onClick={() => window.confirm(`${start.name} silinsin mi?`) && onDelete()} className="w-full py-2 text-[0.875rem] font-semibold text-mut">Adresi sil</button>
      )}
    </div>
  );
}

// Kutunun üstünde küçük ad, altında yazı (dolu alan da ne olduğunu söylesin)
function Field({ label, value, set, max }) {
  return (
    <label className="block rounded-xl border border-line bg-card px-3.5 pb-1.5 pt-1.5 focus-within:border-acc">
      <small className="block text-[0.75rem] font-semibold text-mut">{label}</small>
      <input value={value} onChange={(e) => set(e.target.value)} maxLength={max} className="block w-full bg-transparent text-base outline-none" />
    </label>
  );
}

// Harita: iğne ortada sabit, harita kayar. Durunca yer ve sokak adı (1 sn sonra; Nominatim saniyede bir istek ister).
function MapPick({ at, onMove, onFound }) {
  const box = useRef(null);
  const map = useRef(null);
  const timer = useRef(null);
  const [err, setErr] = useState(false);
  const cb = useRef({ onMove, onFound });
  useEffect(() => {
    cb.current = { onMove, onFound };
  });

  useEffect(() => {
    let live = true;
    const ask = (c) => {
      clearTimeout(timer.current);
      cb.current.onFound(null);
      timer.current = setTimeout(() => {
        fetch(`${REVERSE}&lat=${c.lat}&lon=${c.lng}`)
          .then((r) => (r.ok ? r.json() : null))
          .then((j) => live && cb.current.onFound(j ? parseReverse(j) : { street: "", area: "" }))
          .catch(() => live && cb.current.onFound({ street: "", area: "" }));
      }, 900);
    };
    loadLeaflet()
      .then((L) => {
        if (!live || !box.current) return;
        const m = L.map(box.current, { zoomControl: false, attributionControl: true }).setView([at.lat, at.lng], 17);
        L.tileLayer(OSM, { maxZoom: 19, attribution: OSM_ATTR }).addTo(m);
        m.attributionControl.setPosition("topright");
        m.on("moveend", () => {
          const c = m.getCenter();
          const p = { lat: +c.lat.toFixed(6), lng: +c.lng.toFixed(6) };
          cb.current.onMove(p);
          ask(p);
        });
        map.current = m;
        ask(at);
      })
      .catch(() => live && setErr(true));
    return () => {
      live = false;
      clearTimeout(timer.current);
      map.current?.remove();
      map.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const goMe = async () => {
    const p = await herePos();
    if (p && map.current) map.current.setView([p.lat, p.lng], 18);
  };

  if (err) return <p className="py-6 text-center text-[0.9375rem] text-mut">Harita açılamadı</p>;
  // Pencerenin aşağı çekme hareketi haritayı kaydırırken çalışmasın
  return (
    <div className="relative" onTouchStart={(e) => e.stopPropagation()} onTouchMove={(e) => e.stopPropagation()} onTouchEnd={(e) => e.stopPropagation()}>
      <div ref={box} className="h-[22rem] w-full overflow-hidden rounded-[1.25rem] border border-line bg-line" />
      <svg aria-hidden="true" width="36" height="46" viewBox="0 0 36 46" className="pointer-events-none absolute left-1/2 top-1/2 z-[500] -translate-x-1/2 -translate-y-full">
        <ellipse cx="18" cy="44" rx="6" ry="2" fill="rgba(0,0,0,.2)" />
        <path d="M18 2C9 2 3 8.5 3 17c0 11 15 26 15 26s15-15 15-26C33 8.5 27 2 18 2z" fill="#0f2c45" />
        <circle cx="18" cy="17" r="6" fill="#fff" />
      </svg>
      <button type="button" onClick={goMe} data-press className="raised absolute bottom-3 right-3 z-[500] h-10 rounded-full border border-line bg-card px-4 text-[0.875rem] font-semibold">Konumum</button>
    </div>
  );
}
