"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/ToastProvider";
import { dropRaceFile, listRaceFiles } from "@/features/athletes/raceFiles";
import { listMeetings } from "@/lib/meeting/store";
import { bytesOf, raceFileInfo, sizeText, storageBytes } from "@/lib/deviceData";
import { Row } from "./ui";

// Ayarlar › Bu cihazdaki veriler: telefonda saklananlar ve boyutları. Firebase'den okuma yapmaz.
// Yarış evrakı ve talimat kopyaları tek tek silinebilir (gerekince yeniden hazırlanır / indirilir);
// uygulama dosyaları silinirse sonraki açılışta yeniden iner. Bekleyen toplantılar ve Firebase önbelleği yalnız gösterilir.
async function measure() {
  const [races, meetings, est, appBytes, fbNames] = await Promise.all([
    listRaceFiles().catch(() => []),
    listMeetings().catch(() => []),
    navigator.storage?.estimate?.().catch(() => null) ?? null,
    appCacheBytes(),
    indexedDB.databases ? indexedDB.databases().then((l) => l.map((d) => d.name || "").filter((n) => n.startsWith("firestore"))).catch(() => []) : [],
  ]);
  // Hazırlanan evrakın adı eklenen evrakta da görünsün
  const names = new Map(races.filter((r) => !String(r.id).includes(":")).map((r) => [r.id, String(r.name || "").replace(/-evrak\.pdf$/, "").replace(/-/g, " ")]));
  const files = races.map((r) => raceFileInfo(r, (id) => names.get(id) || "")).sort((a, b) => b.size - a.size);
  let local = 0;
  try {
    local = storageBytes(Object.keys(localStorage).map((k) => [k, localStorage.getItem(k)]));
  } catch {}
  const raceBytes = files.reduce((n, f) => n + f.size, 0);
  const meetBytes = bytesOf(meetings);
  const known = raceBytes + meetBytes + appBytes + local;
  const total = est?.usage || 0;
  return { files, raceBytes, meetings: meetings.length, meetBytes, appBytes, local, fb: fbNames.length > 0, fbBytes: total ? Math.max(0, total - known) : null, total: Math.max(total, known), quota: est?.quota || 0 };
}

async function appCacheBytes() {
  if (typeof caches === "undefined") return 0;
  let n = 0;
  try {
    for (const name of await caches.keys()) {
      const c = await caches.open(name);
      for (const req of await c.keys()) {
        const res = await c.match(req);
        const len = Number(res?.headers.get("content-length"));
        n += len > 0 ? len : (await res?.clone().blob())?.size || 0;
      }
    }
  } catch {}
  return n;
}

export function DeviceDataRow() {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [d, setD] = useState(null);
  const [busy, setBusy] = useState("");
  const load = () => measure().then(setD, () => setD({ err: true }));
  const toggle = () => {
    if (!open && !d) load();
    setOpen((v) => !v);
  };
  const drop = async (ids, label) => {
    if (!confirm(`${label} bu telefondan silinsin mi? Gerekince yeniden hazırlanır ya da indirilir.`)) return;
    setBusy(label);
    for (const id of ids) await dropRaceFile(id);
    await load();
    setBusy("");
    toast("Silindi");
  };
  const dropApp = async () => {
    if (!confirm("Uygulama dosyaları silinsin mi? Sonraki açılışta yeniden iner (internet gerekir).")) return;
    setBusy("app");
    try {
      for (const k of await caches.keys()) await caches.delete(k);
    } catch {}
    await load();
    setBusy("");
    toast("Uygulama dosyaları silindi");
  };

  const line = (title, sub, size, action) => (
    <li key={title + sub} className="flex items-center gap-3 py-2.5">
      <span className="min-w-0 flex-1">
        <b className="block truncate text-[0.9375rem] font-medium">{title}</b>
        {sub && <span className="block truncate text-[0.8125rem] text-mut">{sub}</span>}
      </span>
      <span className="shrink-0 text-[0.875rem] font-semibold tabular-nums">{size}</span>
      {action}
    </li>
  );
  const del = (onClick, key) => (
    <button type="button" disabled={!!busy} onClick={onClick} className="shrink-0 rounded-lg bg-rec/10 px-2.5 py-1 text-[0.8125rem] font-semibold text-rec disabled:opacity-40">
      {busy === key ? "…" : "Sil"}
    </button>
  );

  return (
    <Row icon="box" tone="slate" title="Bu cihazdaki veriler" sub={d && !d.err ? `Toplam ${sizeText(d.total)}${d.quota ? ` · ${sizeText(d.quota)} sınır` : ""}` : "Telefonda saklananlar ve boyutları"} onClick={toggle} chevron>
      {open && (
        <div className="px-4 pb-3">
          {!d ? (
            <p className="py-2 text-[0.875rem] text-mut">Hesaplanıyor…</p>
          ) : d.err ? (
            <p className="py-2 text-[0.875rem] text-mut">Bu tarayıcı saklanan verileri göstermiyor.</p>
          ) : (
            <>
              <ul className="divide-y divide-line">
                {line("Yarış evrakı ve talimatlar", `${d.files.length} kayıt`, sizeText(d.raceBytes), d.files.length > 0 && del(() => drop(d.files.map((f) => f.id), "Tüm yarış evrakı"), "Tüm yarış evrakı"))}
                {line("Bekleyen toplantılar", d.meetings ? `${d.meetings} kayıt (özetlenmemiş)` : "Yok", sizeText(d.meetBytes))}
                {line("Firebase önbelleği", "Planlar, görevler, notlar, mesajlar (internetsiz açılsın diye)", d.fbBytes == null ? "?" : `≈ ${sizeText(d.fbBytes)}`)}
                {line("Uygulama dosyaları", "Sayfalar, yazı tipleri, logolar", sizeText(d.appBytes), d.appBytes > 0 && del(dropApp, "app"))}
                {line("Ayarlar", "Ses, hız, sıralama gibi küçük ayarlar", sizeText(d.local))}
              </ul>
              {d.files.length > 0 && (
                <>
                  <p className="mt-3 text-[0.6875rem] font-semibold tracking-wide text-mut">YARIŞ EVRAKI</p>
                  <ul className="divide-y divide-line">{d.files.map((f) => line(f.title, f.sub, sizeText(f.size), del(() => drop([f.id], f.title), f.title)))}</ul>
                </>
              )}
              <p className="mt-2 text-[0.75rem] leading-snug text-mut">
                Yalnız bu telefonda; başka cihazı etkilemez. Firebase önbelleği yaklaşık hesaplanır ve uygulama onu kendisi yönetir.
              </p>
            </>
          )}
        </div>
      )}
    </Row>
  );
}
