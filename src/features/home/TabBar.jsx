"use client";

import { haptic } from "@/lib/haptic";
import { Suspense, createContext, useContext, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/ToastProvider";
import { useAdd } from "@/features/add/AddProvider";
import { useAssistant } from "@/features/assistant/AssistantProvider";
import { useBirthday } from "@/features/birthdays/BirthdayProvider";
import { useChat } from "@/features/chat/ChatProvider";
import { useReceipt } from "@/features/receipts/ReceiptProvider";
import { useKind } from "@/features/auth/useKind";
import { useAuth } from "@/features/auth/AuthProvider";
import { canSeeAthletes } from "@/features/athletes/access";
import { useMeeting } from "@/features/meeting/MeetingProvider";
import { ListenWave } from "@/features/speech/ListenWave";
import { MicDot } from "@/features/speech/MicDot";
import { useTts } from "@/features/speech/TtsProvider";
import { useSpeech } from "@/hooks/useSpeech";
import { canReceipts, isAthleteSide } from "@/lib/kinds";
import { miniText, pullAction } from "@/lib/miniOrb";
import { ringOf } from "@/lib/assistRing";
import { SideNav, useWide } from "./SideNav";
import { TimerChip } from "@/features/training/TimerChip";

const HOLD_MS = 450; // basılı tutma: yazarak sor (bas-konuş olmayan küçük küreler)
// BAS-KONUŞ (Seyhun 2026-10-25, örnek "A · Çubuğun sağ ucunda"): asistan küresi basılı tutulduğu sürece dinler, bırakınca
// gönderir; kendiliğinden dinleme yok. Çok kısa dokunuş (SHORT_MS) konuşma sayılmaz; parmak küreden uzağa (AWAY_PX) kayıp
// bırakılırsa gönderilmez. onRelease({ short, away }).
const SHORT_MS = 300;
const AWAY_PX = 90;
// Bırakma pencereden dinlenir: kapalı asistanda basınca sekme çubuğundaki küre yerini açık asistanın küresine bırakır
// (ilk düğme kalkar), parmağın kalkması yine yakalanır.
function usePress(onPress, onRelease) {
  const rel = useRef(onRelease);
  useLayoutEffect(() => {
    rel.current = onRelease;
  });
  if (!onPress) return null;
  return {
    onPointerDown: (e) => {
      if (e.button > 0) return;
      const p = { t: Date.now(), x: e.clientX, y: e.clientY, away: false };
      const move = (ev) => {
        if (Math.hypot(ev.clientX - p.x, ev.clientY - p.y) > AWAY_PX) p.away = true;
      };
      const end = (ev) => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", end);
        window.removeEventListener("pointercancel", end);
        rel.current?.({ short: Date.now() - p.t < SHORT_MS, away: p.away || ev.type === "pointercancel" });
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", end);
      window.addEventListener("pointercancel", end);
      navigator.vibrate?.(10);
      onPress();
    },
    onContextMenu: (e) => e.preventDefault(),
  };
}

// Sayfaya göre yazma satırı: ipucu, asistanın varsayılan kayıt türü (prefer), Oluştur'da öne çıkan seçenek, paneldeki örnekler.
// Kendi işi olan sayfalar (dersler, fişler) useDock ile Oluştur'a kendi seçeneklerini ekler. Yazılan ve söylenen her zaman
// ana asistana gider: sayfalar kubbeyi kendi dinleyicisine bağlayamaz (tek asistan kuralı).
const PAGES = {
  "/": { ph: "Sor ya da ekle…", ex: ["Yarın saat 10'da antrenman ekle", "Bugün neler var?", "Yoklamayı aç"] },
  "/calendar": { ph: "Plan ekle ya da sor…", prefer: "plan", first: "Plan" },
  "/messages": { ph: "Birine mesaj gönder ya da sor…", ex: ["Ekibe yarın 9'da iskelede olun yaz", "Okunmamış mesajlar", "Yardım"] },
  "/plans": { ph: "Plan ekle ya da sor…", prefer: "plan", first: "Plan", ex: ["Bu hafta neler var?", "Yarın 10'da antrenman", "Cumartesi Çeşme'de yarış"] },
  "/tasks": { ph: "Görev ver ya da sor…", prefer: "task", first: "Görev", ex: ["Bugün neler var?", "Tekneleri hazırla", "Ali motoru kontrol etsin"] },
  "/notes": { ph: "Not al ya da sor…", prefer: "note", first: "Not", ex: ["Malzeme odası dolu", "3 numaranın dümeni gevşek", "Bu hafta neler var?"] },
  "/birthdays": { ph: "ör. Ayşe'nin doğum günü 12 Mart", first: "Doğum günü" },
  "/receipts": { ph: "Fişlerle ilgili sor…", first: "Fiş" },
  "/invoices": { ph: "Faturayla ilgili söyle…", first: "Fatura", ex: ["Turkcell faturası ödendi", "Faturayı ödendi işaretle", "Elektrik faturası ödenmedi olarak işaretle"] },
  "/payments": { ph: "Ödemelerle ilgili sor…", ex: ["Bu ay ne kadar ödeme aldım?", "Geçen ay kaç ödeme geldi?", "Eylülde ne kadar para geldi?"] },
  "/schedule": { ph: "ör. salı 13:00 fizik B-204", first: "Dersler", ex: ["Salı 13:00 fizik B-204", "Pazartesi 9'da matematik, 10:30'da kimya", "Salı fiziği 14'e al"] },
  "/athletes/attendance": { ph: "Kim geldi? ör. Ali ve Zeynep geldi…", ex: ["Ali ve Zeynep geldi, Emre izinli, kalanlar gelmedi", "Emre gelmedi, velisine haber ver", "Yarın 16:00 antrenman ekle"] },
  "/events": { ph: "Etkinlik planla ya da sor…", ex: ["Kamp planı yap, 2 gece, Kazdağları", "Balığa gideceğiz, ne lazım?", "İç Anadolu gezisi planla"] },
  "/inventory": { ph: "Envantere ekle, çıkar ya da sor…", ex: ["Envantere 3 Optimist teknesi ve 2 el telsizi ekle", "Yelken kulübü envanterinden 2 şamandıra çıkar", "Kulüp envanterinde kaç telsiz var?"] },
  "/posts": { ph: "Ne paylaşalım? ör. Foça yarışı için gönderi hazırla", ex: ["Foça yarışı için Instagram gönderisi hazırla", "Yelken okulu kayıtları için gönderi hazırla", "Sıradaki yarış için gönderi hazırla"] },
  "/wind": { ph: "Rüzgârı sor…", ex: ["Yarın öğlen rüzgâr kaç knot?", "Bu hafta yelkene en uygun gün hangisi?", "Cumartesi poyraz sertleşir mi?"] },
  "/cams": { ph: "Kamera sor…", ex: ["Ayvalık kameralarını aç", "Midilli'deki kameralar", "Dikili kameraları"] },
  "/sea": { ph: "Gemileri sor…", ex: ["Yanaşan gemi var mı?", "Limanda kaç gemi var?", "Sahil Güvenlik nerede?"] },
  "/fitness": { ph: "Antrenmanını söyle ya da programı değiştir…", ex: ["Pazartesi, çarşamba, cuma sabah 7'de 4 haftalık program hazırla", "Squat 3 set 10 tekrar 60 kilo yaptım", "Çarşambayı bacak günü yap"] },
  "/training": { ph: "Antrenmanı anlat, günlüğe yazayım…", ex: ["Dün 14 knot poyrazda start ve tramola çalıştık, 2 saat sürdü", "Bugünkü antrenman çok iyi geçti, Ali ve Ayşe geldi", "Antrenman günlüğünü aç"] },
};
// Tek yarış sayfası: kubbe sekmesiz görünür (sayfanın kendi alt çubuğu kubbenin üstüne oturur, globals.css)
const RACE = { ph: "Bu yarışla ilgili söyle…", ex: ["Mehmet'i de ekle", "Not al: otel rezervasyonu yapılacak", "Bütçeye otel kişi başı 3500 ekle"] };
const isRace = (path) => path.startsWith("/athletes/races/");
// Yarış multimedya ve antrenman sayfası kendi alt sekmelerini (Süre · Medya · Hava · Sonuçlar) gösterir
// Tam ekran sayfalar (sekme çubuğu yok): yarış multimedya, antrenman günü, gömülü Market /sanal (Seyhun 2026-10-25 "tam ekran olmalı")
// yarış sayfası da (kendi alt çubuğu: Yarış · Süre · Medya · Parkur · Sonuçlar, RaceMedia RACE_DOCK); yeni yarış formu değil
const isMedia = (path) => /^\/athletes\/races\/[^/]+\/media/.test(path) || /^\/athletes\/races\/(?!new$)[^/]+$/.test(path) || path === "/training/day" || path === "/sanal";
// Tek gönderi ekranı: söylenen açık gönderiyi değiştirir (PostEditor)
const POST = { ph: "Gönderiyle ilgili söyle…", ex: ["Daha kısa ve samimi yaz", "Mete ikinci oldu diye ekle", "Gün batımında teknelerle görsel üret"] };
const isPost = (path) => path.startsWith("/posts/");
// Tek envanter: söylenen o envantere yazılır ("envanter" demeden: "2 şamandıra kayboldu")
const INV = { ph: "Bu envanterle ilgili söyle…", ex: ["3 Optimist teknesi ekle, depoda", "2 can yeleği kayboldu", "Optimist 4 bakımda, telsizi Ali'ye verdim"] };
const isInv = (path) => path.startsWith("/inventory/");

// Sayfanın kendi ayarı. Fonksiyonlar her çağrıda güncel hâliyle çalışır.
// cfg: { ph, prefer, create: [[icon, label, desc, onClick]] } — create öğeleri Oluştur'da en üstte
const DockCtx = createContext({ setPage() {} });
export function DockProvider({ children }) {
  const [page, setPage] = useState(null);
  return <DockCtx.Provider value={{ page, setPage }}>{children}</DockCtx.Provider>;
}
export function useDock(cfg) {
  const { setPage } = useContext(DockCtx);
  const ref = useRef(cfg);
  useLayoutEffect(() => {
    ref.current = cfg;
  });
  const { ph, prefer } = cfg;
  const createKey = (cfg.create || []).map((c) => c[1]).join("|");
  useEffect(() => {
    const page = {
      ph,
      prefer,
      create: createKey ? createKey.split("|").map((_, i) => [...ref.current.create[i].slice(0, 3), () => ref.current.create?.[i]?.[3]()]) : [],
    };
    setPage(page);
    return () => setPage((p) => (p === page ? null : p));
  }, [setPage, ph, prefer, createKey]);
}

// Yazarak sorma: sesle aynı kutu (sade tasarım, 2026-10-16). Üstte yazı alanı, altta × (yazmayı bırak) ve tek ana düğme:
// yazı varken ↑ gönder, boşken 🎤 (söyleneni kutuya yazar, dokununca durur).
function Composer({ cfg, onDone, onClose, onPhoto, init = "" }) {
  const { openAssistant } = useAssistant();
  const toast = useToast();
  const [text, setText] = useState(init);
  const input = useRef(null);
  const sp = useSpeech({ onFinal: (t) => setText((p) => (p ? `${p} ${t}` : t)), onFail: (m) => toast(m) });
  const listening = sp.status === "listening";
  const picking = useRef(false); // fotoğraf seçici açıkken kutu kendiliğinden kapanmasın (kapanırsa seçilen dosya kaybolur)
  useEffect(() => input.current?.focus(), []);

  const send = () => {
    const t = text.trim();
    if (!t) return input.current?.focus();
    setText("");
    input.current?.blur();
    onDone();
    openAssistant({ text: t, prefer: cfg.prefer, examples: cfg.ex, focus: cfg.focus, dock: true });
  };
  const has = !!text.trim();

  return (
    <TypeBox
      mode={listening ? "listening" : "typing"}
      onX={() => (sp.cancel(), onDone(), onClose?.())}
      xLabel="Asistanı kapat"
      onMain={listening ? () => sp.stop("edit") : has ? send : () => sp.start({ autoStop: 8000 })}
      mainIcon={listening ? "check" : has ? "up" : "mic"}
      mainLabel={listening ? "Bitti" : has ? "Gönder" : "Sesle yaz"}
      onPick={() => (picking.current = true)}
      onPhoto={onPhoto && !listening ? (f) => (sp.cancel(), onDone(), onPhoto(f)) : undefined}
    >
      {listening ? (
        <p className="min-h-[3.5rem] px-5 pb-1 pt-4 text-[1.0625rem] leading-snug">
          {`${text ? `${text} ` : ""}${sp.finalText || ""}${sp.interim || ""}`}
          <i className="box-caret" aria-hidden="true" />
        </p>
      ) : (
        <textarea
          ref={input}
          value={text}
          rows={1}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && (e.preventDefault(), send())}
          onFocus={() => (picking.current = false)}
          onBlur={() => setTimeout(() => !picking.current && !text.trim() && input.current !== document.activeElement && onDone(), 150)}
          placeholder={cfg.ph}
          aria-label={cfg.ph}
          enterKeyHint="send"
          autoCapitalize="sentences"
          className="block max-h-[7.5rem] min-h-[3.5rem] w-full resize-none bg-transparent px-5 pb-1 pt-4 text-[1.0625rem] leading-snug text-fg outline-none [field-sizing:content] placeholder:text-mut"
        />
      )}
    </TypeBox>
  );
}

