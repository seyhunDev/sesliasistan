"use client";

import { Suspense, createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
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
import { useData } from "@/features/data/DataProvider";
import { useSpeech } from "@/hooks/useSpeech";
import { canReceipts } from "@/lib/kinds";
import { todayStr } from "@/lib/utils/format";
import { StageBrief } from "./StageBrief";

const HOLD_MS = 450; // basılı tutma: yazarak sor

// Sayfaya göre yazma satırı: ipucu, asistanın varsayılan kayıt türü (prefer), Oluştur'da öne çıkan seçenek, paneldeki örnekler.
// Kendi işi olan sayfalar (yoklama, dersler) useDock ile bunları değiştirir.
const PAGES = {
  "/": { ph: "Sor ya da ekle…", ex: ["Yarın saat 10'da antrenman ekle", "Bugün neler var?", "Yoklamayı aç"] },
  "/calendar": { ph: "Plan ekle ya da sor…", prefer: "plan", first: "Plan" },
  "/messages": { ph: "Birine mesaj gönder ya da sor…", ex: ["Ekibe yarın 9'da iskelede olun yaz", "Okunmamış mesajlar", "Yardım"] },
  "/plans": { ph: "Plan ekle ya da sor…", prefer: "plan", first: "Plan", ex: ["Bu hafta neler var?", "Yarın 10'da antrenman", "Cumartesi Çeşme'de yarış"] },
  "/tasks": { ph: "Görev ver ya da sor…", prefer: "task", first: "Görev", ex: ["Bugün neler var?", "Tekneleri hazırla", "Ali motoru kontrol etsin"] },
  "/notes": { ph: "Not al ya da sor…", prefer: "note", first: "Not", ex: ["Malzeme odası dolu", "3 numaranın dümeni gevşek", "Bu hafta neler var?"] },
  "/birthdays": { ph: "ör. Ayşe'nin doğum günü 12 Mart", first: "Doğum günü" },
  "/receipts": { ph: "Fişlerle ilgili sor…", first: "Fiş" },
  "/schedule": { ph: "ör. salı 13:00 fizik B-204", first: "Dersler" },
  "/athletes/attendance": { ph: "Ali ve Zeynep geldi…" },
};
const SHOWN = Object.keys(PAGES);

// Sayfanın kendi ayarı (ör. yoklama: yazılan doğrudan yoklamaya gider). Fonksiyonlar her çağrıda güncel hâliyle çalışır.
// cfg: { ph, prefer, onSend(text), onMic(), create: [[icon, label, desc, onClick]] } — create öğeleri Oluştur'da en üstte
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
  const hasSend = !!cfg.onSend;
  const hasMic = !!cfg.onMic;
  const createKey = (cfg.create || []).map((c) => c[1]).join("|");
  useEffect(() => {
    const page = {
      ph,
      prefer,
      onSend: hasSend ? (t) => ref.current.onSend?.(t) : null,
      onMic: hasMic ? () => ref.current.onMic?.() : null,
      create: createKey ? createKey.split("|").map((_, i) => [...ref.current.create[i].slice(0, 3), () => ref.current.create?.[i]?.[3]()]) : [],
    };
    setPage(page);
    return () => setPage((p) => (p === page ? null : p));
  }, [setPage, ph, prefer, hasSend, hasMic, createKey]);
}

