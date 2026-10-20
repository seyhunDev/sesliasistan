"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAuth } from "@/features/auth/AuthProvider";
import { useNotifications } from "@/features/settings/Groups";
import { Btn, Group, Row } from "@/features/settings/ui";
import { useToast } from "@/components/ui/ToastProvider";
import { Icon } from "@/components/ui/Icon";
import { authFetch, jsonOf } from "@/lib/authFetch";
import { REMIND_LABEL, TEST_DELAY, TEST_KEEP, TEST_KINDS, flatLine, kindLabel, previewOf } from "@/lib/pushTest";

// Bildirim testi (Ayarlar › Testler): sahte kayıtla gerçek bildirimi telefona gönderir; ne zaman gönderildiği ve telefona
// ne zaman ulaştığı aşağıdaki kayıtta görünür. Deneme kayıtları gerçek verilere ve zile karışmaz, 3 saatte silinir (lib/pushTest).

const tz = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return undefined;
  }
};
const clock = (iso) => (iso ? new Date(iso).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "");
const gap = (a, b) => {
  const s = Math.round((Date.parse(b) - Date.parse(a)) / 1000);
  return s < 60 ? `${s} sn` : `${Math.floor(s / 60)} dk ${s % 60} sn`;
};

// Telefonda görünüşü: uygulama simgesi, ad, tek satır metin (public/sw.js başlığı ve gövdeyi birleştirir)
function Banner({ msg }) {
  if (!msg) return null;
  return (
    <div className="mx-4 mb-3 flex gap-2.5 rounded-2xl border border-line bg-bg px-3 py-2.5">
      <img src="/icons/icon-192.png" alt="" className="mt-0.5 size-8 shrink-0 rounded-[0.5rem]" />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2 text-[0.75rem] text-mut">
          <span className="font-semibold">Velora</span>
          <span>şimdi</span>
        </div>
        <p className="text-[0.875rem] font-semibold leading-snug">{flatLine(msg)}</p>
      </div>
    </div>
  );
}

// Deneme türü satırı: ada dokununca örnek bildirim açılır, sağdaki düğme denemeyi başlatır (Row düğme içinde düğme olmasın diye ayrı)
function KindRow({ kind, label, action, busy, onSend }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <div className="flex min-h-[3rem] items-center gap-3 px-4">
        <button type="button" onClick={() => setOpen(!open)} className="flex min-w-0 flex-1 items-center gap-2 py-2.5 text-left">
          <span className="truncate text-[1rem] font-medium">{label}</span>
          <Icon name="chev" className={`size-4 shrink-0 text-mut/70 transition ${open ? "rotate-90" : ""}`} />
        </button>
        <Btn small kind="line" disabled={busy} onClick={() => onSend(kind)}>
          {action}
        </Btn>
      </div>
      {open && <Banner msg={previewOf(kind, { tz: tz() })} />}
    </div>
  );
}

// Zamanlayıcı satırı: son çalışma saati; 10 dakikadan eskiyse ya da yarıda kaldıysa nedeni altında
const ago = (iso, now) => {
  const m = Math.round((now - Date.parse(iso)) / 60000);
  return m < 1 ? "az önce" : m < 60 ? `${m} dk önce` : m < 1440 ? `${Math.floor(m / 60)} saat önce` : `${Math.floor(m / 1440)} gün önce`;
};
function beatSub(b, now) {
  if (!b) return "";
  if (b.error) return "Okunamadı";
  if (!b.start) return "Hiç çalışmamış";
  return ago(b.end && b.end >= b.start ? b.end : b.start, now);
}
function beatNote(b, now) {
  if (!b) return "";
  if (b.error) return b.error;
  if (!b.start) return "Zamanlayıcı bu sürümden beri hiç çalışmadı; hatırlatmalar ve özetler gitmez";
  if (now - Date.parse(b.start) > 10 * 60e3) return "10 dakikadan uzun süredir çalışmıyor; hatırlatmalar ve özetler gitmez";
  if (!b.end || b.end < b.start) return now - Date.parse(b.start) > 60e3 ? "Son çalışması yarıda kaldı (hata)" : "";
  return "";
}

function status(t, now) {
  if (t.got) return `Ulaştı ${clock(t.got)}`;
  if (t.sent) return t.err ? "Gönderilemedi" : "Gönderildi";
  if (t.err) return "Gönderilmedi";
  const left = Math.ceil((Date.parse(t.due) - now) / 1000);
  if (left > 0) return left < 120 ? `${left} sn sonra` : `${clock(t.due).slice(0, 5)}'de`;
  return "Sırada";
}

