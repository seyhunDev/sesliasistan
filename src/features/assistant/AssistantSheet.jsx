"use client";
// Asistanın ekranı: sohbet, kartlar, düğmeler. Durum ve beyin useAssistant.js, işler isler/, beyin/.
import { createPortal } from "react-dom";
import { Icon } from "@/components/ui/Icon";
import { Thread } from "@/features/add/Thread";
import { rel } from "@/lib/utils/format";
import { shareGroup } from "@/lib/cancelPlan";
import { PastSessions } from "./PastSessions";
import { ATT_LABEL } from "@/features/athletes/assistAttendance";
import { PAGES, describeAction } from "@/lib/assistantLocal";
import { RecordList } from "./RecordList";
import { Avatar } from "@/features/chat/bits";
import { PersonCard } from "@/features/people/PersonCard";
import { EventCard } from "@/features/events/EventCard";
import { InvCard } from "@/features/inventory/InvCard";
import { waTo } from "./isler/ortak";
import { useAssistant, SILENCE_MS, KIND_ICON } from "./useAssistant";
import { devOn } from "@/lib/assistTiming";

export function AssistantSheet({ open, onClose, seed, onLive, onAct, slot }) {
  const { auto, busy, cancelPending, cards, confirmPending, continuePerson, docked, done, draftMeta, drafts, dropDrafts, editDraftsFull, error, eventDelete, eventFlow, find, finish, go, goRace, heard, invDelete, invFlow, listenOnce, listening, nextStep, okFlow: okFlowRef, openAdd, park, personAccount, personCancel, personEdit, personOpenAccount, personSave, personUndo, personUndoAsk, plan, plans, router, run, runEvent, saveDraftsNow, saved, setCards, setSendText, setTurns, setUsed, sp, streamText, toggleTask, tts, turns, undoAtt, used, voice, history } = useAssistant({ open, onClose, seed, onLive, onAct });

  // Yapay zeka aynı kaydı birden çok kez gösterebilir: her kayıt bir kez listelenir
  const shownOf = (show = []) =>
    show
      .filter((x, i, a) => a.findIndex((y) => y.kind === x.kind && y.id === x.id) === i)
      .map((x) => ({ kind: x.kind, rec: find(x.kind, x.id) }))
      .filter((x) => x.rec);

  // Cevabın altındaki sonuç düğmeleri; dokunulan düğme soluklaşır ("used")
  const markLink = (i, k) => setUsed((u) => (u.has(`${i}:${k}`) ? u : new Set(u).add(`${i}:${k}`)));

  const linkCls = (i, k) => (used.has(`${i}:${k}`) ? " opacity-55" : "");

  const turnLinks = (t, i, embedded) => {
    const l = t.links;
    if (!l) return null;
    const shown = shownOf(l.show);
    return (
      <>
        {shown.length > 0 && (
          <RecordList
            items={shown}
            plans={plans}
            onToggle={toggleTask}
            onOpen={(kind, id) => {
              finish(true); // tam sayfa asistan kaydı örtmesin
              openAdd({ edit: { kind, id } });
            }}
          />
        )}
        {l.share && (
          <button
            type="button"
            onClick={() => (markLink(i, "share"), shareGroup(l.share))}
            className={`fade-in mt-3 flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-ok text-[0.875rem] font-semibold text-white active:scale-[.98]${linkCls(i, "share")}`}
          >
            <Icon name="whatsapp" className="size-4" /> {used.has(`${i}:share`) ? "WhatsApp'ta açıldı · yeniden" : "WhatsApp grubunda aç"}
          </button>
        )}
        {l.chat && (
          <button
            type="button"
            onClick={() => {
              markLink(i, "chat");
              finish(false);
              router.push(`/messages?c=${l.chat}`);
            }}
            className={`fade-in mt-3 flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-bg text-[0.875rem] font-semibold active:scale-[.98]${linkCls(i, "chat")}`}
          >
            <Icon name="chat" className="size-4" /> Sohbeti aç
          </button>
        )}
        {l.nav && PAGES[l.nav] && (
          <button type="button" onClick={() => (markLink(i, "nav"), go(l.nav, ""))} className={`fade-in mt-3 h-10 w-full rounded-xl bg-bg text-[0.875rem] font-semibold active:scale-[.98]${linkCls(i, "nav")}`}>
            {PAGES[l.nav].label} sayfasını aç
          </button>
        )}
      </>
    );
  };

  const askObj = cards.awaiting
    ? {
      chips: cards.pending?.actions || cards.pending?.att || cards.pending?.msgDel || cards.pending?.msgPurge || cards.pending?.chatDel ? [{ label: "Onayla", onPick: () => confirmPending() }, { label: "Vazgeç", onPick: () => cancelPending() }] : (cards.picks || []).map((n) => ({ label: n, onPick: () => (sp.cancel(), say(n)) })), // mesaj kartının kendi düğmeleri var
      onMic: () => sp.start({ autoStop: SILENCE_MS }),
      hint: "",
    }
    : null;

  const say = (t) => run(t, false);

  // Konuşma akışı: tam panelde ve sahnenin içinde aynı (embedded: sahnede; tanıtım yazısı yok, panel küçülmez)
  // Söylenen cümle hemen sohbete balon olarak düşer; alttaki kutu iş sürerken yazı göstermez (2026-10-18)

  const convoView = (embedded) => (
    <>
        {/* Boş sohbette açıklama yazısı yok (sade tasarım, 2026-10-16): kutudaki "Yaz ya da konuş…" yeter */}

        <PastSessions list={history} />

        <Thread turns={turns} engine={cards.engine} tts={tts} ask={askObj} canFix={false} onFix={() => { }} extra={(t, i) => (
          <>
            {turnLinks(t, i, embedded)}
            {/* Geliştirici bilgisi: süreler, model, bugünkü istek sayısı (Ayarlar › Asistan süre kaydı'ndan kapatılır) */}
            {t.dev && devOn() && <p className="mt-1.5 font-mono text-[0.6875rem] leading-snug text-mut">{t.dev}</p>}
          </>
        )} />

        {/* Bekleme yazıları burada yok: çalışırken durum yalnız üstteki halkada (Seyhun: "iki farklı yerde bilgilendirme
            mesajları oluyor. Olmasın o", 2026-10-17); durdurmak için alttaki kutunun düğmesi */}

        {/* Akışta gelen yanıt: kelime kelime; bitince yerini asıl yanıt alır */}
        {busy && streamText && (
          <div className="mt-3.5" aria-live="polite">
            <p className="min-w-0 pr-6 text-[1.0625rem] leading-relaxed tracking-[-.005em]">
              {streamText}
              <span className="ml-0.5 inline-block h-4 w-[2px] translate-y-[3px] animate-pulse bg-acc" aria-hidden="true" />
            </p>
          </div>
        )}

        {/* Görev listesi (tek cümlede birden çok iş): yalnız işlerin adı ve sonucu; ara adımlar (sporcular yükleniyor…) görünmez.
            Biten iş soluk ve işaretli, süren iş parlıyor, sıradakiler silik (Seyhun, 2026-10-09) */}
        {plan.length > 0 && (
          <ol className="apanel fade-in mt-3 space-y-2 rounded-2xl px-3.5 py-3 text-[0.9375rem]" aria-label="Görev listesi">
            {plan.map((x, i) => (
              <li key={i} className={`flex items-center gap-2 ${x.st === "run" ? "font-medium" : x.st === "done" ? "text-mut" : x.st === "fail" ? "text-rec" : x.st === "skip" ? "text-mut/60 line-through" : "text-mut/50"}`}>
                <span className="grid size-4 shrink-0 place-items-center">
                  {x.st === "done" ? <Icon name="check" className="size-4 text-acc [stroke-width:2.5]" /> : x.st === "skip" ? <Icon name="x" className="size-3.5 text-mut/60 [stroke-width:2.5]" /> : x.st === "fail" ? <Icon name="x" className="size-4 [stroke-width:2.5]" /> : <span className={`size-1.5 rounded-full ${x.st === "run" ? "bg-acc" : "bg-mut/40"}`} />}
                </span>
                <span className={`min-w-0 truncate ${x.st === "run" ? "work-text" : ""}`}>{x.label}</span>
              </li>
            ))}
          </ol>
        )}

        {/* Sesli okuma istendi ama sesli yanıt kapalı: dokununca açılır ve cevap okunur, sonra mikrofon açılır */}
        {cards.readAsk && (
          <div className="fade-in mt-3 flex">
            <button
              type="button"
              onClick={() => {
                const t = cards.readAsk;
                setCards((c) => ({ ...c, readAsk: "" }));
                tts.enable();
                tts.speak(t, listenOnce);
              }}
              className="h-10 flex-1 rounded-xl bg-acc text-[0.875rem] font-semibold text-white active:scale-[.98]"
            >
              Sesli yanıtı aç
            </button>
          </div>
        )}

        {/* Onay: geri alınamayan iş (arama, sporcu silme, aidat hatırlatması); sesle "evet / vazgeç" de olur */}
        {cards.ok && (
          <div className="fade-in mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => {
                const f = okFlowRef.current;
                okFlowRef.current = null;
                setTurns((p) => [...p, { role: "user", text: cards.ok.label, chip: true }]);
                f?.yes(voice);
              }}
              className="h-10 flex-1 rounded-xl bg-acc text-[0.875rem] font-semibold text-white active:scale-[.98]"
            >
              {cards.ok.label}
            </button>
            <button
              type="button"
              onClick={() => {
                okFlowRef.current = null;
                setTurns((p) => [...p, { role: "user", text: "Vazgeç", chip: true }]);
                done("Tamam, vazgeçtim.", { engine: "local" }, voice);
              }}
              className="h-10 flex-1 rounded-xl bg-card text-[0.875rem] font-semibold ring-1 ring-line active:scale-[.98]"
            >
              Vazgeç
            </button>
          </div>
        )}

        {/* Yoklama sonucu: kimler ne işaretlendi; kaydedildiyse Geri al */}
        {cards.att && (
          <div className="fade-in mt-3 overflow-hidden rounded-2xl ring-1 ring-acc/30">
            <p className="flex items-center justify-between bg-acc/[.06] px-3 py-2 text-[0.75rem] font-semibold uppercase tracking-wide text-acc">
              <span>Yoklama · {new Date(`${cards.att.date}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "long", weekday: "short" })}</span>
              <span>{cards.att.saved ? "kaydedildi" : "onay bekliyor"}</span>
            </p>
            <ul className="max-h-56 divide-y divide-line overflow-y-auto">
              {Object.entries(cards.att.changes).map(([id, v]) => (
                <li key={id} className="flex items-center justify-between gap-2 px-3 py-2 text-[0.875rem]">
                  <span className="truncate">{cards.att.names[id]}</span>
                  <span className={`shrink-0 font-semibold ${v === "present" ? "text-ok" : v === "absent" ? "text-rec" : v === "excused" ? "text-amber-700" : "text-mut"}`}>{ATT_LABEL[v] || "temizlendi"}</span>
                </li>
              ))}
            </ul>
            <div className="flex gap-1.5 border-t border-line p-2">
              {cards.att.saved ? (
                <button type="button" onClick={() => undoAtt(cards.att)} data-press className="btn btn-danger btn-sm">
                  Geri al
                </button>
              ) : (
                <button type="button" onClick={() => confirmPending()} data-press className="btn btn-primary btn-sm flex-1">
                  <Icon name="check" className="size-4" /> Kaydet
                </button>
              )}
              <button type="button" onClick={() => (finish(true), router.push(PAGES.attendance.path))} data-press className="btn btn-text btn-sm ml-auto text-acc">
                Yoklamayı aç
              </button>
            </div>
          </div>
        )}

        {/* Asistanla kişi ekleme: bilgiler, mükerrer uyarısı, onay; kaydedildiyse hesap aç / geri al */}
        {cards.person && (
          <PersonCard
            p={cards.person}
            onSave={() => (setTurns((p) => [...p, { role: "user", text: "Kaydet", chip: true }]), personSave())}
            onEdit={personEdit}
            onCancel={() => (["undo", "account"].includes(cards.person.step) ? continuePerson("vazgeç") : personCancel())}
            onAccount={() => (cards.person.step === "account" ? personOpenAccount() : personAccount())}
            onUndo={() => (cards.person.step === "undo" ? personUndo() : personUndoAsk())}
          />
        )}

        {/* Asistanla etkinlik planı: soru sorulurken "Genel plan yap"; kaydedilince Aç / Sil */}
        {cards.event && (
          <EventCard
            e={cards.event}
            onGeneral={() => {
              const text = cards.event.text;
              eventFlow.current = null;
              setTurns((p) => [...p, { role: "user", text: "Genel plan yap", chip: true }]);
              runEvent(text, false, true);
            }}
            onOpen={() => (finish(true), router.push(`/events/${cards.event.id}`))}
            onDelete={() => eventDelete(cards.event)}
          />
        )}

        {/* Envanter: yapılanlardan sonra Envanteri aç; silme sorulurken Sil / Vazgeç */}
        {cards.inv && (
          <InvCard
            v={cards.inv}
            onOpen={() => (finish(true), router.push(`/inventory/${cards.inv.id}`))}
            onDelete={() => invFlow.current && (setTurns((p) => [...p, { role: "user", text: "Sil", chip: true }]), invDelete(invFlow.current))}
            onKeep={() => {
              invFlow.current = null;
              setTurns((p) => [...p, { role: "user", text: "Vazgeç", chip: true }]);
              done("Tamam, silmedim.", { engine: "local" });
            }}
          />
        )}

        {error && (
          <div className="apanel fade-in mt-3 rounded-2xl p-3">
            <p className="flex items-center gap-2 text-[0.875rem] font-semibold"><Icon name="alert" className="size-4 text-rec" /> Şu an yanıt veremedim</p>
            <p className="mt-0.5 text-[0.8125rem] text-mut">{error}</p>
            <button type="button" onClick={() => run(heard, voice, true)} className="mt-2 h-9 rounded-xl bg-fg/[.08] px-3 text-[0.8125rem] font-semibold">Tekrar dene</button>
          </div>
        )}

        {/* Panelde hazırlanan yeni kayıtlar */}
        {drafts.length > 0 && (
          <div className="fade-in mt-3 overflow-hidden rounded-[1.25rem] bg-card shadow-[0_1px_2px_rgba(38,40,44,.05),0_10px_28px_-16px_rgba(38,40,44,.3)]">
            <ul className="divide-y divide-line">
              {drafts.map((d) => (
                <li key={d._id} className="flex items-center gap-3 px-3.5 py-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-acc/10 text-acc"><Icon name={KIND_ICON[d.type]} className="size-[1.125rem]" /></span>
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-[0.875rem] font-semibold">{d.title || d.body || "Başlıksız"}</b>
                    <small className="block truncate text-[0.75rem] text-mut">{draftMeta(d)}</small>
                  </span>
                </li>
              ))}
            </ul>
            {auto?.kind === "save" && auto.ref === drafts && <AutoLine key={auto.until} ms={auto.ms} />}
            <div className="flex gap-1.5 px-2.5 pb-2.5">
              <button type="button" onClick={() => saveDraftsNow(false)} data-press className="btn btn-primary flex-1">
                <Icon name="check" className="size-[1.125rem]" /> Kaydet
              </button>
              <button type="button" onClick={editDraftsFull} data-press className="btn btn-secondary">Düzenle</button>
              <button type="button" onClick={() => dropDrafts(false)} aria-label="Vazgeç" data-press className="btn btn-icon text-mut"><Icon name="x" className="size-[1.125rem]" /></button>
            </div>
          </div>
        )}

        {/* Az önce kaydedilenler: yalnız Düzenle (değişiklik sesle de söylenebilir) */}
        {saved.length > 0 && !drafts.length && (
          // Kaydedildi animasyonu (Seyhun'un onayladığı örnek, 2026-10-18): kart yeşil parıltıyla aşağı kayarak gelir, ✓ büyüyerek belirir
          <div key={saved.map((x) => x.id).join()} className="asaved mt-3 overflow-hidden rounded-[1.25rem] bg-card shadow-[0_1px_2px_rgba(38,40,44,.05),0_10px_28px_-16px_rgba(38,40,44,.3)]">
            <ul className="divide-y divide-line">
              {saved.map((x) => (
                <li key={x.id} className="flex items-center gap-3 px-3.5 py-3">
                  <span className="relative grid size-9 shrink-0 place-items-center rounded-xl bg-acc/10 text-acc">
                    <Icon name={KIND_ICON[x.type]} className="size-[1.125rem]" />
                    <span className="asaved-badge absolute -bottom-1 -right-1 grid size-4 place-items-center rounded-full bg-ok text-white ring-2 ring-card"><Icon name="check" className="size-2.5 [stroke-width:3]" /></span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-[0.875rem] font-semibold">{x.title}</b>
                    <small className="block truncate text-[0.75rem] text-mut">{x.meta}</small>
                  </span>
                  <button type="button" onClick={() => { park(); openAdd({ edit: { kind: x.kind, id: x.id } }); }} className="h-9 shrink-0 rounded-full bg-bg px-3.5 text-[0.8125rem] font-semibold transition active:scale-[.98]">Düzenle</button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Birden çok mesaj: tek kartta hepsi, tek onayla gider (Seyhun 2026-10-20) */}
        {cards.pending?.batch && (
          <div className="fade-in mt-3 overflow-hidden rounded-2xl ring-1 ring-acc/30">
            <p className="bg-acc/[.06] px-3 py-2 text-[0.6875rem] font-semibold uppercase tracking-wide text-acc">{cards.pending.batch.length} mesaj · onayını bekliyor</p>
            <ul className="divide-y divide-line bg-card">
              {cards.pending.batch.map((x, i) => (
                <li key={i} className="flex gap-2.5 px-3 py-2.5">
                  <Avatar name={x.label} icon={x.team ? x.icon : null} size="size-8" text="text-[0.75rem]" tone={x.team ? "bg-acc text-white" : undefined} />
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-[0.875rem] font-semibold">{x.label}</b>
                    <span className="block text-[0.9375rem] leading-snug">{x.text}</span>
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex gap-2 border-t border-line p-2">
              <button type="button" onClick={() => confirmPending(false)} data-press className="btn btn-primary flex-1">
                <Icon name="up" className="size-4" /> Hepsini gönder
              </button>
              <button type="button" onClick={() => cancelPending()} data-press className="btn btn-secondary text-mut">
                Vazgeç
              </button>
            </div>
          </div>
        )}

        {cards.pending?.send && !cards.pending.batch && (
          <div className="fade-in mt-3 overflow-hidden rounded-2xl ring-1 ring-acc/30">
            <p className="flex items-center gap-2.5 bg-acc/[.06] px-3 py-2">
              <Avatar name={cards.pending.send.label} icon={cards.pending.send.team ? cards.pending.send.icon : null} size="size-8" text="text-[0.75rem]" tone={cards.pending.send.team ? "bg-acc text-white" : undefined} />
              <span className="min-w-0 flex-1">
                <small className="block text-[0.6875rem] font-semibold uppercase tracking-wide text-acc">{cards.pending.auto ? "Mesaj · gönderiliyor" : "Mesaj · onayını bekliyor"}</small>
                <b className="block truncate text-[0.9375rem] font-semibold">{cards.pending.send.label}</b>
              </span>
            </p>
            <textarea
              value={cards.pending.send.text}
              onChange={(e) => setSendText(e.target.value)}
              aria-label="Gönderilecek mesaj"
              rows={2}
              className="block max-h-48 w-full resize-none bg-card px-3.5 py-3 text-[1rem] leading-snug outline-none [field-sizing:content] focus:bg-bg"
            />
            {auto?.kind === "send" && auto.ref === cards.pending && <AutoLine key={auto.until} ms={auto.ms} />}
            <div className="flex gap-2 border-t border-line p-2">
              {cards.pending.send.wa ? (
                <a
                  href={waTo(cards.pending.send.wa, cards.pending.send.text)}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => {
                    setTurns((p) => [...p, { role: "user", text: "WhatsApp'ta gönder", chip: true }]);
                    setCards((c) => ({ ...c, pending: null, awaiting: false }));
                    if (!nextStep(false, "WhatsApp'ta açtım. ")) done(`WhatsApp'ta ${cards.pending.send.label} için açtım; orada gönder'e dokun.`, { engine: "local" });
                  }}
                  className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-acc text-[0.9375rem] font-semibold text-white active:scale-[.98]"
                >
                  <Icon name="whatsapp" className="size-4" /> {"WhatsApp'ta gönder"}
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    // WhatsApp grubuna da istendiyse: dokunuşla WhatsApp paylaşımı hemen açılır (grup orada seçilir), uygulamadaki gruba da gönderilir
                    const p = cards.pending.send;
                    const wa = p.team && (p.alsoWa || p.waOnly);
                    if (wa) shareGroup(p.text);
                    confirmPending(false, wa);
                  }}
                  disabled={!cards.pending.send.text.trim()}
                  data-press className="btn btn-primary flex-1"
                >
                  <Icon name={cards.pending.send.waOnly ? "whatsapp" : "up"} className="size-4" /> {cards.pending.send.waOnly ? "WhatsApp'ta aç" : cards.pending.send.team && cards.pending.send.alsoWa ? "Gönder + WhatsApp" : "Gönder"}
                </button>
              )}
              {cards.pending.send.team && !cards.pending.send.waOnly && (
                <button type="button" onClick={() => shareGroup(cards.pending.send.text)} aria-label="WhatsApp ile paylaş" data-press className="btn btn-secondary text-ok">
                  <Icon name="whatsapp" className="size-5" />
                </button>
              )}
              <button type="button" onClick={() => cancelPending()} data-press className="btn btn-secondary text-mut">
                Vazgeç
              </button>
            </div>
            {/* Kısa not (sade tasarım, 2026-10-16): yalnız WhatsApp'a gidecekse ne olacağı */}
            {(cards.pending.send.wa || cards.pending.send.waOnly || (cards.pending.send.team && cards.pending.send.alsoWa)) && (
              <p className="border-t border-line px-3 py-1.5 text-[0.75rem] text-mut">{cards.pending.send.wa ? "Bu kişi uygulamada değil, WhatsApp'ta açılır." : "WhatsApp'ta grubu seç, mesaj hazır gelir."}</p>
            )}
          </div>
        )}

        {cards.pending?.actions && (
          <div className="apanel fade-in mt-3 rounded-2xl p-3">
            <p className="text-[0.8125rem] font-semibold">Onayını bekliyor</p>
            <ul className="mt-1 space-y-0.5 text-[0.8125rem]">
              {cards.pending.actions.map((a, i) => <li key={i}>• {describeAction(a, find(a.kind, a.id))}</li>)}
            </ul>
          </div>
        )}

        {cards.races?.length > 0 && (
          <div className="fade-in mt-3 grid gap-2">
            {cards.races.map((r) => (
              <button key={r.id} type="button" onClick={() => goRace(r)} className="flex h-11 items-center gap-2 rounded-xl bg-bg px-3 text-left text-[0.875rem] font-semibold active:scale-[.98]">
                <Icon name="flag" className="size-4 shrink-0 text-acc" />
                <span className="min-w-0 flex-1 truncate">{r.name}</span>
                <small className="shrink-0 text-[0.75rem] font-normal text-mut">{r.startDate ? rel(r.startDate) : ""}</small>
              </button>
            ))}
          </div>
        )}

    </>
  );

  return slot ? createPortal(<div className="pb-1 text-[1rem]">{convoView(true)}</div>, slot) : null;
}

// Geri sayım çizgisi: hazırlanan kayıt / mesaj ms sonra kendiliğinden yapılır (useAssistant AUTO_MS); çizgi o sürede dolar
function AutoLine({ ms }) {
  return (
    <div className="mx-3.5 mb-2.5 h-[3px] overflow-hidden rounded-full bg-line" aria-hidden="true">
      <div className="h-full origin-left rounded-full bg-acc" style={{ animation: `autofill ${ms}ms linear forwards` }} />
    </div>
  );
}
