"use client";

import { useEffect, useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuth } from "@/features/auth/AuthProvider";
import { MicTest } from "@/features/permissions/PermissionsCard";
import { RATES, SAMPLE, useTts } from "@/features/speech/TtsProvider";
import { voiceHelp, voiceLabel, voiceQuality } from "@/lib/speech/speakText";
import { usePermissions } from "@/hooks/usePermissions";
import { db } from "@/lib/firebase/clientApp";
import { authFetch } from "@/lib/authFetch";
import { PERM_LABEL, PERM_NAMES, appAllowed, permissionHelp, setAppAllowed } from "@/lib/permissions";
import { disableReminders, enableReminders, loadReminders, needsInstall, pushConfigured, pushSupported, setLead, testPush } from "@/lib/push";
import { LEADS } from "@/lib/reminders";
import { WIND_KN, WIND_KNS } from "@/lib/notifyExtra";
import { SIZES, applySize } from "@/lib/textSize";
import { getPlace, placeLabel, searchPlaces, setPlace } from "@/features/weather/weather";
import { Badge, Chips, Row, Switch } from "./ui";
import { useRaceHome } from "@/features/athletes/raceHome";

// Ayarlar sayfasının satırları. Sayfa bunları "Sık kullanılanlar" ve "Diğer ayarlar" olarak dizer;
// seyrek ayarlar (izinler, hatırlatma süresi…) dokununca açılan satırlarda durur.

const saveUser = (uid, patch) => updateDoc(doc(db, "users", uid), patch);

// Dokununca altı açılan satır (az kullanılan ayarlar için)
function Fold({ children, ...row }) {
  const [open, setOpen] = useState(false);
  return (
    <Row {...row} onClick={() => setOpen((v) => !v)} right={<Icon name="chev" className={`size-4 shrink-0 text-mut/70 transition ${open ? "rotate-90" : ""}`} />}>
      {open && <div className="fade-in">{children}</div>}
    </Row>
  );
}

// ---- Yazı boyutu (seçince hemen uygulanır, her cihazda aynı) ----
export function SizeRow() {
  const { profile } = useAuth();
  const toast = useToast();
  const [size, setSize] = useState(profile?.textSize || "");
  const pick = (v) => {
    const prev = size;
    setSize(v);
    applySize(v);
    saveUser(profile.uid, { textSize: v }).catch(() => {
      setSize(prev);
      applySize(prev);
      toast("Kaydedilemedi, tekrar dene");
    });
  };
  return (
    <Row icon="search" tone="sky" title="Yazı boyutu" sub="Yazılar, simgeler ve düğmeler birlikte büyür">
      <Chips value={size} options={SIZES} onChange={pick} />
    </Row>
  );
}

// ---- Sesli yanıt ----
// Açıkken altında ses, hız ve "Dene" çıkar. En doğal ses iPhone'da indirilen Premium/Gelişmiş Türkçe sestir.
export function VoiceRow() {
  const tts = useTts();
  if (!tts.supported) return null;
  const best = tts.voices.find((v) => voiceQuality(v) > 0);
  const using = tts.voices.find((v) => v.voiceURI === tts.voiceUri) || best;
  return (
    <Row icon="volume" tone="sky" title="Sesli yanıt" sub="Asistanın yanıtları sesli okunur" right={<Switch on={tts.enabled} onChange={() => tts.toggle()} label="Sesli yanıt" />}>
      {tts.enabled && (
        <div className="fade-in space-y-2.5 px-4 pb-3.5 pl-[3.75rem]">
          {tts.voices.length > 0 && (
            <label className="flex items-center gap-2 text-[0.8125rem] text-mut">
              Ses
              <select
                value={tts.voiceUri}
                onChange={(e) => tts.setVoice(e.target.value)}
                className="min-w-0 flex-1 rounded-full bg-bg px-3 py-1.5 text-[0.8125rem] font-medium text-fg"
              >
                <option value="">Otomatik{best ? ` (${voiceLabel(best)})` : ""}</option>
                {tts.voices.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>{voiceLabel(v)}</option>
                ))}
              </select>
            </label>
          )}
          <div className="flex flex-wrap items-center gap-1.5">
            {RATES.map(([v, label]) => (
              <button
                key={v}
                type="button"
                onClick={() => tts.setRate(v)}
                className={`rounded-full px-3 py-1.5 text-[0.8125rem] font-medium transition active:scale-95 ${tts.rate === v ? "bg-acc text-white" : "bg-bg text-fg"}`}
              >
                {label}
              </button>
            ))}
            <button type="button" onClick={() => tts.speak(SAMPLE)} className="ml-auto flex items-center gap-1 rounded-full bg-bg px-3 py-1.5 text-[0.8125rem] font-semibold text-acc transition active:scale-95">
              <Icon name="volume" className="size-4" />
              Dene
            </button>
          </div>
          {(!using || voiceQuality(using) < 3 || using.localService === false) && (
            <p className="text-[0.75rem] leading-snug text-mut">
              {!tts.voices.length ? "Bu cihazda Türkçe ses bulunamadı. " : ""}
              Daha doğal ses için {typeof navigator !== "undefined" && voiceHelp(navigator.userAgent, navigator.maxTouchPoints)}
            </p>
          )}
        </div>
      )}
    </Row>
  );
}