// SES IŞIĞI (yazı kutusunun içindeki küçük düğme, simgesiz): disk, içinde ses dalgası (globals.css .vlight). Durum yazıyla
// değil renkle anlaşılır (disk, hale, kubbenin parıltısı ve yayı aynı renge döner):
//   boşta     beyaz, dalga yavaşça nefes alır                      dokun → dinlemeye başla
//   dinliyor  kırmızı, dalga sesinle yükselir                      dokun → bitir ve gönder (kendiliğinden göndermez)
//   çalışıyor kehribar (ses yükleniyor, yapay zeka düşünüyor),
//             çevresinde ışık döner, yayda ışık akar               dokun → vazgeç
//   konuşuyor mavi, dalga atar                                     dokun → sözünü kes, dinle
// Basılı tut → yaz.
const LIGHT_LABEL = {
  idle: "Asistan: dokun konuş, basılı tut yaz",
  listening: "Bitir ve gönder",
  busy: "Vazgeç",
  speaking: "Sözünü kes ve konuş",
};
// İş sürerken kısa dokunuş durdurur; okurken kısa dokunuş okumayı keser, basılı tutunca sözünü kesip dinler
const PTT_LABEL = {
  idle: "Asistan: basılı tut konuş",
  listening: "Bırak, gönder",
  busy: "Durdur",
  speaking: "Okumayı kes",
};
export function VoiceLight({ onTap, onHold, onPress, onRelease, state, size = "size-[4.5rem]", compact = false }) {
  const t = useRef(null);
  const held = useRef(false);
  const ptt = usePress(onPress, onRelease);
  const down = () => {
    held.current = false;
    t.current = setTimeout(() => {
      held.current = true;
      navigator.vibrate?.(12);
      onHold();
    }, HOLD_MS);
  };
  const up = () => clearTimeout(t.current);
  return (
    <button
      type="button"
      data-orb=""
      data-state={state}
      {...(ptt || {
        onPointerDown: down,
        onPointerUp: up,
        onPointerLeave: up,
        onContextMenu: (e) => e.preventDefault(),
        onClick: () => !held.current && onTap(),
      })}
      aria-label={ptt ? PTT_LABEL[state] || PTT_LABEL.idle : LIGHT_LABEL[state] || LIGHT_LABEL.idle}
      className={`vlight ${compact ? "vl-sm" : ""} ${size} ${ptt ? "touch-none" : ""} shrink-0 select-none active:scale-95 [-webkit-touch-callout:none]`}
    >
      <span className="vl-halo" aria-hidden="true" />
      <span className="vl-ring" aria-hidden="true" />
      <span className="vl-disc" aria-hidden="true" />
      {state === "listening" ? (
        <ListenWave round {...(compact ? { bar: 2.5, gap: 2.5 } : {})} />
      ) : (
        <span className="vl-wave" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
          <i />
        </span>
      )}
    </button>
  );
}

function NavTab({ href, icon, label, active, badge }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`relative flex h-full min-w-0 touch-manipulation flex-col items-center justify-center gap-1 transition active:scale-95 ${active ? "text-acc" : "text-mut"}`}
    >
      <span className="relative flex">
        <Icon name={icon} className="size-6" />
        {badge > 0 && <span className="absolute -right-2.5 -top-1.5 grid h-[1.125rem] min-w-[1.125rem] place-items-center rounded-full bg-rec px-1 text-[0.625rem] font-bold tabular-nums text-white ring-2 ring-[var(--card)]">{badge > 99 ? "99+" : badge}</span>}
      </span>
      <span className={`text-[0.6875rem] ${active ? "font-bold" : "font-medium"}`}>{label}</span>
    </Link>
  );
}

