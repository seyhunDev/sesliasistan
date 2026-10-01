"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, updateDoc } from "firebase/firestore";
import { Icon } from "@/components/ui/Icon";
import { useAuth } from "@/features/auth/AuthProvider";
import { usePermissions } from "@/hooks/usePermissions";
import { db } from "@/lib/firebase/clientApp";
import { dismissPrompt } from "@/lib/permissions";
import { enableReminders, needsInstall, pushSupported } from "@/lib/push";
import { SIZES, applySize } from "@/lib/textSize";

// Tanıtım slaytları. Üç durumda açılır:
//   1) İlk giriş (users.onboarded false): hepsi
//   2) Yeni özellik eklendiğinde: yalnızca kişinin görmediği slaytlar (slaytın sürümü v > users.introV)
//   3) Ayarlar › Tanıtım: hepsi (izni zaten verilmiş slaytta tekrar izin istenmez, "İzin verildi" görünür)
// Her slaytta "Geç" var; hiçbiri zorunlu değil. Yeni bir özellik slaytı eklerken v = INTRO_V + 1 yap ve INTRO_V'yi artır.
export const openOnboarding = () => window.dispatchEvent(new Event("sa-onboarding"));

export const INTRO_V = 4;
const SLIDES = [
  { id: "hi", v: 1, icon: "spark", title: "Hoş geldin", text: "Planlarını, görevlerini ve notlarını konuşarak ya da yazarak ekle. Birkaç ayarla her şey daha kolay olur.", action: "Başla" },
  { id: "size", v: 3, icon: "search", title: "Yazı boyutu", text: "Yazılar, simgeler ve düğmeler rahat okunacak büyüklükte olsun. Dokununca hemen görürsün.", action: "Devam" },
  { id: "mic", v: 1, icon: "mic", perm: "microphone", title: "Mikrofon", text: "Konuşarak kayıt eklemek ve asistana sormak için.", action: "Mikrofona izin ver" },
  { id: "push", v: 1, icon: "bell", perm: "push", title: "Bildirimler", text: "Uygulama kapalıyken de haberin olsun.", action: "Bildirimlere izin ver" },
  { id: "summary", v: 2, icon: "sun", title: "Günlük özetler", text: "Güne ve yarına hazırlıklı başla. Bildirim olarak gelir, ana ekranda da görünür.", action: "Kaydet ve devam" },
  { id: "mail", v: 4, owner: true, icon: "mail", title: "Banka mailleri", text: "Bankadan gelen hesap özetleri telefonuna bildirim olarak gelsin; Mailler sayfasında hareketleri tablo olarak gör, Excel'e indir.", action: "Kurulumu aç", href: "/mail/setup" },
  { id: "camera", v: 1, icon: "camera", perm: "camera", title: "Kamera", text: "Fişin fotoğrafını çekip tutarı otomatik okumak için.", action: "Kameraya izin ver" },
  { id: "done", v: 1, icon: "check", title: "Hazırsın", text: "Bunları istediğin zaman Ayarlar'dan değiştirebilirsin.", action: "Uygulamaya geç" },
];

const pushGranted = () => typeof Notification !== "undefined" && Notification.permission === "granted";