// ---- Güçlü sürüm ----
export function PowerRow() {
  const { profile } = useAuth();
  const toast = useToast();
  const [strong, setStrong] = useState(profile?.aiPower === "strong");
  const flip = (v) => {
    setStrong(v);
    try {
      localStorage.setItem("sa-ai-power", v ? "strong" : "");
    } catch {}
    saveUser(profile.uid, { aiPower: v ? "strong" : "standard" }).catch(() => {
      setStrong(!v);
      toast("Kaydedilemedi, tekrar dene");
    });
  };
  return (
    <Row
      icon="zap"
      tone="violet"
      title="Güçlü yapay zeka"
      sub={strong ? "Açık: daha akıllı; kotası dolunca standarda geçer" : "Standart yapay zeka"}
      right={<Switch on={strong} onChange={flip} label="Güçlü yapay zeka" />}
    />
  );
}

// ---- Bildirimler: durum tek yerde (aç/kapat satırı, hatırlatma süresi, deneme aynı durumu kullanır) ----
export function useNotifications() {
  const { user, profile } = useAuth();
  const toast = useToast();
  const [st, setSt] = useState(null); // { on, lead, here }
  const [env, setEnv] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    let live = true;
    loadReminders(user.uid).then((s) => {
      if (!live) return;
      setSt(s);
      setEnv({
        supported: pushSupported(),
        configured: pushConfigured(),
        install: needsInstall(),
        blocked: typeof Notification !== "undefined" && Notification.permission === "denied",
      });
    });
    return () => {
      live = false;
    };
  }, [user]);

  const on = !!st?.here;
  async function toggle() {
    setBusy(true);
    try {
      if (on) {
        await disableReminders(profile);
        setSt((s) => ({ ...s, here: false }));
        toast("Bu cihazda bildirimler kapandı");
      } else {
        await enableReminders(profile, st?.lead || 60);
        setSt((s) => ({ ...s, on: true, here: true }));
        toast("Bildirimler açıldı");
      }
    } catch (e) {
      toast(e.message || "Bir sorun oluştu");
    }
    setBusy(false);
  }
  const pickLead = (lead) => {
    setSt((s) => ({ ...s, lead }));
    setLead(profile, lead).catch(() => toast("Kaydedilemedi, tekrar dene"));
  };
  const test = () => testPush().then(() => toast("Deneme bildirimi gönderildi"), (e) => toast(e.message));

  // Bildirim açılamıyorsa sebebi (satırın altında)
  let problem = "";
  if (env?.install) problem = "Önce ana ekrana ekle: Paylaş › Ana Ekrana Ekle";
  else if (env && !env.supported) problem = "Bu tarayıcı desteklemiyor";
  else if (env && !env.configured) problem = "Bildirim anahtarı tanımlı değil";
  else if (env?.blocked) problem = "Tarayıcıda engelli; site ayarlarından aç";
  const disabled = busy || !st || !env?.supported || !env?.configured || !!env?.blocked;
  return { st, on, toggle, pickLead, test, problem, disabled };
}