// Kayıttaki bir deneme: dokununca zamanlar ve gönderilen metin
function LogRow({ t, now }) {
  const [open, setOpen] = useState(false);
  const lines = [
    ["Oluşturuldu", clock(t.at)],
    t.plan && ["Plan saati", `${t.plan.time}${t.plan.date !== t.at.slice(0, 10) ? " (yarın)" : ""}`],
    ["Gönderim zamanı", clock(t.due)],
    t.sent && ["Gönderildi", `${clock(t.sent)} · ${t.via}${t.devices ? ` · ${t.devices} cihaz` : ""}`],
    t.sent && ["Gecikme", gap(t.due, t.sent)],
    t.got && ["Telefona ulaştı", `${clock(t.got)} · ${gap(t.sent || t.due, t.got)} sonra`],
    t.sent && !t.got && ["Telefona ulaştı", "Onay gelmedi"],
  ].filter(Boolean);
  return (
    <Row title={kindLabel(t.kind)} sub={status(t, now)} note={t.err || ""} open={open} onClick={() => setOpen(!open)}>
      {open && (
        <>
          <dl className="mx-4 mb-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[0.8125rem]">
            {lines.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-mut">{k}</dt>
                <dd className="text-right tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>
          <Banner msg={t.title || t.body ? t : previewOf(t.kind, { tz: tz() })} />
        </>
      )}
    </Row>
  );
}

export default function PushTestPage() {
  const { profile } = useAuth();
  const n = useNotifications();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const tests = Object.entries(profile?.pushTests || {})
    .map(([id, t]) => ({ ...t, id }))
    .filter((t) => now - Date.parse(t.at || 0) < TEST_KEEP)
    .sort((a, b) => (b.at || "").localeCompare(a.at || ""));
  const waiting = tests.some((t) => !t.got && !t.err);

  // Zamanlayıcı (5 dakikada bir) en son ne zaman çalıştı; sayfa açılınca bir kez sorulur
  const [beat, setBeat] = useState(null);
  useEffect(() => {
    authFetch("/api/push-tests")
      .then(jsonOf)
      .then((j) => setBeat(j.error ? { error: j.error } : j))
      .catch((e) => setBeat({ error: e.message }));
  }, []);

  // Uygulama açıkken zamanı 5 sn geçen deneme hâlâ gitmediyse sunucudan hemen gönderilmesi istenir (yol: "uygulama")
  const late = tests.filter((t) => t.kind !== "remind" && !t.sent && !t.err && now - Date.parse(t.due) > 5000).map((t) => t.id);
  const lateKey = late.join(",");
  useEffect(() => {
    if (!lateKey) return;
    for (const run of lateKey.split(",")) authFetch("/api/push-tests", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ run }) }).catch(() => {});
  }, [lateKey]);

  // Bekleyen deneme varken geri sayım saniyede bir yenilenir
  useEffect(() => {
    if (!waiting) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [waiting]);

  async function call(method, body) {
    setBusy(true);
    try {
      const r = await authFetch("/api/push-tests", { method, headers: { "content-type": "application/json" }, body: body && JSON.stringify(body) });
      const j = await jsonOf(r);
      if (!r.ok) throw new Error(j.error || "Olmadı, tekrar dene");
      setNow(Date.now());
      return j;
    } catch (e) {
      toast(e.message);
    } finally {
      setBusy(false);
    }
  }
  const send = (kind) => call("POST", { kind, tz: tz() }).then((j) => j && toast(kind === "remind" ? "Deneme planı oluşturuldu" : `${TEST_DELAY} sn sonra gelecek`));

  return (
    <main className="mx-auto max-w-[30rem] px-5 pb-[calc(3rem+env(safe-area-inset-bottom))]">
      <PageHeader title="Bildirim testi" back="/settings" />

      <Group>
        <Row title="Bu telefonda bildirim" sub={n.on ? "Açık" : "Kapalı"} note={n.on ? "" : n.problem} />
        <Row title="Hemen dene" chevron={n.on} onClick={() => (n.on ? n.test() : null)} />
        <Row title="Zamanlayıcı" sub={beatSub(beat, now)} note={beatNote(beat, now)} />
      </Group>

      <Group title={`${TEST_DELAY} saniye sonra`}>
        {TEST_KINDS.map((k) => (
          <KindRow key={k.kind} kind={k.kind} label={k.label} action={`${TEST_DELAY} sn`} busy={busy} onSend={send} />
        ))}
      </Group>

      <Group title="Hatırlatma">
        <KindRow kind="remind" label={REMIND_LABEL} action="Oluştur" busy={busy} onSend={send} />
      </Group>

      {tests.length > 0 && (
        <Group title="Kayıt">
          {tests.map((t) => (
            <LogRow key={t.id} t={t} now={now} />
          ))}
          <Row title="Kaydı temizle" danger onClick={() => call("DELETE")} />
        </Group>
      )}
    </main>
  );
}