// Yazma satırı (sahnenin içinde, koyu): yazı alanı · mikrofon (söyleneni kutuya yazar) · gönder
function Composer({ cfg, onDone }) {
  const { openAssistant } = useAssistant();
  const toast = useToast();
  const [text, setText] = useState("");
  const input = useRef(null);
  const sp = useSpeech({ onFinal: (t) => setText((p) => (p ? `${p} ${t}` : t)), onFail: (m) => toast(m) });
  const listening = sp.status === "listening";
  const keep = (e) => e.preventDefault(); // düğmeye basınca klavye kapanmasın
  useEffect(() => input.current?.focus(), []);

  const send = () => {
    const t = text.trim();
    if (!t) return input.current?.focus();
    setText("");
    input.current?.blur();
    onDone();
    if (cfg.onSend) cfg.onSend(t);
    else openAssistant({ text: t, prefer: cfg.prefer, examples: cfg.ex, dock: true });
  };

  return (
    <div className="flex h-12 items-center gap-1 rounded-2xl bg-white/10 pl-4 pr-1.5 ring-1 ring-white/15 focus-within:ring-white/40">
      {listening ? (
        <p className="min-w-0 flex-1 truncate text-[0.9375rem]">{`${sp.finalText || ""}${sp.interim || ""}` || <span className="text-white/60">Dinliyorum…</span>}</p>
      ) : (
        <input
          ref={input}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && send()}
          onBlur={() => setTimeout(() => !text.trim() && input.current !== document.activeElement && onDone(), 150)}
          placeholder={cfg.ph}
          aria-label={cfg.ph}
          enterKeyHint="send"
          autoCapitalize="sentences"
          className="min-w-0 flex-1 bg-transparent text-base text-[#f4f3ef] outline-none placeholder:text-[0.9375rem] placeholder:text-white/50"
        />
      )}
      <button type="button" onPointerDown={keep} onClick={() => (listening ? sp.stop("edit") : sp.start({ autoStop: 8000 }))} aria-label={listening ? "Bitti" : "Sesle yaz"} className="grid size-9 shrink-0 place-items-center rounded-full text-[#9cc3d3] active:bg-white/10">
        <Icon name={listening ? "check" : "mic"} className="size-[1.375rem]" />
      </button>
      <button type="button" onPointerDown={keep} onClick={send} disabled={!text.trim()} aria-label="Gönder" className="grid size-9 shrink-0 place-items-center rounded-full bg-[#f4f3ef] text-[#1f3a47] transition active:scale-90 disabled:opacity-35">
        <Icon name="up" className="size-5" />
      </button>
    </div>
  );
}

// Sahnedeki küre: dokun → konuş, basılı tut → yaz. Konuşurken ses dalgası, düşünürken döner.
function StageOrb({ onTap, onHold, state, size = "size-[4.75rem]", ring = "shadow-[0_0_0_9px_rgba(156,195,211,.14),0_0_0_18px_rgba(156,195,211,.06)]" }) {
  const t = useRef(null);
  const held = useRef(false);
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
      onPointerDown={down}
      onPointerUp={up}
      onPointerLeave={up}
      onContextMenu={(e) => e.preventDefault()}
      onClick={() => !held.current && onTap()}
      aria-label={state === "listening" ? "Bitti, gönder" : "Asistan: dokun konuş, basılı tut yaz"}
      className={`relative grid ${size} shrink-0 select-none place-items-center rounded-full bg-[#f4f3ef] text-[#1f3a47] ${ring} transition active:scale-95 [-webkit-touch-callout:none]`}
    >
      {state === "busy" ? (
        <span className="size-7 animate-spin rounded-full border-[3px] border-[#1f3a47]/20 border-t-[#1f3a47]" />
      ) : state === "listening" ? (
        <Icon name="check" className="size-8 [stroke-width:2.6]" />
      ) : (
        <span className={`flex h-6 items-end gap-[3px] ${state === "speaking" ? "[&>i]:animate-[softpulse_1s_ease-in-out_infinite]" : ""}`} aria-hidden="true">
          {[10, 17, 24, 15, 9].map((h, i) => (
            <i key={i} className="w-[3.5px] rounded-full bg-[#1f3a47]" style={{ height: h, animationDelay: `${i * 120}ms` }} />
          ))}
        </span>
      )}
    </button>
  );
}