export function Onboarding() {
  const { profile } = useAuth();
  const { perms, request } = usePermissions();
  const router = useRouter();
  const [manual, setManual] = useState(false);
  const [i, setI] = useState(0);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState(""); // izin sonucu kısa not
  const [closed, setClosed] = useState(false);
  const [sum, setSum] = useState(null); // özet seçimi (dokunulana kadar profildeki)
  const [size, setSize] = useState(null);

  useEffect(() => {
    const on = () => {
      setManual(true);
      setClosed(false);
      setI(0);
      setNote("");
    };
    window.addEventListener("sa-onboarding", on);
    return () => window.removeEventListener("sa-onboarding", on);
  }, []);

  if (!profile || closed) return null;
  const fresh = profile.onboarded === false;
  const granted = (x) => (x.perm === "push" ? pushGranted() : x.perm ? perms[x.perm] === "granted" : false);
  // Yeni özellikler: görülmemiş slaytlar; izni zaten verilmiş olanlar atlanır
  const news = !manual && !fresh && profile.onboarded && profile.introV < INTRO_V ? SLIDES.filter((x) => x.v > profile.introV && !granted(x)) : [];
  const mine = (x) => !x.owner || profile.role === "owner"; // bazı slaytlar yalnızca ana hesapta
  const list = (manual || fresh ? SLIDES : news).filter(mine);
  if (!list.length) return null;
  const onlyNew = !manual && !fresh;

  const s = list[Math.min(i, list.length - 1)];
  const has = granted(s);
  const summary = sum || (profile.onboarded ? { summaryAt: profile.summaryAt, summaryTomorrow: profile.summaryTomorrow, eveningAt: profile.eveningAt } : { summaryAt: "08:00", summaryTomorrow: false, eveningAt: "" });
  const curSize = size ?? profile.textSize;

  const finish = () => {
    setClosed(true);
    setManual(false);
    dismissPrompt(); // ana sayfadaki eski izin kutusu çıkmasın
    if (!profile.onboarded || profile.introV < INTRO_V) updateDoc(doc(db, "users", profile.uid), { onboarded: true, introV: INTRO_V }).catch(() => {});
  };
  const next = () => {
    setNote("");
    if (i >= list.length - 1) finish();
    else setI(i + 1);
  };
  const pickSize = (v) => {
    setSize(v);
    applySize(v);
    updateDoc(doc(db, "users", profile.uid), { textSize: v }).catch(() => {});
  };

  async function act() {
    if (s.href) {
      finish();
      return router.push(s.href);
    }
    if (!s.perm || has) {
      if (s.id === "summary") updateDoc(doc(db, "users", profile.uid), summary).catch(() => {});
      return next();
    }
    setBusy(true);
    try {
      if (s.perm === "push") {
        if (needsInstall()) {
          setNote("iPhone'da bildirim için önce Paylaş › Ana Ekrana Ekle ile uygulamayı ekle, oradan aç.");
          setBusy(false);
          return;
        }
        if (!pushSupported()) {
          setNote("Bu tarayıcı bildirimleri desteklemiyor.");
          setBusy(false);
          return;
        }
        await enableReminders(profile, 60);
      } else {
        const st = Object.values(await request([s.perm]))[0];
        if (st && st !== "granted") {
          setNote("İzin verilmedi. Sonra Ayarlar › İzinler'den açabilirsin.");
          setBusy(false);
          return;
        }
      }
      setBusy(false);
      next();
    } catch (e) {
      setNote(e.message || "Olmadı. Sonra ayarlardan deneyebilirsin.");
      setBusy(false);
    }
  }

  const last = i >= list.length - 1;
  const action = has ? "Devam" : onlyNew && last && !s.perm && !s.href ? "Tamam" : s.action;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-bg pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-[calc(0.75rem+env(safe-area-inset-top))]" role="dialog" aria-modal="true" aria-label={onlyNew ? "Yenilikler" : "Başlangıç"}>
      <div className="mx-auto flex min-h-0 w-full max-w-[27.5rem] flex-1 flex-col px-6">
        <div className="flex h-10 shrink-0 items-center justify-between">
          {list.length > 1 ? (
            <span className="flex gap-1.5" aria-hidden>
              {list.map((x, k) => (
                <i key={x.id} className={`h-1.5 rounded-full transition-all ${k === i ? "w-5 bg-acc" : "w-1.5 bg-line"}`} />
              ))}
            </span>
          ) : (
            <span />
          )}
          {s.id !== "done" && (
            <button onClick={i === 0 || onlyNew ? finish : next} className="rounded-full px-3 py-1.5 text-[0.875rem] font-medium text-mut active:bg-line">
              {i === 0 || onlyNew ? "Atla" : "Geç"}
            </button>
          )}
        </div>

        {/* İçerik kayar (büyük yazıda sığmayabilir); düğmeler hep altta görünür */}
        <div key={s.id} className="fade-in -mx-6 flex min-h-0 flex-1 flex-col items-center overflow-y-auto px-6 py-4 text-center [&>*]:shrink-0 [&>:first-child]:mt-auto [&>:last-child]:mb-auto">
          <span className="relative grid size-20 place-items-center rounded-[1.625rem] bg-acc/10 text-acc">
            <Icon name={s.icon} className="size-9" />
            {has && (
              <span className="absolute -bottom-1 -right-1 grid size-7 place-items-center rounded-full bg-ok text-white ring-4 ring-bg">
                <Icon name="check" className="size-4 [stroke-width:3]" />
              </span>
            )}
          </span>
          {onlyNew && <span className="mt-5 rounded-full bg-acc px-2.5 py-0.5 text-[0.75rem] font-bold tracking-wide text-white">YENİ</span>}
          <h2 className={`${onlyNew ? "mt-2" : "mt-7"} text-[1.625rem] font-semibold tracking-tight`}>{s.title}</h2>
          <p className="mt-2 max-w-[20rem] text-[1rem] leading-relaxed text-mut">{s.text}</p>
          {has && <p className="mt-3 rounded-full bg-ok/10 px-3 py-1 text-[0.875rem] font-semibold text-ok">İzin verildi, bir şey yapmana gerek yok</p>}

          {s.id === "size" && (
            <div className="mt-6 w-full max-w-[21.25rem] space-y-2 text-left" role="radiogroup" aria-label="Yazı boyutu">
              {SIZES.map(([v, label], k) => (
                <SizePick key={v || "n"} v={v} label={label} on={curSize === v} onClick={() => pickSize(v)} delay={120 + k * 100} />
              ))}
            </div>
          )}
          {s.id === "push" && (
            <ul className="mt-6 w-full max-w-[21.25rem] space-y-2 text-left">
              {[
                ["task", "Sana verilen işler", "Biri sana görev, plan ya da not verince"],
                ["clock", "Plan hatırlatmaları", "Plan başlamadan, seçtiğin süre önce"],
                ["sun", "Günlük özetler", "Sabah günün, akşam yarının kısa özeti"],
              ].map(([ic, t, d], k) => (
                <li key={t} className="step-in flex items-center gap-3 rounded-2xl bg-card px-3.5 py-3 ring-1 ring-line" style={{ animationDelay: `${120 + k * 110}ms` }}>
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-acc/10 text-acc">
                    <Icon name={ic} className="size-5" />
                  </span>
                  <span className="min-w-0">
                    <b className="block text-[0.9375rem] font-semibold">{t}</b>
                    <small className="block text-[0.8125rem] leading-snug text-mut">{d}</small>
                  </span>
                </li>
              ))}
            </ul>
          )}
          {s.id === "summary" && (
            <div className="mt-6 w-full max-w-[21.25rem] space-y-2 text-left">
              <Pick
                icon="sun"
                title="Sabah özeti"
                sub={`${summary.summaryAt || "08:00"} · bugünün planları ve görevleri`}
                on={!!summary.summaryAt}
                onClick={() => setSum({ ...summary, summaryAt: summary.summaryAt ? "" : "08:00" })}
                delay={120}
              />
              {summary.summaryAt && (
                <button type="button" onClick={() => setSum({ ...summary, summaryTomorrow: !summary.summaryTomorrow })} className="fade-in flex w-full items-center gap-3 px-3.5 py-1.5 text-left">
                  <span className={`grid size-[1.375rem] shrink-0 place-items-center rounded-md transition ${summary.summaryTomorrow ? "bg-acc text-white" : "ring-2 ring-line"}`}>
                    {summary.summaryTomorrow && <Icon name="check" className="size-4 [stroke-width:3]" />}
                  </span>
                  <span className="text-[0.875rem]">Sabah özetine yarını da ekle</span>
                </button>
              )}
              <Pick
                icon="moon"
                title="Akşam özeti"
                sub={`${summary.eveningAt || "20:00"} · yarının planları ve görevleri`}
                on={!!summary.eveningAt}
                onClick={() => setSum({ ...summary, eveningAt: summary.eveningAt ? "" : "20:00" })}
                delay={230}
              />
              <p className="px-1 pt-1 text-[0.75rem] text-mut">Özet ana ekranda da kart olarak görünür; kapatabilir ya da açıp inceleyebilirsin. Saatleri Ayarlar › Bildirimler&apos;den değiştirebilirsin.</p>
            </div>
          )}
          {note && <p className="mt-4 max-w-[20rem] rounded-xl bg-card px-4 py-2.5 text-[0.875rem] leading-snug ring-1 ring-line">{note}</p>}
        </div>

        <button onClick={act} disabled={busy} className="mt-3 h-14 w-full shrink-0 rounded-2xl bg-acc text-[1.0625rem] font-semibold text-white transition active:scale-[.98] disabled:opacity-60">
          {busy ? "Bekleniyor…" : action}
        </button>
        {((s.perm && !has) || s.href) && (
          <button onClick={next} className="mt-2 h-11 w-full shrink-0 text-[0.9375rem] font-medium text-mut">
            Şimdi değil
          </button>
        )}
      </div>
    </div>
  );
}

