"use client";

import { useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuth } from "@/features/auth/AuthProvider";
import { useData } from "@/features/data/DataProvider";
import { loadRace } from "@/features/athletes/races";
import { loadLive } from "@/features/athletes/raceLiveStore";
import { KEEP_DAYS, dropKept, listAllPending, listKept } from "@/features/raceMedia/pendingStore";
import { dropRaceFile, listRaceFiles } from "@/features/athletes/raceFiles";
import { localExtraCount, moveLocalExtras } from "@/features/athletes/raceStore";
import { listMeetings } from "@/lib/meeting/store";
import { bytesOf, inCloud, mediaCount, mediaGroups, raceFileInfo, sizeText, storageBytes } from "@/lib/deviceData";
import { Icon } from "@/components/ui/Icon";
import { Btn, Group, Row } from "./ui";

// Ayarlar › Telefondaki veriler (Seyhun 2026-10-22: "daha organize, kullanışlı"): telefonda saklananlar iki bölümde.
// Bulutta da var · silinebilir: 7 gün tutulan yarış/antrenman medyası (raceMedia/pendingStore "kept"), evrak ve talimat kopyaları,
// hazırlanan evrak (yeniden hazırlanır), uygulama dosyaları (yeniden iner). Medya silinmeden önce canlı belgede (raceLive.media)
// bulut kaydı aranır; bulunamayan silinmez. Yalnız bu telefonda · silinmez: yüklenmeyi bekleyen medya, Firebase'e gönderilmemiş
// evrak, özetlenmemiş toplantılar. Açılışta Firebase'den okuma yapılmaz; yarış adları ve bulut kontrolü medya açılınca/silinirken.
// Tarayıcının toplam kullanımı (storage.estimate) silmeden hemen sonra güncellenmez: bu oturumda silinen bayt düşülür,
// tarayıcı sayısı küçülünce sıfırlanır. Yoksa silinen veri "Diğer"e geçmiş gibi görünürdü.
let freed = 0;
let usedAtFree = 0;
const noteFreed = (n, usage) => {
  if (!freed) usedAtFree = usage;
  freed += n;
};