function NavTab({ href, icon, label, active, badge, onClick }) {
  const cls = `relative flex min-w-14 flex-col items-center gap-1 rounded-xl px-2 py-1 transition active:scale-95 ${active ? "text-[#f4f3ef]" : "text-white/55"}`;
  const inner = (
    <>
      <span className="relative flex">
        <Icon name={icon} className="size-[1.375rem]" />
        {badge > 0 && <span className="absolute -right-2.5 -top-1.5 grid h-[1.125rem] min-w-[1.125rem] place-items-center rounded-full bg-rec px-1 text-[0.625rem] font-bold tabular-nums text-white">{badge > 99 ? "99+" : badge}</span>}
      </span>
      <span className={`text-[0.6875rem] ${active ? "font-bold" : "font-medium"}`}>{label}</span>
    </>
  );
  return href ? (
    <Link href={href} aria-current={active ? "page" : undefined} className={cls}>
      {inner}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}

const hello = () => {
  const h = new Date().getHours();
  return h < 5 ? "İyi geceler" : h < 12 ? "Günaydın" : h < 18 ? "İyi günler" : "İyi akşamlar";
};

// ASİSTAN SAHNESİ: tüm uygulamada altta geniş, koyu alan. Boşta selam, günün özeti, öneriler, büyük küre ve sekmeler;
// ana sayfada ayrıca Sıradaki plan ve "Senin için" (StageBrief). Konuşurken dinleme ve cevap burada akar, sayfa soluklaşır;
// kart/taslak/onay gerekince asistan tam açılır.
// Sayfa aşağı kaydırılınca ya da sayfaya dokununca sahne küçülür (elle kullanım); en üste geri kaydırınca, küreye ya da
// tutamağa dokununca büyür. Boyut değişimi yükseklik geçişiyle yumuşak; geçiş sırasında gelen kaydırma olayları
// (sayfa kısalınca tarayıcının kaydırmayı geri çekmesi) yok sayılır, yoksa kısa sayfalarda (takvim) sahne
// küçülüp büyüyerek titrer.
export function TabBar({ cfg }) {
  const path = usePathname();
  const router = useRouter();
  const { openAssistant, live, act } = useAssistant();
  const { openAdd } = useAdd();
  const { openReceipt } = useReceipt();
  const { openBirthday } = useBirthday();
  const { unreadTotal } = useChat();
  const { plans, tasks } = useData();
  const { profile } = useAuth();
  const [menu, setMenu] = useState(false);
  const [typing, setTyping] = useState(false);
  const [small, setSmall] = useState(false);
  const [atPath, setAtPath] = useState(path);
  const [h, setH] = useState(null); // içeriğin ölçülen yüksekliği (geçiş için)
  const kind = useKind();
  const box = useRef(null);
  const inner = useRef(null);
  const quietUntil = useRef(0); // bu ana kadar kaydırma olayları sahnenin boyunu değiştirmez

  // Yeni sayfaya geçince sahne büyük başlar
  if (atPath !== path) {
    setAtPath(path);
    setSmall(false);
  }

  const active = !!(live.open && live.docked);
  const state = live.listening ? "listening" : live.busy || live.transcribing || live.booting ? "busy" : live.speaking ? "speaking" : "idle";
  const big = active || typing || !small;
  const mode = active ? "active" : typing ? "typing" : big ? "big" : "small";

  // İçerik değişince yükseklik eski değerden yenisine kayar (height geçişi; içerik yumuşakça belirir)
  useLayoutEffect(() => {
    const el = inner.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      quietUntil.current = Date.now() + 450;
      setH(el.offsetHeight);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // Sayfanın alt boşluğu sahnenin yüksekliği kadar (içerik sahnenin altında kalmasın). Geçiş bitince bir kez yazılır:
  // her karede yazılırsa sayfa her karede yeniden dizilir (iPhone'da takılma).
  useEffect(() => {
    const el = box.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    let t;
    const ro = new ResizeObserver(() => {
      clearTimeout(t);
      t = setTimeout(() => {
        quietUntil.current = Math.max(quietUntil.current, Date.now() + 300);
        document.documentElement.style.setProperty("--stage-h", `${el.offsetHeight}px`);
      }, 320);
    });
    ro.observe(el);
    return () => {
      clearTimeout(t);
      ro.disconnect();
    };
  }, []);
  // Elle kullanım: aşağı kaydırınca ya da sayfaya dokununca küçül; en üste geri kaydırınca büyü
  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      const d = y - last;
      last = y;
      if (Date.now() < quietUntil.current) return;
      if (d > 0 && y > 40) setSmall(true);
      else if (d < 0 && y <= 8) setSmall(false);
    };
    const onDown = (e) => !box.current?.contains(e.target) && !e.target.closest?.("[role=dialog]") && setSmall(true);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointerdown", onDown);
    };
  }, []);
  // iPhone: klavye açılınca sabit alt alan klavyenin arkasında kalır; yazarken sahne klavyenin üstüne taşınır
  useEffect(() => {
    const vv = window.visualViewport;
    const el = box.current;
    if (!typing || !vv || !el) return;
    const fit = () => {
      const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      el.style.transform = kb > 40 ? `translate3d(0,${-kb}px,0)` : "";
    };
    fit();
    vv.addEventListener("resize", fit);
    vv.addEventListener("scroll", fit);
    return () => {
      vv.removeEventListener("resize", fit);
      vv.removeEventListener("scroll", fit);
      el.style.transform = "";
    };
  }, [typing]);

  const go = (fn) => () => {
    setMenu(false);
    fn();
  };
  const base = [
    ["cal", "Plan", "Tarih ve saat", () => openAdd({ type: "plan" })],
    ["task", "Görev", "Yapılacak iş", () => openAdd({ type: "task" })],
    ["note", "Not", "Kısa not", () => openAdd({ type: "note" })],
    canReceipts(kind) && ["camera", "Fiş", "Fotoğrafla", () => openReceipt()],
    ["cake", "Doğum günü", "Hatırlat", () => openBirthday()],
    ["book", "Dersler", "Program", () => router.push("/schedule")],
  ].filter(Boolean);
  // Sayfanın kendi seçenekleri ve sayfanın türü en üstte, vurgulu
  const own = cfg.create || [];
  const firstItem = base.find((b) => b[1] === cfg.first);
  const top = [...own, ...(firstItem && !own.some((o) => o[1] === firstItem[1]) ? [firstItem] : [])];
  const items = [...top.map((x) => [...x, true]), ...base.filter((b) => !top.some((t) => t[1] === b[1]))];

  const talk = () => {
    setSmall(false);
    if (active) return live.listening ? act.current.stop?.() : act.current.listen?.();
    if (cfg.onMic) return cfg.onMic();
    openAssistant({ listen: true, dock: true, prefer: cfg.prefer, examples: cfg.ex });
  };
  // Yazarak sor: sahnede yazı alanı açılır ("Şimdi sen dene" yönlendirmesi de kapanır)
  const typeNow = () => {
    window.dispatchEvent(new Event("sa-assistant-open"));
    setTyping(true);
  };
  const ask = (t) => (cfg.onSend ? cfg.onSend(t) : openAssistant({ text: t, dock: true, prefer: cfg.prefer, examples: cfg.ex }));
  const today = todayStr();
  const todays = plans.filter((p) => p.date <= today && (p.endDate || p.date) >= today).length;
  const late = tasks.filter((t) => !t.done && t.due && t.due < today).length;
  const summary = [todays ? `Bugün ${todays} plan var` : "Bugün plan yok", late ? `${late} görev gecikmiş` : ""].filter(Boolean).join(", ") + ".";
  const chips = cfg.ex || ["Bugün neler var?", "Yarın 10'da antrenman ekle", "Ekibe yaz"];
  const first = (profile?.name || "").split(" ")[0];

  return (
    <>
      {/* Asistan çalışırken sayfa soluklaşır (dokunuşları engellemez) */}
      <div aria-hidden="true" className={`pointer-events-none fixed inset-0 z-[19] bg-bg transition-opacity duration-300 ${active && state !== "idle" ? "opacity-60" : "opacity-0"}`} />
      <nav ref={box} aria-label="Asistan ve menü" className="fixed inset-x-0 bottom-0 z-20 [-webkit-backface-visibility:hidden]">
        <div className="mx-auto max-w-[30rem] rounded-t-[1.75rem] bg-[#1f3a47] px-5 pt-2.5 pb-[calc(0.5rem+env(safe-area-inset-bottom))] text-[#f4f3ef] shadow-[0_-20px_50px_-20px_rgba(20,30,36,.55)]">
          <button type="button" onClick={() => setSmall((v) => !v)} aria-label={big ? "Asistanı küçült" : "Asistanı büyüt"} className="mx-auto mb-1 block h-5 w-16">
            <span className="mx-auto block h-1 w-10 rounded-full bg-white/25" />
          </button>

          {/* Yükseklik geçişi: dış kutu ölçülen yüksekliğe kayar, içerik kendi boyunda kalır (kırpılır) */}
          <div style={h == null ? undefined : { height: h }} className="-mx-5 overflow-hidden px-5 transition-[height] duration-300 ease-[cubic-bezier(.22,.8,.24,1)] motion-reduce:transition-none">
            <div ref={inner}>
              {mode === "active" ? (
                /* Asistan konuşuyor: duyulan ya da son cevap büyük yazıyla; kontrol düğmeleri */
                <div key="active" className="stage-in space-y-3 pb-2">
                  <p className={`text-[0.6875rem] font-bold uppercase tracking-[.12em] ${state === "listening" ? "text-[#f0a8a2]" : "text-[#9cc3d3]"}`}>
                    {state === "listening" ? "● Dinliyorum" : state === "busy" ? "Düşünüyorum" : "Asistan"}
                  </p>
                  <p className="line-clamp-4 text-[1.25rem] font-semibold leading-snug tracking-tight">
                    {state === "listening" ? live.heard || <span className="text-white/55">Söyle, dinliyorum…</span> : state === "busy" ? live.heard || "…" : live.lastReply || "Buradayım, söyle."}
                  </p>
                  <div className="flex items-center justify-between pt-1">
                    <button type="button" onClick={() => act.current.close?.()} className="flex h-11 items-center gap-1.5 rounded-full px-3 text-[0.875rem] font-medium text-white/70 active:bg-white/10">
                      <Icon name="x" className="size-[1.125rem]" /> Kapat
                    </button>
                    <StageOrb state={state} onTap={talk} onHold={typeNow} size="size-16" ring="shadow-[0_0_0_8px_rgba(156,195,211,.14)]" />
                    <button type="button" onClick={() => act.current.expand?.()} className="flex h-11 items-center gap-1.5 rounded-full px-3 text-[0.875rem] font-medium text-white/70 active:bg-white/10">
                      Ayrıntı <Icon name="chev" className="size-4 -rotate-90" />
                    </button>
                  </div>
                </div>
              ) : mode === "typing" ? (
                <div key="typing" className="stage-in pb-2">
                  <Composer cfg={cfg} onDone={() => setTyping(false)} />
                </div>
              ) : mode === "big" ? (
                /* Boşta: selam, günün özeti, (ana sayfada) sıradaki ve senin için, öneriler, küre */
                <div key="big" className="stage-in space-y-3.5 pb-4">
                  <div>
                    <p className="text-[0.6875rem] font-bold uppercase tracking-[.12em] text-[#9cc3d3]">Asistan</p>
                    <p className="mt-1 text-[1.25rem] font-semibold leading-snug tracking-tight">
                      {hello()}
                      {first ? ` ${first}` : ""}. <span className="font-medium text-white/65">{summary}</span>
                    </p>
                  </div>
                  {path === "/" && <StageBrief />}
                  <div className="-mx-5 flex gap-2 overflow-x-auto px-5 [scrollbar-width:none]">
                    {chips.map((c) => (
                      <button key={c} type="button" onClick={() => ask(c)} className="shrink-0 rounded-full bg-white/10 px-3.5 py-2 text-[0.8125rem] ring-1 ring-white/15 active:bg-white/20">
                        {c}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <button type="button" onClick={typeNow} aria-label="Yazarak sor" className="grid size-12 place-items-center rounded-full bg-white/10 active:bg-white/20">
                      <Icon name="keyboard" className="size-[1.375rem]" />
                    </button>
                    <StageOrb state={state} onTap={talk} onHold={typeNow} />
                    <button type="button" onClick={() => setMenu(true)} aria-label="Oluştur" className="grid size-12 place-items-center rounded-full bg-white/10 active:bg-white/20">
                      <Icon name="plus" className="size-6" />
                    </button>
                  </div>
                </div>
              ) : (
                /* Küçük: tek satır, küre ve kısa ipucu */
                <div key="small" className="stage-in flex items-center gap-3 pb-2">
                  <StageOrb state={state} onTap={talk} onHold={typeNow} size="size-12" ring="shadow-[0_0_0_6px_rgba(156,195,211,.14)]" />
                  <button type="button" onClick={() => setSmall(false)} className="min-w-0 flex-1 truncate text-left text-[0.9375rem] text-white/75">
                    {cfg.ph}
                  </button>
                  <button type="button" onClick={typeNow} aria-label="Yazarak sor" className="grid size-11 place-items-center rounded-full bg-white/10">
                    <Icon name="keyboard" className="size-5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="mt-1 flex items-start justify-around border-t border-white/10 pt-2">
            <NavTab href="/" icon="home" label="Ana sayfa" active={path === "/"} />
            <NavTab href="/calendar" icon="cal" label="Takvim" active={path === "/calendar"} />
            <NavTab href="/messages" icon="chat" label="Mesajlar" active={path === "/messages"} badge={unreadTotal} />
            <NavTab href="/tasks" icon="task" label="Görevler" active={path === "/tasks"} />
          </div>
        </div>
      </nav>
      <Sheet open={menu} onClose={() => setMenu(false)} title="Oluştur">
        <div className="grid grid-cols-2 gap-2.5">
          {items.map(([icon, label, desc, onClick, hi]) => (
            <button
              key={label}
              type="button"
              onClick={go(onClick)}
              className={`flex items-center gap-2.5 rounded-2xl px-3 py-3 text-left transition active:scale-[.98] ${hi ? "bg-acc/10 ring-1 ring-acc/30" : "bg-bg"}`}
            >
              <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${hi ? "bg-[#2c5163] text-white" : "bg-card text-acc"}`}>
                <Icon name={icon} className="size-5" />
              </span>
              <span className="min-w-0">
                <b className="block truncate text-[0.9375rem] font-semibold">{label}</b>
                <small className="block truncate text-[0.75rem] text-mut">{desc}</small>
              </span>
            </button>
          ))}
        </div>
      </Sheet>
    </>
  );
}

// Uygulama yerleşiminde tek kez çizilir: sayfa değişince yeniden kurulmaz (geçişte titreme/zıplama olmaz).
// PAGES'teki sayfalarda görünür; sohbet ekranında gizlenir. Görünürken sayfaların alt boşluğu çubuğa göre büyür (globals.css).
function Host() {
  const path = usePathname();
  const chat = useSearchParams().get("c");
  const { page } = useContext(DockCtx);
  const { setStageOn } = useAssistant();
  const show = SHOWN.includes(path) && !(path === "/messages" && chat);
  useEffect(() => {
    setStageOn(show);
    if (!show) return;
    document.body.dataset.dock = "1";
    return () => delete document.body.dataset.dock;
  }, [show, setStageOn]);
  if (!show) return null;
  const cfg = { ...PAGES[path], ...Object.fromEntries(Object.entries(page || {}).filter(([, v]) => v != null && v !== "")) };
  return <TabBar cfg={cfg} />;
}
export function TabBarHost() {
  return (
    <Suspense fallback={null}>
      <Host />
    </Suspense>
  );
}
