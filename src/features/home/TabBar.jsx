"use client";

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
import { ListenWave } from "@/features/speech/ListenWave";
import { useSpeech } from "@/hooks/useSpeech";
import { canReceipts } from "@/lib/kinds";

const HOLD_MS = 450; // basılı tutma: yazarak sor

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
  "/training": { ph: "Antrenmanı anlat, günlüğe yazayım…", ex: ["Dün 14 knot poyrazda start ve tramola çalıştık, 2 saat sürdü", "Bugünkü antrenman çok iyi geçti, Ali ve Ayşe geldi", "Antrenman günlüğünü aç"] },
};
const TABS = ["/", "/calendar", "/messages", "/tasks"];
// Tek yarış sayfası: kubbe sekmesiz görünür (sayfanın kendi alt çubuğu kubbenin üstüne oturur, globals.css)
const RACE = { ph: "Bu yarışla ilgili söyle…", ex: ["Mehmet'i de ekle", "Not al: otel rezervasyonu yapılacak", "Bütçeye otel kişi başı 3500 ekle"] };
const isRace = (path) => path.startsWith("/athletes/races/");
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
    openAssistant({ text: t, prefer: cfg.prefer, examples: cfg.ex, focus: cfg.focus, dock: true });
  };

  return (
    <div className="flex h-12 items-center gap-1 rounded-2xl bg-card pl-4 pr-1.5 ring-1 ring-line focus-within:ring-acc/40">
      {listening ? (
        <p className="min-w-0 flex-1 truncate text-[0.9375rem]">{`${sp.finalText || ""}${sp.interim || ""}` || <span className="text-mut">Dinliyorum…</span>}</p>
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
          className="min-w-0 flex-1 bg-transparent text-base text-fg outline-none placeholder:text-[0.9375rem] placeholder:text-mut"
        />
      )}
      <button type="button" onPointerDown={keep} onClick={() => (listening ? sp.stop("edit") : sp.start({ autoStop: 8000 }))} aria-label={listening ? "Bitti" : "Sesle yaz"} className="grid size-9 shrink-0 place-items-center rounded-full text-acc active:bg-line/50">
        <Icon name={listening ? "check" : "mic"} className="size-[1.375rem]" />
      </button>
      <button type="button" onPointerDown={keep} onClick={send} disabled={!text.trim()} aria-label="Gönder" className="grid size-9 shrink-0 place-items-center rounded-full bg-acc text-white transition active:scale-90 disabled:opacity-35">
        <Icon name="up" className="size-5" />
      </button>
    </div>
  );
}

// Dinlerken söylediğin canlı belirir (sağda, büyük ve sade). Henüz kelime yokken hiçbir yazı yok: dinlediğini ses ışığı
// anlatır. Gönderilince asıl balon (AssistantSheet) yerini alır.
// solo: konuşmanın ilk sözü; alanın ortasında, büyük yazıyla (boş alan anlamlı dolsun)
export function Hearing({ text, listening, solo }) {
  if (solo)
    return (
      <div className="fade-in flex min-h-[9rem] flex-1 items-center justify-center px-2 text-center" aria-live="polite">
        <p className={`text-[1.625rem] font-semibold leading-tight tracking-tight ${text ? "text-fg" : "text-mut"}`}>
          {text}
        </p>
      </div>
    );
  return (
    <div data-hearing="" className="fade-in mt-4 flex justify-end" aria-live="polite">
      <p className={`max-w-[85%] text-right text-[1.125rem] font-medium leading-snug tracking-tight ${text ? "text-fg" : "text-mut"}`}>
        {text}
        {listening && <span className="ml-1 inline-block h-[1.1em] w-[2px] translate-y-[3px] animate-pulse rounded-full bg-acc" aria-hidden="true" />}
      </p>
    </div>
  );
}