async function measure() {
  const [races, meetings, est, appBytes, extras, kept, pending] = await Promise.all([
    listRaceFiles().catch(() => []),
    listMeetings().catch(() => []),
    navigator.storage?.estimate?.().catch(() => null) ?? null,
    appCacheBytes(),
    localExtraCount().catch(() => 0),
    listKept(),
    listAllPending(),
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
  const media = mediaGroups(kept, KEEP_DAYS);
  const mediaBytes = media.reduce((n, g) => n + g.size, 0);
  const pendBytes = pending.reduce((n, x) => n + (x.blob?.size || 0), 0);
  // Silinebilen evrak: kopyalar, talimatlar, hazırlanan evrak; eklenen (":extra") yalnız telefonda, dokunulmaz
  const docFiles = files.filter((f) => f.kind !== "extra");
  const docBytes = docFiles.reduce((n, f) => n + f.size, 0);
  const extraBytes = raceBytes - docBytes;
  const known = raceBytes + meetBytes + appBytes + local + mediaBytes + pendBytes;
  if (freed && est?.usage && est.usage < usedAtFree - freed / 2) freed = 0;
  const usage = Math.max(0, (est?.usage || 0) - freed);
  const total = Math.max(usage, known);
  return {
    total,
    media,
    mediaBytes,
    docFiles,
    docBytes,
    appBytes,
    pending: pending.length,
    pendBytes,
    extras,
    extraBytes,
    meetings: meetings.length,
    meetBytes,
    local,
    usage: est?.usage || 0,
    fbBytes: est?.usage ? Math.max(0, usage - known) : null,
  };
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

// Bir bölüm satırı: ad, altında kısa açıklama, sağda boyut ya da düğme; dokununca altında liste açılır
function Item({ title, sub, size, warn, action, open, onClick, children }) {
  const body = (
    <div className="flex min-h-[3.25rem] items-center gap-3 px-4 py-2">
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[1rem] font-medium">{title}</span>
        {sub && <span className={`block truncate text-[0.8125rem] ${warn ? "text-amber-700 dark:text-amber-400" : "text-mut"}`}>{sub}</span>}
      </span>
      {size && <span className="shrink-0 text-[0.9375rem] tabular-nums text-mut">{size}</span>}
      {action}
      {onClick && <Icon name="chev" className={`size-4 shrink-0 text-mut/70 transition ${open ? "rotate-90" : ""}`} />}
    </div>
  );
  return (
    <div>
      {onClick ? (
        <button type="button" onClick={onClick} className="block w-full text-left transition active:bg-bg">
          {body}
        </button>
      ) : (
        body
      )}
      {open && children}
    </div>
  );
}

const PARTS = [
  ["mediaBytes", "Videolar", "bg-acc"],
  ["docBytes", "Evrak", "bg-acc/60"],
  ["appBytes", "Uygulama", "bg-acc/30"],
  ["waitBytes", "Bekleyen", "bg-amber-500"],
  ["restBytes", "Diğer", "bg-mut/40"],
];

export function DeviceDataRow() {
  const toast = useToast();
  const { profile } = useAuth();
  const { plans } = useData();
  const orgId = profile?.orgId || profile?.uid;
  const [open, setOpen] = useState(false);
  const [d, setD] = useState(null);
  const [shown, setShown] = useState(""); // media | docs
  const [names, setNames] = useState({});
  const [busy, setBusy] = useState("");
  const load = () => measure().then(setD, () => setD({ err: true }));
  const show = () => {
    load();
    setOpen(true);
  };
  // Yarış/antrenman adları yalnız medya listesi açılınca okunur (yarış başına bir okuma)
  const nameOf = (id) => {
    if (id.startsWith("ant-")) return plans.find((p) => `ant-${p.id}` === id)?.title || "Antrenman";
    return names[id] || "Yarış";
  };
  const openMedia = async () => {
    const next = shown === "media" ? "" : "media";
    setShown(next);
    if (next !== "media" || !d?.media) return;
    const ids = d.media.map((g) => g.raceId).filter((id) => !id.startsWith("ant-") && !names[id]);
    const got = await Promise.all(ids.map((id) => loadRace(orgId, id).then((r) => [id, r?.name || ""], () => [id, ""])));
    setNames((n) => ({ ...n, ...Object.fromEntries(got.filter(([, v]) => v)) }));
  };
  // Medya: önce buluttaki kaydı doğrula, yalnız kaydı bulunanları sil. Silinen ve kalan sayısı döner.
  const dropMedia = async (groups) => {
    let gone = 0;
    let left = 0;
    for (const g of groups) {
      const live = await loadLive(orgId, g.raceId).catch(() => null);
      const ok = live ? inCloud(g.ids, live.media) : [];
      for (const id of ok) await dropKept(id);
      gone += ok.length;
      left += g.ids.length - ok.length;
    }
    return { gone, left };
  };
  const dropDocs = async () => {
    for (const f of d.docFiles) await dropRaceFile(f.id);
  };
  const dropApp = async () => {
    try {
      for (const k of await caches.keys()) await caches.delete(k);
    } catch {}
  };
  const run = async (key, ask, fn) => {
    if (!confirm(ask)) return;
    setBusy(key);
    const before = d;
    try {
      const msg = await fn();
      toast(msg || "Silindi");
    } catch {
      toast("Silinemedi, internet bağlantısını kontrol et");
    }
    const after = await measure().catch(() => ({ err: true }));
    if (!after.err && before && !before.err) {
      const gone = before.mediaBytes + before.docBytes + before.appBytes - (after.mediaBytes + after.docBytes + after.appBytes);
      if (gone > 0) noteFreed(gone, after.usage);
    }
    setD(after.err ? after : await measure().catch(() => ({ err: true })));
    setBusy("");
  };
  const mediaMsg = ({ gone, left }) => (left ? `${gone} dosya silindi; ${left} dosyanın bulut kaydı bulunamadı, telefonda kaldı` : `${gone} dosya telefondan silindi, bulutta duruyor`);
  const dropOne = (g) => run(g.raceId, `${nameOf(g.raceId)}: ${mediaCount(g)} bu telefondan silinsin mi? Bulutta kalır, izlerken oradan açılır.`, () => dropMedia([g]).then(mediaMsg));
  const freeable = d && !d.err ? d.mediaBytes + d.docBytes + d.appBytes : 0;
  const dropAll = () =>
    run("all", `Bulutta da olan ${sizeText(freeable)} bu telefondan silinsin mi? Videolar ve evrak bulutta kalır, açınca iner; uygulama dosyaları sonraki açılışta yeniden iner.`, async () => {
      const m = await dropMedia(d.media);
      await dropDocs();
      await dropApp();
      return m.left ? mediaMsg(m) : "Telefon temizlendi, hepsi bulutta";
    });
  // Eklenen yarış evrakı (yalnız bu telefonda) Firebase Storage'a gider, yarışına bağlanır; Mac'ten de açılır.
  const send = async () => {
    setBusy("send");
    try {
      const out = await moveLocalExtras(orgId, undefined, (p) => setBusy(`send:${Math.round(p * 100)}`));
      toast(out.left ? `${out.moved} evrak gönderildi, ${out.left} gönderilemedi` : `${out.moved} evrak Firebase'e gönderildi`);
    } catch {
      toast("Gönderilemedi, internet bağlantısını kontrol et");
    }
    await load();
    setBusy("");
  };

  const ok = d && !d.err;
  const sums = ok ? { mediaBytes: d.mediaBytes, docBytes: d.docBytes, appBytes: d.appBytes, waitBytes: d.pendBytes + d.extraBytes + d.meetBytes } : {};
  if (ok) sums.restBytes = Math.max(0, d.total - sums.mediaBytes - sums.docBytes - sums.appBytes - sums.waitBytes);
  const onlyHere = ok && (d.pending || d.extras || d.meetings);

  return (
    <>
      <Row title="Telefondaki veriler" sub={ok ? sizeText(d.total) : ""} onClick={show} chevron />
      <Sheet open={open} onClose={() => setOpen(false)} title="Telefondaki veriler">
        {!d ? (
          <p className="py-4 text-[0.875rem] text-mut">Hesaplanıyor…</p>
        ) : d.err ? (
          <p className="py-4 text-[0.875rem] text-mut">Bu tarayıcı saklanan verileri göstermiyor.</p>
        ) : (
          <div className="pb-2">
            <section className="rounded-2xl border border-line bg-card px-4 py-3.5">
              <p className="text-[0.875rem] text-mut">Bu telefonda</p>
              <p className="text-[1.625rem] font-semibold tabular-nums">{sizeText(d.total)}</p>
              <div className="mt-2 flex h-2.5 overflow-hidden rounded-full bg-line">
                {PARTS.map(([k, , c]) => (sums[k] > 0 ? <i key={k} className={`block h-full ${c}`} style={{ width: `${(sums[k] / Math.max(1, d.total)) * 100}%` }} /> : null))}
              </div>
              <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[0.8125rem] text-fg2">
                {PARTS.filter(([k]) => sums[k] > 0).map(([k, label, c]) => (
                  <span key={k} className="inline-flex items-center gap-1.5">
                    <i className={`inline-block size-2 rounded-full ${c}`} />
                    {label}
                  </span>
                ))}
              </p>
            </section>

            <Group title="Bulutta da var · silinebilir">
              {d.media.length > 0 && (
                <Item
                  title="Yarış videoları ve fotoğrafları"
                  sub={`${d.media.reduce((n, g) => n + g.ids.length, 0)} dosya · ${KEEP_DAYS} gün sonra silinir`}
                  size={sizeText(d.mediaBytes)}
                  open={shown === "media"}
                  onClick={openMedia}
                >
                  <ul className="divide-y divide-line border-t border-line">
                    {d.media.map((g) => (
                      <li key={g.raceId} className="flex items-center gap-3 px-4 py-2.5">
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[0.9375rem] font-medium">{nameOf(g.raceId)}</span>
                          <span className="block truncate text-[0.8125rem] text-mut">
                            {mediaCount(g)} · {g.daysLeft ? `${g.daysLeft} gün daha telefonda` : "bugün silinecek"}
                          </span>
                        </span>
                        <span className="shrink-0 text-[0.875rem] tabular-nums text-mut">{sizeText(g.size)}</span>
                        <Btn kind="danger" small disabled={!!busy} onClick={() => dropOne(g)}>
                          {busy === g.raceId ? "…" : "Sil"}
                        </Btn>
                      </li>
                    ))}
                  </ul>
                </Item>
              )}
              {d.docFiles.length > 0 && (
                <Item title="Evrak ve talimat kopyaları" sub="Açınca yeniden iner ya da hazırlanır" size={sizeText(d.docBytes)} open={shown === "docs"} onClick={() => setShown((v) => (v === "docs" ? "" : "docs"))}>
                  <ul className="divide-y divide-line border-t border-line">
                    {d.docFiles.map((f) => (
                      <li key={f.id} className="flex items-center gap-3 px-4 py-2.5">
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[0.9375rem] font-medium">{f.title}</span>
                          <span className="block truncate text-[0.8125rem] text-mut">{f.sub}</span>
                        </span>
                        <span className="shrink-0 text-[0.875rem] tabular-nums text-mut">{sizeText(f.size)}</span>
                        <Btn kind="danger" small disabled={!!busy} onClick={() => run(f.id, `${f.title} bu telefondan silinsin mi? Gerekince yeniden hazırlanır ya da indirilir.`, () => dropRaceFile(f.id))}>
                          {busy === f.id ? "…" : "Sil"}
                        </Btn>
                      </li>
                    ))}
                  </ul>
                </Item>
              )}
              {d.appBytes > 0 && <Item title="Uygulama dosyaları" sub="Sonraki açılışta yeniden iner" size={sizeText(d.appBytes)} />}
              {freeable > 0 ? (
                <div className="px-4 pb-3.5 pt-1">
                  <Btn kind="danger" disabled={!!busy} onClick={dropAll}>
                    {busy === "all" ? "Siliniyor…" : `Hepsini sil · ${sizeText(freeable)}`}
                  </Btn>
                </div>
              ) : (
                <Item title="Silinecek bir şey yok" />
              )}
            </Group>

            <Group title="Yalnız bu telefonda · silinmez">
              {!onlyHere && <Item title="Yok, hepsi bulutta" />}
              {d.pending > 0 && (
                <Item title="Yüklenmeyi bekleyen medya" sub={`${d.pending} dosya · internet gelince yüklenir`} warn size={sizeText(d.pendBytes)} />
              )}
              {d.extras > 0 && (
                <Item
                  title="Gönderilmemiş evrak"
                  sub={`${d.extras} dosya · Mac'ten açılmaz`}
                  warn
                  action={
                    <Btn small disabled={!!busy} onClick={send}>
                      {busy.startsWith("send") ? `%${busy.split(":")[1] || 0}` : "Gönder"}
                    </Btn>
                  }
                />
              )}
              {d.meetings > 0 && <Item title="Özetlenmemiş toplantılar" sub={`${d.meetings} kayıt · Notlar › Toplantı'dan özetle`} warn size={sizeText(d.meetBytes)} />}
            </Group>

            <Group title="Uygulamanın kendisi">
              <Item title="Çevrimdışı kayıtlar" sub="İnternetsiz açılsın diye" size={d.fbBytes == null ? "?" : `≈ ${sizeText(d.fbBytes)}`} />
              <Item title="Ayarlar" size={sizeText(d.local)} />
            </Group>
          </div>
        )}
      </Sheet>
    </>
  );
}