export function NotifyRow({ n }) {
  return (
    <Row
      icon="bell"
      tone="rec"
      title="Bildirimler"
      sub={n.problem || (n.on ? "Bu cihazda açık: işler, hatırlatmalar, özetler" : "Bu cihazda kapalı")}
      right={<Switch on={n.on} onChange={n.toggle} label="Bildirimler" disabled={n.disabled} />}
    />
  );
}

export function NotifyMoreRow({ n }) {
  if (!n.on) return null;
  return (
    <Fold icon="clock" tone="amber" title="Plan hatırlatması" sub={`${LEADS.find((l) => l.min === n.st?.lead)?.label || "1 saat"} önce · deneme bildirimi`}>
      <Chips value={n.st?.lead} options={LEADS.map((l) => [l.min, l.label])} onChange={n.pickLead} />
      <div className="px-4 pb-3.5 pl-[3.75rem]">
        <button type="button" onClick={n.test} className="h-10 rounded-xl bg-bg px-4 text-[0.875rem] font-semibold text-acc active:scale-95">
          Deneme bildirimi gönder
        </button>
      </div>
    </Fold>
  );
}

// ---- Günlük özetler: sabah (bugün, istenirse yarın) ve akşam (yarın); bildirim + ana ekran kartı ----
const range = (from, to) =>
  Array.from({ length: (to - from) * 2 + 1 }, (_, k) => {
    const m = from * 60 + k * 30;
    return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  });
export const MORNING = range(5, 12); // 05:00 – 12:00
export const EVENING = range(16, 23.5); // 16:00 – 23:30

function Check({ on, onChange, label }) {
  return (
    <button type="button" role="checkbox" aria-checked={on} onClick={() => onChange(!on)} className="flex min-w-0 items-center gap-2 text-left">
      <span className={`grid size-5 shrink-0 place-items-center rounded-md transition ${on ? "bg-acc text-white" : "ring-2 ring-line"}`}>
        {on && <Icon name="check" className="size-3.5 [stroke-width:3]" />}
      </span>
      <span className="truncate text-[0.875rem]">{label}</span>
    </button>
  );
}