// BAS-KONUŞ KUTUSU (Seyhun 2026-10-25, örnek "A · Çubuğun sağ ucunda"; önceki "A · Tek kapsül" 2026-10-23): sağda büyük küre,
// sekme çubuğundaki küreyle aynı yerde; solunda kutu. Söylenen yazı kutunun üstünde büyük harflerle akar (son, henüz
// kesinleşmemiş kısım soluk). Boş bulanık alana dokunmak ya da aşağı çekmek asistanı kapatır (dinlerken ve taslak varken değil).
//   durum                kutu                                 sağdaki küre
//   boşta                Fotoğraf · "Yaz…" (dokun: klavye)    basılı tut konuş, bırak gönder
//   dinliyor             ● Dinliyorum · süre                  kırmızı, ses dalgası
//   taslak               × · Düzelt                            basılı tut, devamını söyle
//   gönderiliyor / iş    noktalar                             kehribar, ışık döner · dokun durdur
//   konuşuyor            noktalar                             mavi · basılı tut, sözünü kes
// mode: listening | sending | busy | speaking | idle. tail: yazının soluk son kısmı. r: ringOf (data-tone, üstteki durum yazısı)
const PILLBTN = "grid size-11 shrink-0 touch-manipulation place-items-center rounded-full bg-white/[.08] text-fg transition active:scale-90";
function AssistBox({ mode, text, tail = "", ph, r = {}, draft = false, onX, xLabel, onText, onPhoto, onPress, onRelease }) {
  const box = useRef(null);
  const pick = useRef(null);
  useEffect(() => {
    const el = box.current;
    if (el) el.scrollTop = el.scrollHeight; // uzun sözde son kısım görünsün
  }, [text, tail]);
  const listening = mode === "listening";
  const idle = mode === "idle";
  const said = [text, tail].filter(Boolean).join(" ");
  return (
    <div className="relative px-3 pb-1">
      {/* Söylenen / yazılan söz: kutunun üstünde, büyük; durunca dokununca klavyeyle düzeltilir */}
      {!!said && (
        <div data-mode={mode} className={`asheet-input amsg-in mx-2 ${listening ? "mb-2" : "mb-4"} ${idle ? "asheet-draft" : ""}`}>
          <div ref={box} onClick={idle ? onText : undefined} className={`max-h-[9.5rem] overflow-hidden text-[1.3125rem] font-semibold leading-snug tracking-[-.01em] ${idle && onText ? "cursor-text" : ""}`}>
            <span className="text-fg">
              {text}
              {tail && <span className="text-fg/45">{text ? " " : ""}{tail}</span>}
              {listening && <i className="box-caret" aria-hidden="true" />}
            </span>
          </div>
        </div>
      )}
      <div className="flex items-end gap-2.5">
        <div className="apill flex h-[3.875rem] min-w-0 flex-1 items-center gap-2 rounded-full pl-2 pr-4">
          {idle && draft ? (
            <button type="button" onClick={onX} aria-label={xLabel} className={PILLBTN}>
              <Icon name="x" className="size-[1.25rem]" />
            </button>
          ) : idle && onPhoto ? (
            <>
              <button type="button" onClick={() => pick.current?.click()} aria-label="Fotoğraf" className={PILLBTN}>
                <Icon name="image" className="size-[1.25rem]" />
              </button>
              <input
                ref={pick}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) onPhoto(f);
                }}
              />
            </>
          ) : (
            <span className="w-2 shrink-0" />
          )}
          {listening ? (
            <span className="flex min-w-0 flex-1 items-center gap-2 text-[0.9375rem] font-semibold text-fg/80">
              <MicDot />
              Dinliyorum · <ListenClock />
            </span>
          ) : idle ? (
            <button type="button" onClick={onText} aria-label={draft ? "Düzelt" : "Yaz"} className="min-w-0 flex-1 truncate py-3 text-left text-[0.9375rem] text-fg/55">
              {draft ? "Düzelt" : ph}
            </button>
          ) : (
            <span className="h-6 min-w-0 flex-1 animate-pulse bg-[radial-gradient(circle,rgba(255,255,255,.5)_1.5px,transparent_1.6px)] bg-[length:8px_8px] bg-[position:center] bg-repeat-x opacity-70" aria-hidden="true" />
          )}
        </div>
        <OrbMain mode={mode} r={r} onPress={onPress} onRelease={onRelease} />
      </div>
    </div>
  );
}

// Ortadaki düğme (alt çubuktaki asistan düğmesiyle aynı yer ve görünüş, globals.css .vlight .aorb): renk durumu anlatır.
// İçinde: dinlerken canlı ses dalgası, taslakta ↑, iş bitince onay, değilse logo dalgası. data-tone/data-fill ekran testleri için.
function OrbMain({ mode, r, icon, label, on = true, onTap, onHold, onPress, onRelease, small = false }) {
  const t = useRef(null);
  const held = useRef(false);
  const ptt = usePress(onPress, onRelease);
  const vstate = mode === "listening" ? "listening" : mode === "busy" || mode === "sending" ? "busy" : mode === "speaking" ? "speaking" : "idle";
  const down = () => {
    held.current = false;
    if (!onHold || mode !== "idle") return;
    t.current = setTimeout(() => {
      held.current = true;
      navigator.vibrate?.(12);
      onHold();
    }, HOLD_MS);
  };
  const up = () => clearTimeout(t.current);
  return (
    <button
      type="button"
      data-orb=""
      data-ring=""
      data-tone={r.tone || "idle"}
      data-fill={r.fill || 0}
      data-state={vstate}
      disabled={!on}
      {...(ptt || {
        onPointerDown: down,
        onPointerUp: up,
        onPointerLeave: up,
        onContextMenu: (e) => e.preventDefault(),
        onClick: () => !held.current && onTap(),
      })}
      aria-label={ptt ? PTT_LABEL[vstate] || PTT_LABEL.idle : label}
      className={`vlight aorb ${small ? "vl-sm size-[3.125rem]" : ptt ? "size-[4.75rem] touch-none" : "size-[4.5rem]"} shrink-0 select-none disabled:opacity-60 [-webkit-touch-callout:none]`}
    >
      <span className="vl-halo" aria-hidden="true" />
      <span className="vl-ring" aria-hidden="true" />
      <span className="vl-disc" aria-hidden="true" />
      {mode === "listening" ? (
        <ListenWave round {...(small ? { bar: 3, gap: 3 } : {})} />
      ) : icon === "up" && !ptt ? (
        <Icon name="up" className={`relative ${small ? "size-6" : "size-7"} text-white [stroke-width:2.5]`} />
      ) : r.check && mode === "idle" ? (
        <svg viewBox="0 0 48 48" className={`relative ${small ? "size-6" : "size-8"}`} aria-hidden="true"><path className="lring-check" d="M13 25l7 7 15-16" /></svg>
      ) : (
        <span className="vl-wave" aria-hidden="true"><i /><i /><i /><i /><i /></span>
      )}
    </button>
  );
}

