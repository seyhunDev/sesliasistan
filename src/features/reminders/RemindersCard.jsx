"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/features/auth/AuthProvider";
import { useToast } from "@/components/ui/ToastProvider";
import { LEADS } from "@/lib/reminders";
import { disableReminders, enableReminders, loadReminders, needsInstall, pushConfigured, pushSupported, setLead, testPush } from "@/lib/push";

// Hesap ekranında: plan hatırlatmalarını aç/kapat, ne kadar önce hatırlatılacağını seç, deneme bildirimi gönder
export function RemindersCard() {
  const { user, profile } = useAuth();
  const toast = useToast();
  const [st, setSt] = useState(null); // { on, lead, here }
  const [busy, setBusy] = useState(false);
  const [env, setEnv] = useState(null); // cihaz bilgisi yalnızca tarayıcıda okunur

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

  const on = !!st?.here; // bu cihazda açık mı
  const blocked = !!env?.blocked;

  async function toggle() {
    setBusy(true);
    try {
      if (on) {
        await disableReminders(profile);
        setSt((s) => ({ ...s, here: false }));
        toast("Bu cihazda hatırlatmalar kapandı");
      } else {
        await enableReminders(profile, st?.lead || 60);
        setSt((s) => ({ ...s, on: true, here: true }));
        toast("Hatırlatmalar açıldı");
      }
    } catch (e) {
      toast(e.message || "Bir sorun oluştu");
    }
    setBusy(false);
  }

  async function pickLead(lead) {
    setSt((s) => ({ ...s, lead }));
    await setLead(profile, lead).catch(() => toast("Kaydedilemedi, tekrar dene"));
  }

  async function test() {
    try {
      await testPush();
      toast("Deneme bildirimi gönderildi");
    } catch (e) {
      toast(e.message);
    }
  }

  let note = "";
  if (env && !env.supported) note = env.install ? "" : "Bu tarayıcı bildirimleri desteklemiyor.";
  else if (env && !env.configured) note = "Bildirim anahtarı henüz tanımlanmadı (yönetici ayarı).";
  else if (blocked && !env?.install) note = "Bildirimler tarayıcıda engelli. Site ayarlarından bildirim iznini aç.";

  return (
    <div className="mt-4 rounded-xl bg-bg p-3.5">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <b className="block text-[15px] font-medium">Bildirimler</b>
          <small className="text-[13px] text-mut">Sana atanan işler ve yaklaşan planlar telefona gelir; uygulama kapalıyken de</small>
        </div>
        <button
          role="switch"
          aria-checked={on}
          aria-label="Bildirimler"
          disabled={busy || !st || !env?.supported || !env?.configured || blocked}
          onClick={toggle}
          className={`relative h-7 w-12 shrink-0 rounded-full transition disabled:opacity-40 ${on ? "bg-acc" : "bg-line"}`}
        >
          <span className={`absolute top-0.5 size-6 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
        </button>
      </div>

      {env?.install && (
        <p className="mt-2 text-[13px] leading-snug text-mut">
          iPhone&apos;da bildirim için uygulamayı ana ekrana ekle: Safari&apos;de <b className="font-medium text-fg">Paylaş › Ana Ekrana Ekle</b>, sonra ana ekrandaki simgeden aç.
        </p>
      )}
      {note && <p className="mt-2 text-[13px] leading-snug text-amber-800">{note}</p>}

      {on && (
        <>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {LEADS.map((l) => (
              <button
                key={l.min}
                onClick={() => pickLead(l.min)}
                className={`rounded-full px-3 py-1.5 text-[13px] font-medium transition active:scale-95 ${st.lead === l.min ? "bg-acc text-white" : "bg-card text-fg"}`}
              >
                {l.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[12px] text-mut">Tüm gün süren planlar o sabah 08:00&apos;de hatırlatılır.</p>
          <button onClick={test} className="mt-2 text-[13px] font-medium text-acc active:opacity-60">
            Deneme bildirimi gönder
          </button>
        </>
      )}
    </div>
  );
}