// Bir özet türü: simge, ad, açıklama, anahtar; açıkken saat seçimi
function SummaryItem({ icon, tint, title, desc, at, times, onAt, children }) {
  return (
    <div className="px-3 py-2.5">
      <div className="flex h-10 items-center gap-3">
        <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${tint}`}>
          <Icon name={icon} className="size-[1.125rem]" />
        </span>
        <span className="min-w-0 flex-1 leading-tight">
          <b className="block truncate text-[0.9375rem] font-semibold">{title}</b>
          <small className="block truncate text-[0.75rem] text-mut">{desc}</small>
        </span>
        <Switch on={!!at} onChange={(v) => onAt(v ? times.default : "")} label={title} />
      </div>
      {at && (
        <div className="mt-2 flex h-9 items-center gap-3 pl-11">
          <select value={at} onChange={(e) => onAt(e.target.value)} aria-label={`${title} saati`} className="h-9 shrink-0 rounded-lg bg-bg px-2.5 text-[0.9375rem] font-semibold tabular-nums">
            {(times.list.includes(at) ? times.list : [at, ...times.list]).map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          {children}
        </div>
      )}
    </div>
  );
}

export function SummaryRow() {
  const { profile } = useAuth();
  const toast = useToast();
  const [sum, setSum] = useState({
    summaryAt: profile?.summaryAt || "",
    summaryTomorrow: !!profile?.summaryTomorrow,
    eveningAt: profile?.eveningAt || "",
    weeklyAt: profile?.weeklyAt || "",
    birthdayAt: profile?.birthdayAt || "",
    windAt: profile?.windAt || "",
    windKn: profile?.windKn || WIND_KN,
  });
  const put = (patch) => {
    const prev = sum;
    setSum((x) => ({ ...x, ...patch }));
    saveUser(profile.uid, patch).catch(() => {
      setSum(prev);
      toast("Kaydedilemedi, tekrar dene");
    });
  };
  const status =
    [sum.summaryAt && `Sabah ${sum.summaryAt}`, sum.eveningAt && `Akşam ${sum.eveningAt}`, sum.weeklyAt && "Haftalık", sum.birthdayAt && "Doğum günü", sum.windAt && "Rüzgâr"]
      .filter(Boolean)
      .join(" · ") || "Kapalı";
  return (
    <Fold icon="sun" tone="amber" title="Günlük özetler" sub={status}>
      <div className="mx-4 mb-3.5 divide-y divide-line rounded-xl ring-1 ring-line">
        <SummaryItem
          icon="sun"
          tint="bg-amber-500/15 text-amber-600"
          title="Sabah özeti"
          desc="Bugünün işleri ve gecikenler"
          at={sum.summaryAt}
          times={{ list: MORNING, default: "08:00" }}
          onAt={(v) => put({ summaryAt: v })}
        >
          <Check on={sum.summaryTomorrow} onChange={(v) => put({ summaryTomorrow: v })} label="Yarını da ekle" />
        </SummaryItem>
        <SummaryItem
          icon="moon"
          tint="bg-violet-500/15 text-violet-600"
          title="Akşam özeti"
          desc="Yarının planları ve görevleri"
          at={sum.eveningAt}
          times={{ list: EVENING, default: "20:00" }}
          onAt={(v) => put({ eveningAt: v })}
        />
        <SummaryItem
          icon="cal"
          tint="bg-sky-500/15 text-sky-600"
          title="Haftalık özet"
          desc="Pazartesi: haftanın planları ve görevleri"
          at={sum.weeklyAt}
          times={{ list: MORNING, default: "08:00" }}
          onAt={(v) => put({ weeklyAt: v })}
        />
        <SummaryItem
          icon="cake"
          tint="bg-rose-500/15 text-rose-600"
          title="Doğum günleri"
          desc="O gün doğum günü olanlar"
          at={sum.birthdayAt}
          times={{ list: MORNING, default: "08:30" }}
          onAt={(v) => put({ birthdayAt: v })}
        />
        <SummaryItem
          icon="wind"
          tint="bg-teal-500/15 text-teal-600"
          title="Rüzgâr uyarısı"
          desc="Antrenman ya da yarış saatinde eşik aşılırsa"
          at={sum.windAt}
          times={{ list: MORNING, default: "07:30" }}
          onAt={(v) => put({ windAt: v })}
        >
          <select value={sum.windKn} onChange={(e) => put({ windKn: Number(e.target.value) })} aria-label="Rüzgâr eşiği" className="h-9 shrink-0 rounded-lg bg-bg px-2.5 text-[0.9375rem] font-semibold tabular-nums">
            {WIND_KNS.map((k) => (
              <option key={k} value={k}>
                {k} kn
              </option>
            ))}
          </select>
        </SummaryItem>
      </div>
      <p className="-mt-1.5 px-4 pb-3.5 text-[0.75rem] leading-snug text-mut">Seçtiğin saatte bildirim olarak gelir; sabah ve akşam özeti ana ekranda kart olarak da görünür.</p>
    </Fold>
  );
}

// ---- İzinler: mikrofon, kamera (uygulama içi aç/kapat + tarayıcı durumu), mikrofon testi ----
const PERM_ICON = { camera: "camera", microphone: "mic" };
const STATE = {
  granted: ["İzin verildi", "ok"],
  denied: ["Engelli", "warn"],
  prompt: ["Henüz sorulmadı", "mut"],
  ask: ["Kullanırken sorar", "mut"],
  missing: ["Cihaz yok", "mut"],
  unsupported: ["Desteklenmiyor", "mut"],
  error: ["Hata", "warn"],
};

export function PermissionsRow() {
  const toast = useToast();
  const { perms, request } = usePermissions();
  const [allowed, setAllowed] = useState(() => Object.fromEntries(PERM_NAMES.map((k) => [k, appAllowed(k)])));
  const [testing, setTesting] = useState(false);

  async function flip(k, on) {
    setAppAllowed(k, on);
    setAllowed((a) => ({ ...a, [k]: on }));
    if (on && (perms[k] === "prompt" || perms[k] === "ask" || perms[k] === "error")) {
      const r = await request([k]);
      toast(r[k] === "granted" ? "İzin verildi" : "İzin verilmedi");
    } else toast(on ? `${PERM_LABEL[k]} açıldı` : `${PERM_LABEL[k]} uygulamada kapatıldı`);
  }

  const denied = PERM_NAMES.filter((k) => allowed[k] && perms[k] === "denied");
  const summary = PERM_NAMES.map((k) => `${PERM_LABEL[k]}: ${allowed[k] ? (STATE[perms[k]] || ["…"])[0].toLocaleLowerCase("tr-TR") : "kapalı"}`).join(" · ");
  return (
    <Fold icon="mic" tone="slate" title="İzinler" sub={summary}>
      <ul className="space-y-2 px-4 pb-3.5">
        {PERM_NAMES.map((k) => {
          const [label, tone] = allowed[k] ? STATE[perms[k]] || ["…", "mut"] : ["Kapalı", "mut"];
          return (
            <li key={k} className="flex items-center gap-3 rounded-xl bg-bg px-3 py-2.5">
              <Icon name={PERM_ICON[k]} className="size-5 shrink-0 text-mut" />
              <span className="min-w-0 flex-1">
                <b className="block text-[0.9375rem] font-medium">{PERM_LABEL[k]}</b>
                <span className="flex flex-wrap items-center gap-1.5 text-[0.8125rem] text-mut">
                  {k === "camera" ? "Fiş fotoğrafı için" : "Konuşmak için"}
                  <Badge tone={tone}>{label}</Badge>
                </span>
              </span>
              <Switch on={allowed[k]} onChange={(v) => flip(k, v)} label={`${PERM_LABEL[k]} kullanımı`} />
            </li>
          );
        })}
        {denied.length > 0 && <li className="px-1 text-[0.8125rem] leading-snug text-rec">{`${PERM_LABEL[denied[0]]} tarayıcıda engelli. ${permissionHelp(denied[0])}`}</li>}
        {allowed.microphone && (
          <li>
            <button type="button" onClick={() => setTesting((v) => !v)} className="h-10 rounded-xl bg-bg px-4 text-[0.875rem] font-semibold text-acc active:scale-95">
              {testing ? "Testi kapat" : "Mikrofonu test et"}
            </button>
            {testing && (
              <div className="mt-2">
                <MicTest />
              </div>
            )}
          </li>
        )}
      </ul>
    </Fold>
  );
}

// ---- Hava durumu konumu: il/ilçe ara, seç (cihazda ve profilde saklanır; diğer cihazlara da geçer) ----
export function WeatherPlaceRow() {
  const toast = useToast();
  const { profile } = useAuth();
  const [cur, setCur] = useState(() => (typeof window === "undefined" ? null : getPlace()));
  const [q, setQ] = useState("");
  const [list, setList] = useState([]);
  const [state, setState] = useState("idle"); // idle | loading | error

  useEffect(() => {
    const t = q.trim();
    if (t.length < 2) return;
    const c = new AbortController();
    const id = setTimeout(() => {
      setState("loading");
      searchPlaces(t, c.signal)
        .then((r) => {
          setList(r);
          setState("idle");
        })
        .catch((e) => e.name !== "AbortError" && setState("error"));
    }, 350);
    return () => {
      clearTimeout(id);
      c.abort();
    };
  }, [q]);

  async function pick(p) {
    const saved = setPlace({ name: p.district ? `${p.name}` : p.name, region: p.region, lat: p.lat, lon: p.lon });
    setCur(saved);
    setQ("");
    setList([]);
    toast(`Hava durumu: ${placeLabel(saved)}`);
    if (profile?.uid) saveUser(profile.uid, { weatherPlace: saved }).catch(() => {});
  }

  const shown = q.trim().length >= 2 ? list : [];
  return (
    <Fold icon="cloudSun" tone="sky" title="Hava durumu konumu" sub={cur ? placeLabel(cur) : "…"}>
      <div className="px-4 pb-3.5">
        <label className="flex h-11 items-center gap-2 rounded-xl bg-bg px-3">
          <Icon name="search" className="size-4 text-mut" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            type="search"
            placeholder="İlçe ya da il yaz (ör. Urla, Bodrum)"
            className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-mut"
          />
        </label>
        {state === "loading" && <p className="mt-2 px-1 text-[0.8125rem] text-mut">Aranıyor…</p>}
        {state === "error" && <p className="mt-2 px-1 text-[0.8125rem] text-rec">Konum aranamadı. Bağlantını kontrol et.</p>}
        {state === "idle" && q.trim().length >= 2 && !shown.length && <p className="mt-2 px-1 text-[0.8125rem] text-mut">Sonuç yok.</p>}
        {shown.length > 0 && (
          <ul className="mt-2 divide-y divide-line overflow-hidden rounded-xl bg-bg">
            {shown.map((p) => (
              <li key={`${p.lat},${p.lon}`}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    pick(p);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left active:bg-line/40"
                >
                  <Icon name="pin" className="size-4 shrink-0 text-acc" />
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-[0.9375rem] font-medium">{p.name}</b>
                    <small className="block truncate text-[0.75rem] text-mut">{[p.district, p.region].filter(Boolean).join(" · ")}</small>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 px-1 text-[0.75rem] leading-snug text-mut">Ana sayfadaki hava, rüzgâr ve asistanın hava cevapları bu konuma göre gelir.</p>
      </div>
    </Fold>
  );
}

// ---- Örnek veri (yalnızca ana hesap): önce tüm verileri sil, sonra örnek kişi ve kayıtlar oluştur ----
async function demoCall(body) {
  const res = await authFetch("/api/demo", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "İşlem yapılamadı");
  return data;
}

export function DemoDataRow() {
  const toast = useToast();
  const [step, setStep] = useState(""); // "" | wipe | busy
  const [word, setWord] = useState("");
  const [mails, setMails] = useState(false); // mailleri de sil
  const [accounts, setAccounts] = useState(true);
  const [result, setResult] = useState(null); // örnek veri sonucu: { password, accounts: [{ name, login }] }

  async function wipe() {
    setStep("busy");
    try {
      const r = await demoCall({ action: "wipe", confirm: word.trim().toLocaleUpperCase("tr-TR"), keepMails: !mails });
      toast(`Silindi: ${r.accounts} hesap ve tüm kayıtlar`);
      setWord("");
      setResult(null);
    } catch (e) {
      toast(e.message);
    }
    setStep("");
  }
  async function seed() {
    setStep("busy");
    try {
      const r = await demoCall({ action: "seed", accounts });
      setResult(r);
      toast(`Örnek veri oluşturuldu: ${r.counts.people} kişi, ${r.counts.records} kayıt`);
    } catch (e) {
      toast(e.message);
    }
    setStep("");
  }
  const busy = step === "busy";
  return (
    <Fold icon="box" tone="slate" title="Örnek veri" sub="Verileri sil · örnek kişi ve kayıt oluştur">
      <div className="space-y-3 px-4 pb-3.5">
        <p className="text-[0.8125rem] leading-snug text-mut">
          Silme: kişiler ve hesapları, planlar, görevler, notlar, fişler, doğum günleri, dersler ve sohbetler. Senin hesabın, ayarların ve sporcu verisi kalır.
        </p>
        {step === "wipe" ? (
          <div className="space-y-2.5 rounded-xl bg-rec/[.06] p-3 ring-1 ring-rec/30">
            <b className="block text-[0.875rem] font-semibold text-rec">Geri alınamaz. Onay için SİL yaz:</b>
            <input
              value={word}
              onChange={(e) => setWord(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              autoCapitalize="characters"
              className="h-11 w-full rounded-xl bg-card px-3 text-base outline-none ring-1 ring-line focus:ring-rec"
              placeholder="SİL"
            />
            <label className="flex items-center gap-2 text-[0.8125rem]">
              <input type="checkbox" checked={mails} onChange={(e) => setMails(e.target.checked)} className="size-4 accent-[#c2410c]" />
              Banka/mail bildirimlerini de sil
            </label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setStep("")} className="h-10 flex-1 rounded-xl bg-card text-[0.875rem] font-semibold ring-1 ring-line">
                Vazgeç
              </button>
              <button
                type="button"
                onClick={wipe}
                disabled={word.trim().toLocaleUpperCase("tr-TR") !== "SİL"}
                className="h-10 flex-1 rounded-xl bg-rec text-[0.875rem] font-semibold text-white disabled:opacity-40"
              >
                Tümünü sil
              </button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setStep("wipe")} disabled={busy} className="h-10 w-full rounded-xl bg-card text-[0.875rem] font-semibold text-rec ring-1 ring-line disabled:opacity-50">
            Tüm verileri sil
          </button>
        )}
        <div className="rounded-xl bg-bg p-3">
          <p className="text-[0.8125rem] leading-snug text-mut">
            Örnek: Sanver İmamoğulları, Ali Kök ve 3 örnek çalışan; aileden Pınar Ezgi Yıldız. Planlar, görevler, notlar, fişler (ödeme bekleyenler dahil), doğum günleri, dersler ve sohbetler.
          </p>
          <label className="mt-2 flex items-center gap-2 text-[0.8125rem]">
            <input type="checkbox" checked={accounts} onChange={(e) => setAccounts(e.target.checked)} className="size-4 accent-deep" />
            Kişilere uygulama hesabı aç (kullanıcı adıyla)
          </label>
          <button type="button" onClick={seed} disabled={busy} className="mt-2.5 h-10 w-full rounded-xl bg-deep text-[0.875rem] font-semibold text-white disabled:opacity-50">
            {busy ? "Bekleyin…" : "Örnek veri oluştur"}
          </button>
        </div>
        {result?.accounts?.length > 0 && (
          <div className="rounded-xl bg-card p-3 text-[0.8125rem] ring-1 ring-line">
            <b className="block font-semibold">Giriş bilgileri (hepsinde şifre: <span className="tabular-nums">{result.password}</span>)</b>
            <ul className="mt-1.5 space-y-0.5">
              {result.accounts.map((a) => (
                <li key={a.login} className="flex justify-between gap-2">
                  <span className="truncate">{a.name}</span>
                  <b className="font-semibold">{a.login}</b>
                </li>
              ))}
            </ul>
            <p className="mt-1.5 text-mut">Şifreleri Kişiler sayfasından tek tek değiştirebilirsin.</p>
          </div>
        )}
      </div>
    </Fold>
  );
}

// ---- Şifremi değiştir (herkes): mevcut şifreyle doğrular, yenisini kaydeder ----
export function PasswordRow() {
  const toast = useToast();
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);
  async function save(e) {
    e.preventDefault();
    if (next.length < 6) return toast("Yeni şifre en az 6 karakter olmalı");
    setBusy(true);
    try {
      const { EmailAuthProvider, reauthenticateWithCredential, updatePassword } = await import("firebase/auth");
      const { auth } = await import("@/lib/firebase/clientApp");
      const u = auth.currentUser;
      await reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email, cur));
      await updatePassword(u, next);
      setCur("");
      setNext("");
      toast("Şifren değiştirildi");
    } catch (err) {
      toast(/wrong-password|invalid-credential/.test(err?.code || "") ? "Mevcut şifre yanlış" : "Şifre değiştirilemedi");
    }
    setBusy(false);
  }
  return (
    <Fold icon="user" tone="slate" title="Şifremi değiştir" sub="Giriş şifreni yenile">
      <form onSubmit={save} onClick={(e) => e.stopPropagation()} className="space-y-2.5 px-4 pb-3.5">
        <input type="password" autoComplete="current-password" placeholder="Mevcut şifre" value={cur} onChange={(e) => setCur(e.target.value)} required className="h-11 w-full rounded-xl bg-bg px-3 text-base outline-none ring-1 ring-line focus:ring-acc" />
        <input type="password" autoComplete="new-password" placeholder="Yeni şifre (en az 6 karakter)" value={next} onChange={(e) => setNext(e.target.value)} required className="h-11 w-full rounded-xl bg-bg px-3 text-base outline-none ring-1 ring-line focus:ring-acc" />
        <button type="submit" disabled={busy || !cur || next.length < 6} className="h-10 w-full rounded-xl bg-deep text-[0.875rem] font-semibold text-white disabled:opacity-40">
          {busy ? "Bekleyin…" : "Şifreyi değiştir"}
        </button>
      </form>
    </Fold>
  );
}

// Deneme için: tanıtım slaytları, sesli karşılama ve "Şimdi sen dene" baştan görünsün.
// Ana hesap herkes için sıfırlar (kişiler uygulamayı açınca görür), diğer hesaplar yalnız kendisi için.
export function TourResetRow() {
  const toast = useToast();
  const { profile } = useAuth();
  const owner = profile?.role === "owner";
  const [ask, setAsk] = useState(false);
  const [busy, setBusy] = useState(false);
  async function reset() {
    setBusy(true);
    try {
      const res = await authFetch("/api/tour-reset", { method: "POST" });
      const r = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(r.error || "Sıfırlanamadı");
      toast(r.all ? `Sıfırlandı: ${r.count} hesap karşılamayı baştan görecek` : "Sıfırlandı: karşılama baştan başlıyor");
      setAsk(false);
    } catch (e) {
      toast(e.message);
    }
    setBusy(false);
  }
  return (
    <Fold icon="spark" tone="acc" title="Karşılamayı sıfırla" sub={owner ? "Herkes için: tanıtım ve sesli karşılama baştan" : "Tanıtım ve sesli karşılama baştan"}>
      <div className="space-y-3 px-4 pb-3.5">
        <p className="text-[0.8125rem] leading-snug text-mut">
          {owner
            ? "Deneme için. Senin ve kişilerinin tanıtım slaytları, sesli karşılama ve “Şimdi sen dene” yönlendirmesi sıfırlanır; herkes uygulamayı açınca baştan görür."
            : "Deneme için. Tanıtım slaytları, sesli karşılama ve “Şimdi sen dene” yönlendirmesi baştan görünür."}
        </p>
        {ask ? (
          <div className="flex gap-2">
            <button type="button" onClick={() => setAsk(false)} className="h-10 flex-1 rounded-xl bg-card text-[0.875rem] font-semibold ring-1 ring-line">
              Vazgeç
            </button>
            <button type="button" onClick={reset} disabled={busy} className="h-10 flex-[1.4] rounded-xl bg-acc text-[0.875rem] font-semibold text-white disabled:opacity-50">
              {busy ? "Sıfırlanıyor…" : owner ? "Herkes için sıfırla" : "Sıfırla"}
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => setAsk(true)} className="h-10 w-full rounded-xl bg-card text-[0.875rem] font-semibold text-acc ring-1 ring-line">
            Sıfırla
          </button>
        )}
      </div>
    </Fold>
  );
}

// ---- Yarışlar ana sayfada: yalnız sporcu yetkisi olanlarda (bkz. raceHome.js) ----
export function RacesRow() {
  const race = useRaceHome();
  const toast = useToast();
  const [on, setOn] = useState(null);
  if (!race.allowed) return null;
  const cur = on ?? race.on;
  const flip = (v) => {
    setOn(v);
    race.set(v).catch(() => {
      setOn(!v);
      toast("Kaydedilemedi, tekrar dene");
    });
  };
  return (
    <Row
      icon="flag"
      tone="acc"
      title="Yarışlar ana sayfada"
      sub={cur ? "Açık: ana sayfada Yarışlar kartı" : "Kapalı: Sporcular sayfasından girilir"}
      right={<Switch on={cur} onChange={flip} label="Yarışlar ana sayfada" />}
    />
  );
}