// Yazı kutusu (klavyeyle yazarken, Composer): üstte yazı alanı, altta × · ses · ↑ Gönder (2026-10-16 sade kutu)
const ROUND = "grid size-11 shrink-0 touch-manipulation place-items-center rounded-full transition active:scale-90";
function TypeBox({ mode, text, tail = "", ph, onX, xLabel, onMain, mainIcon, mainLabel, mainOn = true, onText, onStop, onTalk, onPhoto, onPick, children }) {
  const box = useRef(null);
  const pick = useRef(null);
  useEffect(() => {
    const el = box.current;
    if (el) el.scrollTop = el.scrollHeight; // uzun sözde son kısım görünsün
  }, [text, tail]);
  const listening = mode === "listening";
  const working = mode === "busy" || mode === "sending";
  const quiet = working || mode === "speaking";
  const keep = (e) => mode === "typing" && e.preventDefault(); // yazarken düğmeye basınca klavye kapanmasın
  const said = [text, tail].filter(Boolean).join(" ");
  return (
    <div className="px-3 pb-1 pt-2">
      <div data-mode={mode} className={`asheet-input atype rounded-[1.75rem] ${listening ? "asheet-on" : ""}`}>
        {/* Yazı alanı boştayken (taslak ya da "Yaz ya da konuş…") ve dinlerken (canlı söz). Çevrilirken ve iş sürerken yok:
            gönderilen söz sohbete balon olarak düşer. */}
        {children || (!quiet && (
          <div
            ref={box}
            onClick={onText}
            className={`max-h-[7.5rem] min-h-[3.5rem] overflow-hidden px-5 pb-1 pt-4 text-[1.0625rem] leading-snug ${onText ? "cursor-text" : ""}`}
          >
            {said ? (
              <span className="text-fg">
                {text}
                {tail && <span className="text-mut">{text ? " " : ""}{tail}</span>}
                {listening && <i className="box-caret" aria-hidden="true" />}
              </span>
            ) : listening ? (
              <span className="text-mut">
                Dinliyorum…
                <i className="box-caret" aria-hidden="true" />
              </span>
            ) : (
              <span className="text-mut">{ph}</span>
            )}
          </div>
        ))}
        <div className={`flex items-center gap-2.5 px-2 ${quiet ? "py-2" : "pb-2"}`}>
          <button type="button" onPointerDown={keep} onClick={onX} aria-label={xLabel} className={`${ROUND} bg-fg/[.07] text-fg`}>
            <Icon name="x" className="size-[1.375rem]" />
          </button>
          {/* Fotoğraf: seçilen resim asistana gider (motor photoIn verince görünür) */}
          {onPhoto && (
            <>
              <button type="button" onPointerDown={keep} onClick={() => (onPick?.(), pick.current?.click())} aria-label="Fotoğraf" className={`${ROUND} bg-fg/[.07] text-fg`}>
                <Icon name="image" className="size-[1.25rem]" />
              </button>
              <input
                ref={pick}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) onPhoto(f);
                }}
              />
            </>
          )}
          {listening ? (
            <span className="flex min-w-0 flex-1 items-center gap-2.5" onClick={onText}>
              <MicDot />
              <ListenClock />
              <ListenWave line className="h-8 min-w-0 flex-1 text-acc" />
            </span>
          ) : working || mode === "speaking" ? (
            <span
              className={`h-7 min-w-0 flex-1 animate-pulse bg-[length:8px_8px] bg-[position:center] bg-repeat-x ${mode === "speaking" ? "bg-[radial-gradient(circle,var(--acc)_1.75px,transparent_1.85px)]" : "bg-[radial-gradient(circle,var(--mut)_1.5px,transparent_1.6px)] opacity-70"}`}
              aria-hidden="true"
            />
          ) : (
            <span className="min-w-0 flex-1" />
          )}
          {listening && onStop && (
            <button type="button" onClick={onStop} aria-label="Dur" className={`${ROUND} bg-fg/[.12]`}>
              <span className="size-3.5 rounded-[3px] bg-fg" aria-hidden="true" />
            </button>
          )}
          {onTalk && (
            <button type="button" onPointerDown={keep} onClick={onTalk} aria-label="Konuşmaya devam" className={`${ROUND} bg-fg/[.12] text-fg`}>
              <Icon name="mic" className="size-[1.25rem]" />
            </button>
          )}
          <button type="button" onPointerDown={keep} onClick={onMain} disabled={!mainOn} aria-label={mainLabel} className={`${ROUND} size-12 bg-acc text-white disabled:opacity-40`}>
            {mainIcon === "stop" ? <span className="size-4 rounded-[3px] bg-white" aria-hidden="true" /> : <Icon name={mainIcon} className="size-[1.375rem]" />}
          </button>
        </div>
      </div>
    </div>
  );
}