// Seçilebilir özet kartı (işaretliyse vurgulu)
function Pick({ icon, title, sub, on, onClick, delay = 0 }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onClick}
      className={`step-in flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-left transition active:scale-[.99] ${on ? "bg-acc/10 ring-2 ring-acc" : "bg-card ring-1 ring-line"}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${on ? "bg-acc text-white" : "bg-bg text-mut"}`}>
        <Icon name={icon} className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <b className="block text-[0.9375rem] font-semibold">{title}</b>
        <small className="block truncate text-[0.8125rem] text-mut">{sub}</small>
      </span>
      <Tick on={on} />
    </button>
  );
}

const Tick = ({ on }) => (
  <span className={`grid size-6 shrink-0 place-items-center rounded-full transition ${on ? "bg-acc text-white" : "ring-2 ring-line"}`}>
    {on && <Icon name="check" className="size-4 [stroke-width:3]" />}
  </span>
);

// Yazı boyutu seçeneği: "Aa" örneği o boyutta gösterilir (kök boyuttan bağımsız, gerçek piksel)
const SAMPLE = { "": 16, l: 18, xl: 20 };
export function SizePick({ v, label, on, onClick, delay = 0 }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      onClick={onClick}
      className={`step-in flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-left transition active:scale-[.99] ${on ? "bg-acc/10 ring-2 ring-acc" : "bg-card ring-1 ring-line"}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <span className={`grid size-11 shrink-0 place-items-center rounded-xl font-semibold ${on ? "bg-acc text-white" : "bg-bg text-fg"}`} style={{ fontSize: SAMPLE[v] * 1.15 }}>
        Aa
      </span>
      <span className="min-w-0 flex-1">
        <b className="block font-semibold" style={{ fontSize: SAMPLE[v] }}>
          {label}
        </b>
        <small className="block text-[0.8125rem] leading-snug text-mut">{v === "" ? "Varsayılan" : v === "l" ? "Yazılar ve simgeler %12 daha büyük" : "Yazılar ve simgeler %25 daha büyük"}</small>
      </span>
      <Tick on={on} />
    </button>
  );
}
