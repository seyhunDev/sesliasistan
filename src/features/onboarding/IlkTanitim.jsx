"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { isNativeApp } from "@/lib/nativePush";
import { enableReminders, needsInstall, pushSupported } from "@/lib/push";

// İlk giriş (Seyhun 2026-11-27, örnek https://claude.ai/artifact/VthKvT3KXJ2W7CkGYcsK3a): eski izin slaytları yerine
// 1) sitedeki kısa tanıtım (/tanitim/kisa?app) tam ekran; yazı ve ses o sayfada, tek kaynak (içeriği Tanıtım çalışması değiştirir).
//    Seslendirme kapalı başlar, sağ üstte Atla; Atla ya da son sahne "velora-tanitim-bitti" iletisi gönderir, Katıl/Giriş yok.
// 2) "Velora'da ayrıca": tanıtımda gösterilmeyen özellikler, hesabın görünümüne göre. "Başla" → ana sayfa.
// Veli tanıtımı görmez (antrenör işlerini anlatıyor), yalnız kendi listesini görür. Sporcu/öğrenci: AthleteWelcome (Onboarding.jsx).
// Bildirim izni "Başla" dokunuşunda bir kez istenir (iPhone izni yalnız dokunuşla sorar); mikrofon asistan ilk açılınca sorulur.

const HER_GUN = "Her gün";
const KULUP = "Kulüp";
// [simge, ad, kısa açıklama, grup, kime: "ana" yalnız ana hesap, "coach" ana hesap + antrenör (çalışan), "all" ana + normal, "veli"]
const OZELLIK = [
  ["mic", "Sesli asistan", "Söyle; plan, görev ve mesajı o hazırlasın", HER_GUN, "all"],
  ["cal", "Takvim ve planlar", "Bütün işlerin tek takvimde", HER_GUN, "all"],
  ["task", "Görevler ve notlar", "Ekibe iş ver, not al", HER_GUN, "all"],
  ["chat", "Mesajlar", "Ekip, sporcu ve velilerle", HER_GUN, "all"],
  ["sun", "Günlük özet", "Sabah bildirimiyle günün özeti", HER_GUN, "ana"],
  ["checks", "Sporcular ve yoklama", "Kim geldi, aylık rapor", KULUP, "coach"],
  ["flag", "Canlı yarış", "Sonuçlar ve sıralar anında", KULUP, "coach"],
  ["anchor", "Tekne ekranı", "Denizde büyük geri sayım", KULUP, "coach"],
  ["coins", "Aidatlar", "Kim ödedi, kim ödemedi", KULUP, "ana"],
  ["box", "Envanter", "Tekne ve malzeme listesi", KULUP, "ana"],
  ["users", "Toplantı", "Kaydet, özetini al", KULUP, "ana"],
  ["lang", "İngilizce", "Kalıplarla her gün biraz", HER_GUN, "all"],
  ["cal", "Takvim", "Çocuğunun antrenmanları", HER_GUN, "veli"],
  ["bell", "Bildirimler", "Gelmediği gün ve aidat haberi", HER_GUN, "veli"],
  ["lang", "İngilizce", "Kalıplarla her gün biraz", HER_GUN, "veli"],
];

// kim: "ana" | "coach" (antrenör çalışan) | "normal" (aile, diğer) | "veli"
export function ozellikler(kim) {
  const uyar = (k) => (kim === "veli" ? k === "veli" : k === "all" || (k === "coach" && kim !== "normal") || (k === "ana" && kim === "ana"));
  return OZELLIK.filter((x) => uyar(x[4]));
}

export function IlkTanitim({ profile, kim, onDone }) {
  const [adim, setAdim] = useState(kim === "veli" ? "liste" : "tanitim");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (adim !== "tanitim") return;
    const on = (e) => {
      if (e.origin === location.origin && e.data?.velora === "tanitim-bitti") setAdim("liste");
    };
    window.addEventListener("message", on);
    return () => window.removeEventListener("message", on);
  }, [adim]);

  async function basla() {
    setBusy(true);
    // Bildirim izni: soru hiç sorulmadıysa bir kez; olmazsa sessizce geçilir (Ayarlar'dan açılır)
    try {
      const sor = isNativeApp() || (pushSupported() && !needsInstall() && Notification.permission === "default");
      if (sor) await enableReminders(profile, 60);
    } catch {}
    onDone();
  }

  if (adim === "tanitim") {
    return (
      <div className="fixed inset-0 z-[80] bg-[#09090a]" role="dialog" aria-modal="true" aria-label="Velora tanıtımı">
        <iframe src="/tanitim/kisa?app=1" title="Velora tanıtımı" className="block h-full w-full border-0" allow="autoplay" />
      </div>
    );
  }

  const list = ozellikler(kim);
  const gruplar = [HER_GUN, KULUP].map((g) => [g, list.filter((x) => x[3] === g)]).filter(([, l]) => l.length);
  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-[#0b0b0c] text-white" role="dialog" aria-modal="true" aria-label="Velora'da ayrıca">
      <div className="mx-auto flex min-h-0 w-full max-w-[27.5rem] flex-1 flex-col px-6 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-[calc(2.5rem+env(safe-area-inset-top))] md:max-w-[52rem]">
        <h1 className="sahne-t fade-in shrink-0 text-[2.5rem]">
          Velora&apos;da <span className="text-[#d4ff3a]">ayrıca</span>
        </h1>
        <div className="-mx-6 mt-4 min-h-0 flex-1 overflow-y-auto px-6 md:grid md:grid-cols-2 md:gap-x-10">
          {gruplar.map(([g, l]) => (
            <div key={g}>
              {gruplar.length > 1 && <p className="mt-3 text-[0.75rem] font-extrabold uppercase tracking-[.1em] text-[#a2a2a8]">{g}</p>}
              <ul>
                {l.map(([ic, ad, alt], k) => (
                  <li key={ad} className="step-in flex items-center gap-3.5 border-b border-[#1f1f22] py-3 last:border-0" style={{ animationDelay: `${80 + k * 60}ms` }}>
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#1a1d10] text-[#d4ff3a]">
                      <Icon name={ic} className="size-5" />
                    </span>
                    <span className="min-w-0">
                      <b className="block text-[1rem] font-semibold">{ad}</b>
                      <small className="block text-[0.875rem] leading-snug text-[#a2a2a8]">{alt}</small>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={basla}
          disabled={busy}
          data-press
          className="mt-4 h-[3.375rem] w-full shrink-0 rounded-2xl bg-[#d4ff3a] text-[1.0625rem] font-bold text-[#0f0f11] transition active:scale-[.98] disabled:opacity-60 md:ml-auto md:w-64"
        >
          Başla
        </button>
      </div>
    </div>
  );
}