// Dinleme süresi (0:07): dinleme başlayınca sıfırdan sayar; yalnız bu küçük parça saniyede bir yeniden çizilir
function ListenClock() {
  const [sec, setSec] = useState(0);
  useEffect(() => {
    const t0 = Date.now();
    const id = setInterval(() => setSec(Math.floor((Date.now() - t0) / 1000)), 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="shrink-0 text-[0.9375rem] font-semibold tabular-nums text-mut">{`${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`}</span>;
}

// ASİSTAN ALANI ("Merkez", 2026-10-07): açık renkli alt sekme çubuğu, ortada asistan düğmesi; asistan açılınca alttan sayfa.
// Önceki: "Ada" (yüzen koyu cam adalar, PR #190).
// Önceki düzen (Seyhun "Karışık" seçti): altta sabit, solda Oluştur,
// ortada yazı kutusu, kutunun içinde küçük renkli ses ışığı; altında sekmeler (her sayfada aynı). Asistan açılınca sekmeler
// çekilir, Oluştur yerine Kapat gelir; söylenen söz kutunun içine yazılır, cevaplar ve kartlar kutunun üstünde balon olarak
// akar. Asistan açılınca tam sayfa olur (hareketli arka plan, önünde konuşma), alan dolunca içeride kayar. Kürenin boyu hiç değişmez.
// Yazarken kubbe klavyenin üstüne taşınır. rec: plan/görev/not ekranı açık (AddSheet); kubbe o ekranın üstünde sekmesiz ve
// Oluştur'suz görünür, asistan o kaydı bilir (focus).
const noop = () => () => {};
// Asistan açıkken arkadaki sayfa bulanıklaşır ve hafifçe kararır (globals.css .abg); ayrı zemin yok
function AssistBg() {
  return <div className="abg" aria-hidden="true" />;
}

const LEAVE_MS = 340; // globals.css › .afull-out

// Sesli yanıt düğmesi (Seyhun 2026-10-20: "asistan kullanılırken de seslendirmeyi kapatabilmeliyim, uygun ortam olmayabilir"):
// sağ üstte hoparlör. Kapatınca okuma o an susar, sonraki cevaplar yalnız yazılır; açınca sonraki cevaplar okunur.
// Ayarlar › Sesli yanıt ile aynı ayar. Simge yumuşak geçişle değişir, alttaki kısa yazı ne olduğunu söyler.
function ReadToggle() {
  const tts = useTts();
  const toast = useToast();
  if (!tts?.supported) return null;
  const on = !!tts.enabled;
  const flip = () => {
    navigator.vibrate?.(8);
    if (on) tts.disable();
    else tts.enable();
    toast(on ? "Sesli yanıt kapalı" : "Sesli yanıt açık");
  };
  return (
    <button
      type="button"
      onClick={flip}
      aria-pressed={on}
      aria-label={on ? "Sesli yanıtı kapat" : "Sesli yanıtı aç"}
      className={`absolute right-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full border transition-[background-color,border-color,color,transform] duration-200 active:scale-90 ${on ? "border-acc/40 bg-acc/15 text-acc" : "border-white/10 bg-white/5 text-mut"}`}
    >
      <span className={`absolute transition-[opacity,transform] duration-200 ${on ? "scale-100 opacity-100" : "scale-75 opacity-0"}`}><Icon name="volume" className="size-5" /></span>
      <span className={`absolute transition-[opacity,transform] duration-200 ${on ? "scale-75 opacity-0" : "scale-100 opacity-100"}`}><Icon name="mute" className="size-5" /></span>
    </button>
  );
}

function Dome({ noAi = false, bar, slim, rec, active, leaving = false, small = false, state, live, talk, press, release, typeNow, typing, onTypingDone, cfg, onClose, onMini, setSlot, path, unread, voice = {}, typeInit = "" }) {
  const client = useSyncExternalStore(noop, () => true, () => false);
  const box = useRef(null);
  const inner = useRef(null);
  const pane = useRef(null);
  const userUp = useRef(false);
  const shown = bar || slim || rec || active || typing;
  // Sekmeler sabit: kaydırınca soluklaşmaz ve değişmez (iPhone uygulamalarındaki alt sekme çubuğu gibi; Seyhun: "soluklaşınca
  // zor tıklanıyor", 2026-10-06)
  const idle = (bar || slim) && !rec && !active && !typing;

  // Yükseklik içeriği izler (kubbe içerikle birlikte büyür/küçülür; geçiş CSS'te). Boştaki yükseklik sayfanın alt boşluğu olur.
  // Asistan açılıp kapanırken boy geçişsiz bir anda değişir (Seyhun 2026-10-22: "açılırken takılıyor"): tam ekrana doğru
  // kare kare büyüyen boy her karede yerleşim ve büyük bir alanın yeniden boyanması demekti. Açılış/kapanış hareketi
  // yalnız içeride, transform ve opacity ile (globals.css .afull-in / .afull-out).
  const wasActive = useRef(active);
  useLayoutEffect(() => {
    const o = box.current;
    const i = inner.current;
    if (!o || !i) return;
    const jump = wasActive.current !== active;
    wasActive.current = active;
    const set = () => {
      const h = shown ? Math.round(i.offsetHeight) : 0;
      if (o.style.height !== `${h}px`) {
        if (jump) o.style.transition = "none";
        o.style.height = `${h}px`;
        if (jump) {
          void o.offsetHeight; // geçişsiz boy uygulansın, sonra geçiş geri gelsin
          o.style.transition = "";
        }
      }
      if (idle) {
        document.documentElement.style.setProperty("--dome-h", `${h}px`);
        document.documentElement.style.setProperty("--stage-h", `${h}px`);
      }
      if (rec && !active && !typing) document.documentElement.style.setProperty("--rec-h", `${h}px`);
    };
    set();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(set);
    ro.observe(i);
    return () => ro.disconnect();
  }, [shown, idle, rec, active, typing, client]);

  // Klavye: kubbe görünen alanın altına oturur; konuşma alanı kalan yüksekliğe sığar
  useEffect(() => {
    const vv = window.visualViewport;
    const el = box.current;
    if (!vv || !el || !(typing || active)) return;
    const fit = () => {
      const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      el.style.transform = kb > 40 ? `translate3d(0,${-kb}px,0)` : "";
      el.style.setProperty("--vvh", `${Math.round(vv.height)}px`);
    };
    fit();
    vv.addEventListener("resize", fit);
    vv.addEventListener("scroll", fit);
    return () => {
      vv.removeEventListener("resize", fit);
      vv.removeEventListener("scroll", fit);
      el.style.transform = "";
    };
  }, [typing, active]);

  // Yeni balon ya da kart gelince aşağı kayar; uzun yanıtta yanıtın başı görünür kalır (konuşurken duyulan söz her zaman
  // görünür). Kullanıcı parmakla yukarı kaydırdıysa dokunmaz; yeniden en alta inince ya da yeni yanıtta takip sürer.
  useEffect(() => {
    const el = pane.current;
    if (!active || !el) return;
    userUp.current = false;
    let lastR = null;
    let touchAt = 0;
    let frame = 0;
    let pin = false; // kullanıcı kendisi en alta indi: yanıtın başına geri çekilmez
    const down = () => {
      frame = 0;
      const r = el.querySelector("[data-last-reply]");
      if (r !== lastR) {
        lastR = r;
        userUp.current = false; // yeni yanıt: yeniden takip et
        pin = false;
      }
      if (userUp.current) return;
      const bottom = el.scrollHeight - el.clientHeight;
      const hearing = el.querySelector("[data-hearing]");
      const start = r && !hearing && !pin ? r.getBoundingClientRect().top - el.getBoundingClientRect().top + el.scrollTop - 16 : bottom;
      const top = Math.max(0, Math.min(bottom, start));
      if (Math.abs(el.scrollTop - top) > 2) el.scrollTo({ top, behavior: "smooth" });
    };
    // Aynı karede gelen değişiklikler tek kaydırma (art arda smooth kaydırmalar iPhone'da birbirini durduruyordu)
    const soon = () => {
      if (!frame) frame = requestAnimationFrame(down);
    };
    const mo = typeof MutationObserver !== "undefined" ? new MutationObserver(soon) : null;
    mo?.observe(el, { childList: true, subtree: true, characterData: true });
    // İçerik ya da alanın boyu DOM değişmeden de değişir (açılış geçişi, klavye, dinlemede alanın kısalması)
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(soon) : null;
    ro?.observe(el);
    if (el.firstElementChild) ro?.observe(el.firstElementChild);
    const onUser = () => (touchAt = Date.now()); // yalnız parmakla/tekerlekle kaydırma
    const onScroll = () => {
      if (Date.now() - touchAt > 1000) return; // kendi kaydırmamız
      userUp.current = el.scrollHeight - el.clientHeight - el.scrollTop > 48;
      pin = !userUp.current;
    };
    el.addEventListener("touchmove", onUser, { passive: true });
    el.addEventListener("wheel", onUser, { passive: true });
    el.addEventListener("touchend", onUser, { passive: true }); // parmak kalkınca süren kayma da kullanıcının
    el.addEventListener("scroll", onScroll, { passive: true });
    down();
    return () => {
      mo?.disconnect();
      ro?.disconnect();
      if (frame) cancelAnimationFrame(frame);
      el.removeEventListener("touchmove", onUser);
      el.removeEventListener("wheel", onUser);
      el.removeEventListener("touchend", onUser);
      el.removeEventListener("scroll", onScroll);
    };
  }, [active, client]);

  // Aşağı çekerek kapat (Seyhun, 2026-10-06): asistan açıkken kubbe parmakla aşağı sürüklenir; yeterince (dinlerken daha
  // çok) ya da hızlı çekilince konuşma kapanır, azsa yerine döner. Konuşma alanı kaydırılmışken oradan başlayan çekme
  // kaydırmadır; yazarken (klavye) ve düğmelerden başlayan dokunuşta çalışmaz.
  const st = useRef(state);
  const close = useRef(onClose);
  const mini = useRef(onMini);
  useLayoutEffect(() => {
    st.current = state;
    close.current = onClose;
    mini.current = onMini;
  });
  useEffect(() => {
    const el = box.current;
    if (!active || typing || !el) return;
    let y0 = null;
    let t0 = 0;
    let dy = 0;
    let drag = false;
    const reset = (anim) => {
      el.style.transition = anim ? "transform .3s cubic-bezier(.22,.8,.24,1), height .5s cubic-bezier(.22,.8,.24,1)" : "";
      el.style.transform = "";
    };
    const start = (e) => {
      if (e.touches.length !== 1 || e.target.closest("button, a, input, textarea, [data-orb]")) return (y0 = null);
      const p = pane.current;
      if (p && p.contains(e.target) && p.scrollTop > 2) return (y0 = null);
      y0 = e.touches[0].clientY;
      t0 = Date.now();
      dy = 0;
      drag = false;
    };
    const move = (e) => {
      if (y0 == null) return;
      dy = e.touches[0].clientY - y0;
      if (!drag && dy > 10) drag = true;
      if (!drag) return;
      if (dy <= 0) return (el.style.transform = "");
      e.preventDefault(); // konuşma alanı kaymasın, kubbe parmağı izlesin
      el.style.transition = "none";
      el.style.transform = `translate3d(0,${Math.round(dy)}px,0)`;
    };
    const end = () => {
      if (y0 == null) return;
      y0 = null;
      if (!drag) return;
      const fast = dy / Math.max(1, Date.now() - t0) > 0.6 && dy > 50;
      const far = dy > (st.current === "listening" ? 160 : 110);
      // Kapanınca kubbe zaten boştaki boyuna iner; sürüklenen kubbe aynı anda yerine yumuşakça döner
      // Konuşurken ya da iş sürerken çekilirse kapanmaz, sağ altta küçük küre olur (Seyhun, 2026-10-14)
      if (fast || far) {
        (pullAction(st.current) === "mini" && mini.current ? mini.current() : close.current?.());
        // Parmağın bıraktığı yerden aşağı iner (yukarı geri sıçramaz); kapanış bitince temizlik aşağıda
        el.style.transition = "transform .32s cubic-bezier(.4,0,.6,1)";
        el.style.transform = "translate3d(0,100%,0)";
        return;
      }
      reset(true);
    };
    el.addEventListener("touchstart", start, { passive: true });
    el.addEventListener("touchmove", move, { passive: false });
    el.addEventListener("touchend", end, { passive: true });
    el.addEventListener("touchcancel", end, { passive: true });
    return () => {
      el.removeEventListener("touchstart", start);
      el.removeEventListener("touchmove", move);
      el.removeEventListener("touchend", end);
      el.removeEventListener("touchcancel", end);
      el.style.transform = "";
      el.style.transition = "";
    };
  }, [active, typing]);

  const heard = active && (state === "listening" || live.transcribing) && live.heard; // gönderilirken de yazı kalır
  // Kubbe asistan başlayınca yükselmez: konuşma alanında ilk yazı (duyulan söz, mesaj, kart) ya da iş yazısı belirince açılır,
  // tam sayfada mesajlar alttan yukarı dolar, dolunca içeride kayar (Seyhun, 2026-10-14). Bir kez açılınca
  // konuşma bitene kadar küçülmez (cevaplar arasında inip kalkmasın).
  const body = useRef(null);
  const feed = useRef(null);
  const [filled, setFilled] = useState(false);
  useEffect(() => {
    const el = feed.current;
    if (!active || !el || typeof ResizeObserver === "undefined") return;
    // Gözlemci ilk ölçümü kendisi de verir; yuvanın kendi 4 px'lik payı sayılmaz (açılışta halka büyük kalır, ilk yazıda küçülür)
    const ro = new ResizeObserver(() => {
      if (el.offsetHeight > 8) setFilled(true);
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      setFilled(false);
    };
  }, [active]);
  const open = active && filled;
  // Yazı kutusunda görünen: dinlerken ve gönderilirken söylenen söz, değilse sayfanın ipucu
  // Alttan açılan sayfa: asistan açıkken, yazarken ya da kayıt ekranında; değilse sekme çubuğu
  const sheet = active || typing || rec;
  // Asistan kapanınca sekme çubuğu bir anda belirmez, alttan kayarak gelir (Seyhun 2026-10-22: "her defasında göze kötü geliyor")
  const [wasSheet, setWasSheet] = useState(sheet);
  const [rise, setRise] = useState(false);
  if (wasSheet !== sheet) {
    setWasSheet(sheet);
    setRise(!sheet);
  }
  const said = heard || (active && state === "listening" ? "Dinliyorum…" : "");
  // Konuşma kutusu (Seyhun'un örneği, 2026-10-09): dinlerken, çevrilirken ve durdurulup bekleyen sözde satırın yerine
  // geniş yuvarlak kutu: üstte söylenen yazı, altta × (sil) · noktalı ses dalgası · ■ (durdur, gönderme) · ↑ (gönder)
  const draft = active && !typing && live.draft ? live.draft : "";
  // Asistan açıkken (yazı klavyesi açık değilse) alan hep asistan kutusu; boştaki yuvarlak düğme ve sekmeler aynı kalır
  const box2 = active && !typing;
  // Kutu yalnız kullanıcının sözü (Seyhun: "input'un içinde kullanıcının söylediklerini gösterecektik; hem orada dinliyorum
  // hem üstteki cevap alanında aynı şeyler çıkıyor", 2026-10-10): dinlerken canlı söz, gönderilirken ve iş yapılırken
  // gönderilen söz; "Dinliyorum", "Çalışıyorum" gibi durum yazısı kutuda yok (durum dalgada ve üstteki tek satırda).
  // Cevap gelince söz üstte balon olur, kutu boşalır: aynı yazı iki yerde görünmez. İş sürerken arkada açılan mikrofon
  // (kullanıcı devam ederse diye) kutuyu "dinliyor"a çevirmez; yalnız yeni söz duyulunca
  const mode = live.listening && (!live.busy || heard) ? "listening" : live.transcribing ? "sending" : state === "busy" || live.busy ? "busy" : state === "speaking" ? "speaking" : "idle";
  const boxText =
    mode === "listening" ? [draft, heard ? live.heardFix ?? heard : ""].filter(Boolean).join(" ")
    : mode === "sending" ? heard || "" // yalnız şimdi söylenen: önceki söz (live.said) bir an görünüp kaybolmasın (Seyhun, 2026-10-09)
    : mode === "busy" ? "" // gönderilen söz sohbete balon olarak geçti: kutuda ikinci kez görünmez (Seyhun 2026-10-25)
    : draft;
  const ring = active ? ringOf({ state, transcribing: live.transcribing, status: live.status, list: live.prog, talked: live.talked, shown: live.planShown, saved: live.saved }) : {};
  // İş bitince (düğmede ✓) kısa "tamam" titreşimi; dinleme başlarken titreşim useSpeech'te
  const done = !!ring.check;
  useEffect(() => {
    if (done) haptic("success");
  }, [done]);
  return (
    <div
      ref={box}
      data-dome=""
      data-state={active ? state : "idle"}
      data-on={active ? "" : undefined}
      role="region"
      aria-label="Asistan"
      className={`dome dome-rise fixed inset-x-0 bottom-0 ${rec ? "z-[55]" : "z-[38]"} h-0 overflow-hidden ${shown ? "visible" : "invisible [transition:height_.5s_cubic-bezier(.22,.8,.24,1),visibility_0s_.5s]"}`}
    >
      {/* MERKEZ (Seyhun: "tasarım tamamen farklı olsun, popüler uygulamalardaki kullanıcı deneyimi ön planda", 2026-10-07):
          Instagram, WhatsApp gibi açık renkli, kenardan kenara alt sekme çubuğu; ortada biraz yukarı taşan yuvarlak asistan
          düğmesi (dokun: konuş, basılı tut: yaz). Asistan açılınca çubuğun yerine alttan beyaz bir sayfa (ChatGPT, Gemini
          gibi) gelir: üstte tutamaç ve kapat, ortada sohbet balonları, altta Oluştur, yazı kutusu ve ses düğmesi. Durum
          yalnız ses düğmesinin renginden anlaşılır (yeşil bekliyor, kırmızı dinliyor, kehribar çalışıyor, mavi konuşuyor). */}
      <div ref={inner} className={`absolute inset-x-0 bottom-0 ${active ? "h-[var(--vvh,100dvh)]" : ""}`}>
        {sheet ? (
          // Asistan açıkken tam sayfa (Seyhun, 2026-10-14): arkada animasyonlu zemin, önde sohbet ve görevler, altta aynı kutu;
          // açık ya da koyu görünümden bağımsız tek koyu tasarım (data-theme="dark": içindeki dark: sınıfları da koyu)
          <div data-theme={active ? "dark" : undefined} data-state={active ? state : undefined} data-filled={open ? "" : undefined} className={active ? `afull ${leaving ? "afull-out" : "afull-in"} relative flex h-full flex-col` : "contents"}>
          {active && <AssistBg />}
          <div className={`asheet relative mx-auto w-full max-w-[34rem] pb-[max(0.5rem,calc(env(safe-area-inset-bottom)-0.25rem))] ${active ? "flex min-h-0 flex-1 flex-col pt-[env(safe-area-inset-top)]" : ""}`}>
            {active && (
              <div className="relative flex h-12 shrink-0 items-center px-5">
                {/* Durum yazısı (Düşünüyorum, Yapıyorum 2 / 3, Kaydedildi): sol üstte tek satır; sağda sesli yanıt */}
                {/* İş bitince ("Kaydedildi", "Tamam") yazı görünmez: bunu düğmedeki yeşil ✓ anlatır; ekran okuyucu yine okur */}
                <p aria-live="polite" className="min-w-0 truncate text-[0.875rem] font-semibold text-fg/80">
                  <span className={ring.tone === "ok" ? "sr-only" : ""}>
                    {ring.label}
                    {ring.label && ring.sub ? <span className="font-normal text-fg/60"> · {ring.sub}</span> : null}
                  </span>
                </p>
                <ReadToggle />
              </div>
            )}
            {active && (
              <div
                ref={pane}
                data-apane=""
                // Tek kutu (2026-10-23): kapat düğmesi yok, dinlerken ve taslak varken dışında boş alana dokununca kapanır
                onClick={(e) => (e.target === pane.current || e.target === body.current) && mode !== "listening" && !draft && onClose?.()}
                // Sohbet alanı ekranın kalanını kaplar; mesajlar alttan dolar, fazlası içeride kayar
                // Üstte boşluk ve yukarı doğru soluklaşma (Seyhun: "yazı yukarı gittikçe soluklaşsın, üstte biraz boşluk", 2026-10-14)
                className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 [mask-image:linear-gradient(to_bottom,transparent,rgba(0,0,0,.35)_2.5rem,#000_40%)] [scrollbar-width:none]"
              >
                <div ref={body} className="flex min-h-full flex-col justify-end pb-5 pt-10">
                  <div ref={feed}>
                    <div ref={setSlot} />
                  </div>
                </div>
              </div>
            )}
            {typing ? (
              <Composer cfg={cfg} onDone={onTypingDone} onClose={onClose} onPhoto={voice.photo} init={typeInit} />
            ) : box2 ? (
              <AssistBox
                mode={mode}
                r={ring}
                text={boxText}
                ph={cfg.ph}
                draft={!!draft}
                tail={mode === "listening" && heard && live.heardFix != null ? live.tail || "" : ""}
                // × her zaman asistanı kapatır (Seyhun 2026-10-22); dinleme ve bekleyen söz de gider
                onX={onClose}
                xLabel="Asistanı kapat"
                onPhoto={voice.photo}
                onPress={press}
                onRelease={release}
                onText={mode === "idle" ? (draft ? voice.type : typeNow) : undefined}
              />
            ) : (
              // Plan/görev/not ekranının üstünde (rec), asistan kapalıyken: tek satır kutu, dokun yaz, ışığa dokun konuş
              <div className="px-3 py-2">
                <div className="asheet-input flex min-h-12 items-center gap-1 rounded-full pl-5 pr-1.5">
                  <button type="button" onClick={typeNow} aria-label="Yazarak sor" data-press="row" className="min-w-0 flex-1 truncate py-3 text-left text-[0.9375rem] text-mut">
                    {said || cfg.ph}
                  </button>
                  <VoiceLight state={small ? state : "idle"} onTap={talk} onHold={typeNow} size="size-9" compact />
                </div>
              </div>
            )}
          </div>
          </div>
        ) : (
          // Boşta: alt sekme çubuğu, sağ uçta büyük asistan küresi (çubuktan yukarı taşar, pt-9 payı kesilmesin diye; üstündeki saydam pay dokunuş almaz)
          <div className={`atabbar-wrap ${noAi ? "" : "pt-9"} ${rise ? "atab-up" : ""}`}>
            <nav aria-label="Sekmeler" className="atabbar relative pb-[max(0.25rem,calc(env(safe-area-inset-bottom)-0.5rem))]">
              {/* Sporcu tarafında asistan düğmesi yok, dört sekme (Seyhun: "sporcu sesli asistanı kullanmayacak", 2026-10-13) */}
              {/* Bas-konuş (Seyhun 2026-10-25 "A · Çubuğun sağ ucunda"): dört sekme solda, büyük küre sağ uçta, baş parmağın altında */}
              <div className="mx-auto flex h-14 max-w-[34rem] items-stretch">
                <div className="grid min-w-0 flex-1 grid-cols-4">
                  <NavTab href="/" icon="home" label="Ana sayfa" active={path === "/"} />
                  <NavTab href="/calendar" icon="cal" label="Takvim" active={path === "/calendar"} />
                  <NavTab href="/messages" icon="chat" label="Mesajlar" active={path === "/messages"} badge={unread} />
                  <NavTab href="/tasks" icon="task" label="Görevler" active={path === "/tasks"} />
                </div>
                {!noAi && (
                  <div data-ptt="" className="relative w-[6rem] shrink-0">
                    <TimerChip />
                    <span className="acenter absolute -top-7 right-2.5 rounded-full p-1">
                      {/* Küçülen asistan bu küreyi kullanır: rengi o anki durum (ikinci küre yok) */}
                      <VoiceLight state={small ? state : "idle"} onPress={press} onRelease={release} size="size-[4.75rem]" />
                    </span>
                  </div>
                )}
              </div>
            </nav>
          </div>
        )}
      </div>
    </div>
  );
}

// Küçülmüş asistan (Seyhun, 2026-10-14): alttaki asıl küre durum rengini alır, hemen üstünde mesaj balonu. Balon uzadıkça
// son kısmı görünür (eski satırlar yukarıda soluklaşıp kaybolur). Küre görünmüyorsa (açık sohbet) sağ altta yedek küre.
function MiniBubble({ state, live, bottom, orb, tail, onOpen, onClose }) {
  const text = miniText(state, live);
  return (
    <div className={`amini pointer-events-none fixed z-[39] flex flex-col items-center ${orb ? "right-3 items-end" : "left-1/2 w-[min(22rem,calc(100vw-2rem))] -translate-x-1/2"}`} style={{ bottom }}>
      {text && (
        <button type="button" onClick={onOpen} className={`amini-bubble pointer-events-auto relative max-w-full rounded-[1.25rem] px-4 py-2.5 text-left ${orb ? "mb-2" : ""}`}>
          <span className="flex max-h-[4.6rem] flex-col justify-end overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,#000_1.6rem)]">
            <span className="block text-[0.9375rem] leading-snug">{text}</span>
          </span>
          {tail && <span className="amini-tail" aria-hidden="true" />}
        </button>
      )}
      {orb && (
        <span className="pointer-events-auto">
          <VoiceLight state={state} onTap={onOpen} onHold={onClose} size="size-14" compact />
        </span>
      )}
    </div>
  );
}

// Alt kubbe + Oluştur menüsü. bar: bu sayfada sekmeler görünür (değilse kubbe yalnız asistan çalışırken çıkar).
export function TabBar({ cfg, bar, slim = false, rec = false, sideNav = false }) {
  const path = usePathname();
  const wide = useWide();
  const router = useRouter();
  const { openAssistant, live, act, setSlot } = useAssistant();
  const { openAdd } = useAdd();
  const { openReceipt } = useReceipt();
  const { openBirthday } = useBirthday();
  const { unreadTotal } = useChat();
  const [menu, setMenu] = useState(false);
  const [typing, setTyping] = useState(false);
  const [typeInit, setTypeInit] = useState(""); // yazı kutusu açılırken içinde olacak söz (konuşma kutusundan)
  // Yazarken de sayfanın alt düğme çubuğu gizlenir (globals.css)
  useEffect(() => {
    if (!typing) return;
    document.body.dataset.typing = "1";
    return () => delete document.body.dataset.typing;
  }, [typing]);
  const kind = useKind();

  const open = !!live.open;
  // Küçülen küre (Seyhun, 2026-10-14): konuşurken ya da iş sürerken aşağı çekilince asistan kapanmaz, sağ altta küre
  // olarak (alttaki asıl küre) dinlemeye ve çalışmaya devam eder; küreye dokununca tam ekran döner, basılı tutunca kapanır.
  const [mini, setMini] = useState(false);
  const [wasOpen, setWasOpen] = useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (!open) setMini(false); // konuşma kapanınca bir sonraki açılış tam ekran
  }
  const active = open && !mini;
  // Kapanış ve küçülme animasyonu (Seyhun, 2026-10-17): tam ekran bir an daha çizilir, aşağı inerek kaybolur
  const [wasActive, setWasActive] = useState(active);
  const [leaving, setLeaving] = useState(false);
  if (wasActive !== active) {
    setWasActive(active);
    setLeaving(!active);
  }
  useEffect(() => {
    if (!leaving) return;
    const t = setTimeout(() => setLeaving(false), LEAVE_MS);
    return () => clearTimeout(t);
  }, [leaving]);
  const state = live.listening ? "listening" : live.busy || live.transcribing || live.booting ? "busy" : live.speaking ? "speaking" : "idle";

  const go = (fn) => () => {
    setMenu(false);
    fn();
  };
  // Oluştur menüsü gruplu (Seyhun: "artı düğmesinin içeriğini geliştirin, daha fazla özelliğimiz var", 2026-10-06): kişinin
  // görebildiği her hızlı oluşturma işi, ana sayfadaki İşlemler'le aynı izinlerle. Sayfanın kendi seçenekleri en üstte.
  const { profile } = useAuth();
  const { openMeeting } = useMeeting();
  const staff = profile?.role === "staff";
  const owner = profile?.role === "owner";
  const side = isAthleteSide(kind);
  // Sporcu ve öğrenci: asistan yok (veli eskisi gibi). Fitness sayfalarında da şimdilik yok (Seyhun, 2026-10-16:
  // "simdilik sesli asistani fitness sayfalarinda kullanmayacagiz"; program yapay zekayla sayfanın kendi düğmelerinden).
  const noAi = kind === "athlete" || kind === "student" || String(path || "").startsWith("/fitness");
  const athletes = canSeeAthletes(profile?.email);
  const to = (href) => () => router.push(href);
  const groups = [
    ["Kayıt", [
      ["cal", "Plan", "Tarih ve saat", () => openAdd({ type: "plan" })],
      ["task", "Görev", "Yapılacak iş", () => openAdd({ type: "task" })],
      ["note", "Not", "Kısa not", () => openAdd({ type: "note" })],
      ["cake", "Doğum günü", "Hatırlat", () => openBirthday()],
    ]],
    ["Kulüp", [
      athletes && ["checks", "Yoklama", "Bugün kim geldi", to("/athletes/attendance")],
      athletes && ["flag", "Yarış", "Yeni yarış", to("/athletes/races/new")],
      athletes && !side && ["trend", "Antrenman", "Günlüğe yaz", to("/training")],
      !staff && !side && ["box", "Envanter", "Ürün ekle", to("/inventory")],
    ]],
    ["Yönetim", [
      canReceipts(kind) && ["camera", "Fiş", "Fotoğrafla", () => openReceipt()],
      owner && ["receipt", "Fatura", "PDF ya da fotoğraf", to("/invoices")],
      !side && ["users", "Toplantı", "Sesli tutanak", () => openMeeting()],
      ["chat", "Mesaj", "Kişi ya da grup", to("/messages")],
    ]],
    ["Paylaş", [
      !staff && !side && ["instagram", "Instagram", "Gönderi hazırla", to("/posts/new")],
      !staff && !side && ["tent", "Etkinlik", "Kamp, gezi…", to("/events/new")],
      ["book", "Dersler", "Program", to("/schedule")],
    ]],
  ].map(([title, list]) => [title, list.filter(Boolean)]);
  // Sayfanın kendi seçenekleri ve sayfanın türü en üstte, vurgulu ("Bu sayfada"); aynı ad gruplarda tekrar etmez
  const own = cfg.create || [];
  const firstItem = groups.flatMap(([, l]) => l).find((b) => b[1] === cfg.first);
  const top = [...own, ...(firstItem && !own.some((o) => o[1] === firstItem[1]) ? [firstItem] : [])];
  const sections = [
    ...(top.length ? [["Bu sayfada", top.map((x) => [...x, true])]] : []),
    ...groups.map(([title, list]) => [title, list.filter((b) => !top.some((t) => t[1] === b[1]))]),
  ].filter(([, list]) => list.length);

  // Tek düğmenin işi duruma göre (VoiceLight'taki tablo)
  const talk = () => {
    if (open && mini) return setMini(false);
    if (active) {
      if (state === "listening") return act.current.stop?.();
      if (state === "busy") return act.current.abort?.();
      return act.current.listen?.(); // boşta ya da konuşurken: sözünü keser, dinler
    }
    openAssistant({ listen: true, dock: true, prefer: cfg.prefer, examples: cfg.ex, focus: cfg.focus });
  };
  // Bas-konuş: basınca dinle (kapalıysa açılır ve dinler; okuyorsa sözü kesilir); bırakınca gönder. Kısa dokunuş ya da
  // uzağa kaydırıp bırakma göndermez (asistan açık, boşta kalır: Fotoğraf · Yaz). İş sürerken kısa dokunuş durdurur.
  const press = () => {
    if (open && mini) setMini(false);
    if (!active) return openAssistant({ listen: true, dock: true, prefer: cfg.prefer, examples: cfg.ex, focus: cfg.focus });
    if (state === "busy") return;
    (act.current.press || act.current.listen)?.();
  };
  const release = ({ short, away }) => {
    if (state === "busy") return short && act.current.abort?.();
    if (short) return (act.current.release || act.current.cancel)?.(); // motor kısa basışı göndermez, mikrofonu kapatır
    if (away) return act.current.cancel?.();
    (act.current.release || act.current.stop)?.();
  };
  // Yazarak sor ("Şimdi sen dene" yönlendirmesi de kapanır)
  const typeNow = () => {
    window.dispatchEvent(new Event("sa-assistant-open"));
    setMini(false);
    setTyping(true);
  };

  return (
    <>
      <Dome
        noAi={noAi}
        bar={bar}
        slim={slim}
        rec={rec && !noAi}
        active={(active || leaving) && !noAi}
        leaving={leaving && !active}
        small={open && mini && !noAi}
        state={state}
        live={live}
        talk={talk}
        press={press}
        release={release}
        typeNow={typeNow}
        typing={typing}
        onTypingDone={() => (setTyping(false), setTypeInit(""))}
        cfg={cfg}
        onClose={() => act.current.close?.()}
        onMini={() => setMini(true)}
        voice={{
          cancel: () => act.current.cancel?.(),
          edit: () => act.current.edit?.(),
          stop: () => act.current.stop?.(),
          abort: () => act.current.abort?.(),
          send: () => act.current.send?.(),
          listen: () => act.current.listen?.(),
          // Fotoğrafı asistana ver: motor photoIn yayınlamadıysa düğme yok
          photo: act.current.photoIn ? (f) => act.current.photoIn(f) : undefined,
          // Bekleyen söze dokununca yazı kutusunda düzenlenir
          type: () => {
            setTypeInit(act.current.takeDraft?.() || "");
            typeNow();
          },
        }}
        typeInit={typeInit}
        setSlot={setSlot}
        path={path}
        unread={unreadTotal}
      />
      {open && mini && !noAi && (
        <MiniBubble
          state={state}
          live={live}
          orb={(!bar || wide) && !rec}
          tail={bar && !rec && !wide}
          bottom={rec ? "calc(var(--rec-h, 4rem) + 0.5rem)" : bar ? "calc(var(--dome-h, 5rem) + 1.25rem)" : "calc(env(safe-area-inset-bottom) + 1rem)"}
          onOpen={() => setMini(false)}
          onClose={() => act.current.close?.()}
        />
      )}
      {sideNav && wide && (
        <SideNav
          path={path}
          unread={unreadTotal}
          orb={
            noAi ? null : (
              <>
                <VoiceLight state={open && mini ? state : "idle"} onTap={talk} onHold={typeNow} size="size-12" compact />
                <button type="button" onClick={typeNow} className="min-w-0 flex-1 truncate rounded-xl px-2 py-2 text-left text-[0.875rem] font-medium text-fg hover:bg-fg/[.04]">
                  Yazarak sor
                </button>
              </>
            )
          }
        />
      )}
      <Sheet open={menu} onClose={() => setMenu(false)} title="Oluştur">
        <div className="space-y-4">
          {sections.map(([title, list]) => (
            <section key={title}>
              <h3 className="mb-1.5 px-1 text-[0.75rem] font-semibold uppercase tracking-wide text-mut">{title}</h3>
              <div className="grid grid-cols-2 gap-2">
                {list.map(([icon, label, desc, onClick, hi]) => (
                  <button
                    key={label}
                    type="button"
                    onClick={go(onClick)}
                    className={`flex items-center gap-2.5 rounded-2xl px-3 py-2.5 text-left transition active:scale-[.98] ${hi ? "bg-acc/10 ring-1 ring-acc/30" : "bg-bg"}`}
                  >
                    <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${hi ? "bg-deep text-white" : "bg-card text-acc"}`}>
                      <Icon name={icon} className="size-5" />
                    </span>
                    <span className="min-w-0">
                      <b className="block truncate text-[0.9375rem] font-semibold">{label}</b>
                      <small className="block truncate text-[0.75rem] text-mut">{desc}</small>
                    </span>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      </Sheet>
    </>
  );
}

// Yarış sayfası alt çubuksuz mu (yarıştan önce TabDock yok): sayfa "sa-plain" olayıyla bildirir; o zaman uygulamanın çubuğu görünür.
// Yüklenirken gizli kalır (yarış günü çubuk bir an görünüp kaybolmasın).
function usePlainPage() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const f = (e) => setOn(!!e.detail);
    window.addEventListener("sa-plain", f);
    return () => window.removeEventListener("sa-plain", f);
  }, []);
  return on;
}

// Uygulama yerleşiminde tek kez çizilir: sayfa değişince yeniden kurulmaz (geçişte titreme/zıplama olmaz).
// Her sayfada sekmelerle görünür (ana sayfadaki gibi), sohbet ekranında yalnız asistan çalışırken.
// Sekmeler görünürken sayfaların alt boşluğu kubbeye göre büyür (globals.css).
function Host() {
  const path = usePathname();
  const chat = useSearchParams().get("c");
  const { page } = useContext(DockCtx);
  const { setStageOn } = useAssistant();
  const race = isRace(path) || isPost(path) || isInv(path);
  // Kubbe her sayfada ana sayfadaki gibi: sekmeleri, büyük küresi, kaydırınca incelmesi aynı (Seyhun: "asistanın kubbenin
  // tasarımı diğer sayfalarda da aynı olsun", 2026-10-06). Önceden dört ana sekme dışında yalnız küreli ince hâliyle duruyordu.
  // Sohbet ekranında yok (kendi yazma satırı var). Yarış multimedya sayfasında da yok: sayfa tam ekran multimedya işlerine
  // ayrılır (Seyhun 2026-10-18), asistan yalnız çalışırken küre olarak görünür.
  // Yarış sayfası yarıştan önce kendi alt çubuğunu (TabDock) çizmez (Seyhun 2026-10-30, yaris-yapi): o zaman uygulamanın çubuğu görünür
  const plain = usePlainPage();
  const media = isMedia(path) && !(plain && /^\/athletes\/races\/(?!new$)[^/]+$/.test(path));
  const bar = !(path.startsWith("/messages") && chat) && !media;
  const slim = false;
  // Açık kayıt ekranı (AddSheet bildirir): { focus, examples } ya da null
  const [rec, setRec] = useState(null);
  useEffect(() => {
    const on = (e) => setRec(e.detail || null);
    window.addEventListener("sa-record-focus", on);
    return () => window.removeEventListener("sa-record-focus", on);
  }, []);
  useEffect(() => setStageOn(bar || !!rec), [bar, rec, setStageOn]);
  useEffect(() => {
    if (bar || slim) return;
    // Çubuk yokken sabit düğme şeritleri (Countdown Bar) önceki sayfanın çubuk yüksekliğinde havada kalmasın
    const r = document.documentElement.style;
    r.setProperty("--dome-h", "env(safe-area-inset-bottom)");
    r.setProperty("--stage-h", "env(safe-area-inset-bottom)");
  }, [bar, slim]);
  useEffect(() => {
    if (!bar && !slim) return;
    document.body.dataset.dock = "1";
    return () => delete document.body.dataset.dock;
  }, [bar, slim]);
  const cfg = rec
    ? { ph: "Bu kayıtla ilgili söyle…", ex: rec.examples, focus: rec.focus }
    : { ...(PAGES[path] || (isPost(path) ? POST : isInv(path) ? INV : race ? RACE : PAGES["/"])), ...Object.fromEntries(Object.entries(page || {}).filter(([, v]) => v != null && v !== "")) };
  return <TabBar cfg={cfg} bar={bar} slim={slim} rec={!!rec} sideNav={!media} />;
}
export function TabBarHost() {
  return (
    <Suspense fallback={null}>
      <Host />
    </Suspense>
  );
}