// SES IŞIĞI (kubbenin tepesindeki tek düğme, simgesiz): disk, içinde ses dalgası (globals.css .vlight). Durum yazıyla
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
export function VoiceLight({ onTap, onHold, state, level = 0, size = "size-[4.875rem]" }) {
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
      data-state={state}
      onPointerDown={down}
      onPointerUp={up}
      onPointerLeave={up}
      onContextMenu={(e) => e.preventDefault()}
      onClick={() => !held.current && onTap()}
      aria-label={LIGHT_LABEL[state] || LIGHT_LABEL.idle}
      style={{ "--lvl": state === "listening" ? level : 0 }}
      className={`vlight ${size} shrink-0 select-none active:scale-95 [-webkit-touch-callout:none]`}
    >
      <span className="vl-halo" aria-hidden="true" />
      <span className="vl-ring" aria-hidden="true" />
      <span className="vl-disc" aria-hidden="true" />
      {state === "listening" ? (
        <ListenWave round />
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

function NavTab({ href, icon, label, active, badge, mini }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      aria-label={mini ? label : undefined}
      className={`relative flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl py-1 transition active:scale-95 ${active ? "text-white" : "text-white/60"}`}
    >
      <span className="relative flex">
        <Icon name={icon} className="size-[1.375rem]" />
        {badge > 0 && <span className="absolute -right-2.5 -top-1.5 grid h-[1.125rem] min-w-[1.125rem] place-items-center rounded-full bg-rec px-1 text-[0.625rem] font-bold tabular-nums text-white ring-2 ring-[#25685a]">{badge > 99 ? "99+" : badge}</span>}
      </span>
      {!mini && <span className={`text-[0.6875rem] ${active ? "font-bold" : "font-medium"}`}>{label}</span>}
    </Link>
  );
}

// KUBBE: tek asistan görünümü. Boştayken altta sabit (iki kenara uzanır, alt güvenli alanı da kaplar): üstte
// yaz · ses ışığı · oluştur, altta sekmeler. Asistan çalışınca sekmeler çekilir, konuşma kubbenin içinde akar ve kubbe
// içerik kadar yükselir (yay hep üstte). Yazarken kubbe klavyenin üstüne taşınır. Çubuksuz sayfalarda (ayarlar,
// sohbet ekranı…) yalnız asistan çalışırken görünür. rec: plan/görev/not ekranı açık (AddSheet); kubbe o ekranın üstünde
// sekmesiz ve Oluştur'suz görünür, asistan o kaydı bilir (focus).
const noop = () => () => {};
const ghost = "grid size-11 place-items-center rounded-full bg-white/10 text-white ring-1 ring-white/15 transition active:scale-90 active:bg-white/20";
function Dome({ bar, rec, active, state, live, talk, typeNow, typing, onTypingDone, cfg, onClose, onMenu, setSlot, path, unread }) {
  const client = useSyncExternalStore(noop, () => true, () => false);
  const box = useRef(null);
  const inner = useRef(null);
  const pane = useRef(null);
  const userUp = useRef(false);
  const shown = bar || rec || active || typing;
  // Boştayken sayfa aşağı kaydırılınca kubbe ince çubuğa iner (küçük küre, sekmesiz); yukarı kaydırınca, sayfanın başına
  // dönünce ya da kubbeye dokununca eski hâline döner. Sayfanın alt boşluğu (--stage-h) büyük boyda kalır, içerik zıplamaz.
  const idle = bar && !rec && !active && !typing;
  const [mini, setMini] = useState(false);
  const small = idle && mini;
  // Küçülüp büyürken satır ve küre kendi geçişiyle (0,5 sn) boy değiştirir; kubbe her karede onları birebir izler (kendi
  // yükseklik geçişi o sırada kapalı, yoksa kubbe geride kalıp küre taşıyordu)
  const [follow, setFollow] = useState(false);
  const firstSmall = useRef(true);
  useEffect(() => {
    if (firstSmall.current) return void (firstSmall.current = false);
    setFollow(true);
    const t = setTimeout(() => setFollow(false), 600);
    return () => clearTimeout(t);
  }, [small]);
  useEffect(() => {
    if (!idle) return;
    let last = window.scrollY;
    let run = 0;
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const y = Math.max(0, Math.min(max, window.scrollY)); // iPhone'un esneme kaymasını sayma
      const dy = y - last;
      last = y;
      if (y < 60) return setMini(false);
      run = Math.sign(dy) === Math.sign(run) ? run + dy : dy;
      if (run > 24) setMini(true);
      else if (run < -16) setMini(false);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      setMini(false);
    };
  }, [idle, path]);

  // Yükseklik içeriği izler (kubbe içerikle birlikte büyür/küçülür; geçiş CSS'te). Boştaki yükseklik sayfanın alt boşluğu olur.
  useLayoutEffect(() => {
    const o = box.current;
    const i = inner.current;
    if (!o || !i) return;
    const set = () => {
      const h = shown ? i.offsetHeight : 0;
      o.style.height = `${h}px`;
      if (bar && !rec && !active && !typing) document.documentElement.style.setProperty("--dome-h", `${h}px`);
      if (bar && !rec && !active && !typing && !small) document.documentElement.style.setProperty("--stage-h", `${h}px`);
      if (rec && !active && !typing) document.documentElement.style.setProperty("--rec-h", `${h}px`);
    };
    set();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(set);
    ro.observe(i);
    return () => ro.disconnect();
  }, [shown, bar, rec, active, typing, small, client]);

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

  const heard = active && (state === "listening" || live.transcribing) && live.heard; // gönderilirken de yazı kalır
  return (
    <div
      ref={box}
      data-dome=""
      data-state={active ? state : "idle"}
      data-on={active ? "" : undefined}
      data-mini={small ? "" : undefined}
      data-follow={follow ? "" : undefined}
      role="region"
      aria-label="Asistan"
      style={{ "--lvl": active ? live.level || 0 : 0 }}
      className={`dome dome-rise fixed inset-x-0 bottom-0 ${rec ? "z-[55]" : "z-[38]"} h-0 overflow-hidden ${shown ? "visible" : "invisible [transition:height_.5s_cubic-bezier(.22,.8,.24,1),visibility_0s_.5s]"}`}
    >
      <span className="dome-glow" aria-hidden="true" />
      <svg className="dome-rim" viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden="true">
        <path className="rim" d="M0 10 A50 10 0 0 1 100 10" />
        <path className="flow" d="M0 10 A50 10 0 0 1 100 10" />
      </svg>
      <div ref={inner} className="absolute inset-x-0 bottom-0" onClick={small ? (e) => !e.target.closest("button") && setMini(false) : undefined}>
        <div className={`mx-auto w-full max-w-[30rem] px-4 pb-[max(0.25rem,calc(env(safe-area-inset-bottom)-1.25rem))] ${small ? "pt-1.5" : idle ? "pt-2" : "pt-3"}`}>
          {active && (
            <div
              ref={pane}
              className={`${state === "listening" ? "max-h-[calc(var(--vvh,100dvh)-env(safe-area-inset-top)-13.75rem)]" : "max-h-[calc(var(--vvh,100dvh)-env(safe-area-inset-top)-11.5rem)]"} overflow-y-auto overscroll-contain px-1 pt-3 [mask-image:linear-gradient(to_bottom,transparent,#000_1.25rem)] [scrollbar-width:none]`}
            >
              <div className="pb-3">
                <div ref={setSlot} />
                {heard && <Hearing text={live.heard} listening={state === "listening"} solo={!live.talked} />}
              </div>
            </div>
          )}
          {typing ? (
            <div className="stage-in pb-2 pt-1">
              <Composer cfg={cfg} onDone={onTypingDone} />
            </div>
          ) : idle ? (
            // Boşta tek satır: iki sekme · küre · iki sekme. Yazmak için küreye basılı tut; Oluştur asistan açılınca.
            <div className={`flex ${small ? "h-14" : "h-[5.25rem]"} items-center transition-[height] duration-500 ease-[cubic-bezier(.22,.8,.24,1)]`}>
              <nav aria-label="Sekmeler" className="flex min-w-0 flex-1 items-center">
                <NavTab href="/" icon="home" label="Ana sayfa" active={path === "/"} mini={small} />
                <NavTab href="/calendar" icon="cal" label="Takvim" active={path === "/calendar"} mini={small} />
              </nav>
              <span className="shrink-0 px-1.5">
                <VoiceLight state="idle" level={0} onTap={talk} onHold={typeNow} size={small ? "size-12" : "size-[4.875rem]"} />
              </span>
              <nav aria-label="Sekmeler" className="flex min-w-0 flex-1 items-center">
                <NavTab href="/messages" icon="chat" label="Mesajlar" active={path === "/messages"} badge={unread} mini={small} />
                <NavTab href="/tasks" icon="task" label="Görevler" active={path === "/tasks"} mini={small} />
              </nav>
            </div>
          ) : (
            <div className="relative flex h-[5.25rem] items-center justify-between px-1">
              <span className="flex gap-2">
                <button type="button" onClick={typeNow} aria-label="Yazarak sor" className={ghost}>
                  <Icon name="keyboard" className="size-[1.375rem]" />
                </button>
                {!rec && (
                  <button type="button" onClick={onMenu} aria-label="Oluştur" className={ghost}>
                    <Icon name="plus" className="size-6" />
                  </button>
                )}
              </span>
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                <VoiceLight state={active ? state : "idle"} level={live.level} onTap={talk} onHold={typeNow} size={active ? "size-[5.25rem]" : "size-[4.875rem]"} />
              </span>
              {active ? (
                <button type="button" onClick={onClose} aria-label="Konuşmayı bitir" className={ghost}>
                  <Icon name="x" className="size-[1.375rem]" />
                </button>
              ) : (
                <span className="size-11" aria-hidden="true" />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Alt kubbe + Oluştur menüsü. bar: bu sayfada sekmeler görünür (değilse kubbe yalnız asistan çalışırken çıkar).
export function TabBar({ cfg, bar, rec = false }) {
  const path = usePathname();
  const router = useRouter();
  const { openAssistant, live, act, setSlot } = useAssistant();
  const { openAdd } = useAdd();
  const { openReceipt } = useReceipt();
  const { openBirthday } = useBirthday();
  const { unreadTotal } = useChat();
  const [menu, setMenu] = useState(false);
  const [typing, setTyping] = useState(false);
  // Yazarken de sayfanın alt düğme çubuğu gizlenir (globals.css)
  useEffect(() => {
    if (!typing) return;
    document.body.dataset.typing = "1";
    return () => delete document.body.dataset.typing;
  }, [typing]);
  const kind = useKind();

  const active = !!live.open;
  const state = live.listening ? "listening" : live.busy || live.transcribing || live.booting ? "busy" : live.speaking ? "speaking" : "idle";

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

  // Tek düğmenin işi duruma göre (VoiceLight'taki tablo)
  const talk = () => {
    if (active) {
      if (state === "listening") return act.current.stop?.();
      if (state === "busy") return act.current.abort?.();
      return act.current.listen?.(); // boşta ya da konuşurken: sözünü keser, dinler
    }
    openAssistant({ listen: true, dock: true, prefer: cfg.prefer, examples: cfg.ex, focus: cfg.focus });
  };
  // Yazarak sor ("Şimdi sen dene" yönlendirmesi de kapanır)
  const typeNow = () => {
    window.dispatchEvent(new Event("sa-assistant-open"));
    setTyping(true);
  };

  return (
    <>
      <Dome
        bar={bar}
        rec={rec}
        active={active}
        state={state}
        live={live}
        talk={talk}
        typeNow={typeNow}
        typing={typing}
        onTypingDone={() => setTyping(false)}
        cfg={cfg}
        onClose={() => act.current.close?.()}
        onMenu={() => {
          act.current.close?.(); // Oluştur menüsü açılınca konuşma kapanır
          setMenu(true);
        }}
        setSlot={setSlot}
        path={path}
        unread={unreadTotal}
      />
      {!bar && !rec && !active && !typing && !path.startsWith("/messages") && (
        // Sekmesiz sayfalarda ana asistan sağ altta küçük küre: dokun konuş, basılı tut yaz; açılınca kubbe alttan yükselir
        <div data-fab="" className="fade-in fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] right-4 z-30 grid place-items-center rounded-full bg-[linear-gradient(180deg,#33876f,#1f5a4b)] p-1 shadow-[0_12px_28px_-12px_rgba(20,70,56,.7)] transition-[bottom] duration-300">
          <VoiceLight state="idle" onTap={talk} onHold={typeNow} size="size-[3.25rem]" />
        </div>
      )}
      <Sheet open={menu} onClose={() => setMenu(false)} title="Oluştur">
        <div className="grid grid-cols-2 gap-2.5">
          {items.map(([icon, label, desc, onClick, hi]) => (
            <button
              key={label}
              type="button"
              onClick={go(onClick)}
              className={`flex items-center gap-2.5 rounded-2xl px-3 py-3 text-left transition active:scale-[.98] ${hi ? "bg-acc/10 ring-1 ring-acc/30" : "bg-bg"}`}
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
      </Sheet>
    </>
  );
}

// Uygulama yerleşiminde tek kez çizilir: sayfa değişince yeniden kurulmaz (geçişte titreme/zıplama olmaz).
// Dört ana sekmede sekmelerle görünür; diğerlerinde (sohbet ekranı dahil) yalnız asistan çalışırken, boşta sağ altta küre.
// Sekmeler görünürken sayfaların alt boşluğu kubbeye göre büyür (globals.css).
function Host() {
  const path = usePathname();
  const chat = useSearchParams().get("c");
  const { page } = useContext(DockCtx);
  const { setStageOn } = useAssistant();
  const race = isRace(path) || isPost(path) || isInv(path);
  // Kubbe (sekmelerle) yalnız dört ana sekmede; diğer sayfalarda asistan sağ altta küçük küre (TabBar)
  const bar = TABS.includes(path) && !(path === "/messages" && chat);
  // Açık kayıt ekranı (AddSheet bildirir): { focus, examples } ya da null
  const [rec, setRec] = useState(null);
  useEffect(() => {
    const on = (e) => setRec(e.detail || null);
    window.addEventListener("sa-record-focus", on);
    return () => window.removeEventListener("sa-record-focus", on);
  }, []);
  useEffect(() => setStageOn(bar || !!rec), [bar, rec, setStageOn]);
  useEffect(() => {
    if (!bar) return;
    document.body.dataset.dock = "1";
    return () => delete document.body.dataset.dock;
  }, [bar]);
  const cfg = rec
    ? { ph: "Bu kayıtla ilgili söyle…", ex: rec.examples, focus: rec.focus }
    : { ...(PAGES[path] || (isPost(path) ? POST : isInv(path) ? INV : race ? RACE : PAGES["/"])), ...Object.fromEntries(Object.entries(page || {}).filter(([, v]) => v != null && v !== "")) };
  return <TabBar cfg={cfg} bar={bar} rec={!!rec} />;
}
export function TabBarHost() {
  return (
    <Suspense fallback={null}>
      <Host />
    </Suspense>
  );
}
