"use client";

import { doneOf } from "@/lib/doneWords";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { repliesOf } from "@/lib/people";
import { rel, when } from "@/lib/utils/format";
import { stamp } from "./EditCard";
import { ConvoComposer } from "@/features/assistant/ConvoComposer";

const KIND = { plan: "Plan", task: "Görev", note: "Not" };

// Kayda yazılan mesajlar (atanan kişiler ve ana hesap): mesajlaşma uygulaması gibi.
//   Benimkiler sağda (renkli balon), başkalarınınkiler solda (baş harf + ad). Arka arkaya aynı kişi = tek grup.
//   Gün ayraçları (Bugün, Dün, 12 Eyl), açılışta görmediğim mesajların üstünde "Yeni mesajlar" çizgisi,
//   son mesajımın altında "Görüldü" (karşı taraf kaydı açtıysa) ya da "Gönderildi". Uzun konuşmada son 30 mesaj.
// Veri yapısı değişmedi: replies.{uid} = [{ at, text }]; görüldü bilgisi ack.{uid}.n.
const SHOW_MSG = 30;
const hmOf = (iso) => new Date(iso).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
const dayKey = (iso) => new Date(iso).toDateString();
function dayText(iso) {
  const k = dayKey(iso);
  if (k === dayKey(Date.now())) return "Bugün";
  if (k === dayKey(Date.now() - 864e5)) return "Dün";
  return new Date(iso).toLocaleDateString("tr-TR", { day: "numeric", month: "long", weekday: "short" });
}
const initialsOf = (n = "") =>
  String(n)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((x) => x[0].toLocaleUpperCase("tr-TR"))
    .join("") || "?";

// assistant (verildiyse): { panel, text, setText } — kayıt içi asistanın yanıtı/taslağı ve yazı kutusu.
// Kutu boşken sağdaki küre ana asistanı bu kaydın bilgisiyle açar (özetle, tamamla, "yaz" → bu kaydın konuşması).
// docked: yazma alanı burada çizilmez, ekranın altına sabitlenir (ReplyComposer); mesajlar geldikçe liste alta kayar
export function Replies({ rec, myUid, nameOf, onSend, placeholder = "Mesaj yaz…", assistant, docked = false, kind }) {
  // Yazı da üstten gelebilir (asistan taslağındaki "Düzenle" metni kutuya koyar)
  const [ownText, setOwnText] = useState("");
  const text = assistant?.setText ? assistant.text : ownText;
  const setText = assistant?.setText || setOwnText;
  const [all, setAll] = useState(false);
  // Açıldığı andaki "son baktığım" zaman: kayıt açılınca görüldü yazılır, ama çizgi bu açılışta yerinde kalsın
  const [seenAt] = useState(() => rec?.ack?.[myUid]?.n || "");
  // Konuşma açıkken gelenler zaten görülüyor: "Yeni mesajlar" çizgisi yalnızca açılıştan önce gelmiş okunmamışların üstünde
  const [openedAt] = useState(() => new Date().toISOString());
  const list = repliesOf(rec);
  const shown = all ? list : list.slice(-SHOW_MSG);
  const firstNew = shown.findIndex((r) => r.uid !== myUid && String(r.at) > seenAt && String(r.at) < openedAt);
  const others = [...new Set([rec?.createdByUid, ...(rec?.assignees || []), ...(rec?.people || [])])].filter((u) => u && u !== myUid);
  const lastMine = [...list].reverse().find((r) => r.uid === myUid);
  const seenBy = lastMine ? others.filter((u) => String(rec?.ack?.[u]?.n || "") >= String(lastMine.at)) : [];
  const send = () => {
    const t = text.trim();
    if (!t) return;
    onSend(t);
    setText("");
  };

  // Mesajlaşma uygulaması gibi: açılışta en alttaki mesaj görünür; yeni mesaj gelince (kullanıcı yukarıda eski mesajları okumuyorsa
  // ya da mesaj kendisininse) liste yumuşakça alta kayar
  const box = useRef(null);
  const count = useRef(-1);
  const lastUid = list.at(-1)?.uid;
  useEffect(() => {
    const el = box.current?.closest("[data-scroll]");
    const first = count.current < 0;
    const grew = list.length > count.current;
    count.current = list.length;
    if (!el || !list.length || (!first && !grew)) return;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < 220;
    if (first || near || lastUid === myUid) requestAnimationFrame(() => el.scrollTo({ top: el.scrollHeight, behavior: first ? "auto" : "smooth" }));
  }, [list.length, lastUid, myUid]);

  return (
    <div ref={box} className="mt-3 overflow-hidden rounded-2xl bg-card shadow-[0_1px_3px_rgba(38,40,44,.05)]" aria-label="Mesajlar">
      <h3 className="flex items-center gap-1.5 px-4 pt-3 text-[0.75rem] font-semibold uppercase tracking-wide text-mut">
        <Icon name="chat" className="size-4" /> Mesajlar{list.length ? ` · ${list.length}` : ""}
      </h3>

      <div className="px-3 pb-1 pt-2">
        {list.length > shown.length && (
          <button type="button" onClick={() => setAll(true)} className="mb-2 w-full rounded-full py-1.5 text-[0.75rem] font-semibold text-acc active:bg-bg">
            Önceki mesajlar ({list.length - shown.length})
          </button>
        )}
        {!list.length && <p className="px-1 pb-2 text-[0.8125rem] text-mut">Henüz mesaj yok. Bu kayıtla ilgili yazdığın mesaj ilgili kişilere bildirim olarak gider.</p>}
        {shown.map((r, i) => {
          const mine = r.uid === myUid;
          const prev = shown[i - 1];
          const next = shown[i + 1];
          const newDay = !prev || dayKey(prev.at) !== dayKey(r.at);
          const near = (a, b) => a && b && a.uid === b.uid && dayKey(a.at) === dayKey(b.at) && Math.abs(Date.parse(b.at) - Date.parse(a.at)) < 5 * 60e3;
          const head = !near(prev, r) || i === firstNew; // grubun ilk balonu: ad ve baş harf
          const tail = !near(r, next) || i + 1 === firstNew; // grubun son balonu: saat
          const name = mine ? "Sen" : nameOf(r.uid) || "Kişi";
          return (
            <div key={`${r.uid}-${r.at}-${i}`}>
              {newDay && (
                <p className="my-2 text-center">
                  <span className="rounded-full bg-bg px-2.5 py-0.5 text-[0.6875rem] font-semibold text-mut">{dayText(r.at)}</span>
                </p>
              )}
              {i === firstNew && (
                <p className="my-2 flex items-center gap-2 text-[0.6875rem] font-semibold text-acc">
                  <span className="h-px flex-1 bg-acc/30" /> Yeni mesajlar <span className="h-px flex-1 bg-acc/30" />
                </p>
              )}
              <div className={`flex items-end gap-2 ${mine ? "justify-end" : ""} ${head ? "mt-2" : "mt-0.5"}`}>
                {!mine && (
                  <span className={`grid size-7 shrink-0 place-items-center rounded-full bg-acc/10 text-[0.625rem] font-bold text-acc ${tail ? "" : "invisible"}`}>{initialsOf(name)}</span>
                )}
                <div className={`flex max-w-[78%] flex-col ${mine ? "items-end" : "items-start"}`}>
                  {head && !mine && <span className="mb-0.5 px-1 text-[0.6875rem] font-semibold text-mut">{name}</span>}
                  <p
                    className={`whitespace-pre-wrap break-words px-3 py-2 text-[0.9375rem] leading-snug ${
                      mine ? "rounded-2xl rounded-br-md bg-acc text-white" : "rounded-2xl rounded-bl-md bg-bg text-fg"
                    }`}
                  >
                    {r.text}
                  </p>
                  {tail && <span className="mt-0.5 px-1 text-[0.625rem] tabular-nums text-mut">{hmOf(r.at)}</span>}
                </div>
              </div>
            </div>
          );
        })}
        {lastMine && others.length > 0 && (
          <p className="mt-0.5 px-1 text-right text-[0.625rem] font-medium text-mut">
            {seenBy.length ? `Görüldü${others.length > 1 ? ` · ${seenBy.map((u) => nameOf(u) || "Kişi").join(", ")}` : ""}` : "Gönderildi"}
          </p>
        )}
      </div>

      {/* Asistanın yanıtı ve bekleyen mesaj taslağı (onay) */}
      {assistant?.panel}

      {!docked && <Composer text={text} setText={setText} send={send} placeholder={placeholder} kind={kind} focus={recordFocus(kind, rec, nameOf, myUid)} />}
    </div>
  );
}

// Ana asistanın bu kayıt hakkındaki bilgisi: kayıt, kimliği ve konuşması. "Bunu tamamla", "özetle", "yaz" bu kayda gider.
const PREFIX = { plan: "p", task: "t", note: "n" };
export function recordFocus(kind, rec, nameOf, myUid) {
  if (!rec || !PREFIX[kind]) return null;
  const msgs = repliesOf(rec).slice(-15);
  return {
    title: `${KIND[kind]}: ${rec.title}`,
    rec: { kind, id: rec.id },
    text: [
      `Açık kayıt: ${KIND[kind]} ${PREFIX[kind]}:${rec.id} | ${rec.title}${kind === "plan" && rec.date ? ` | ${when(rec)}` : ""}${kind === "task" && rec.due ? ` | son gün ${rec.due}` : ""}`,
      kind === "note" && rec.body ? `Not metni: ${String(rec.body).slice(0, 400)}` : "",
      "Varsayılan alıcı: Bu kaydın konuşması (kayıttaki kişiler görür)",
      msgs.length ? "Kayıttaki mesajlar (eskiden yeniye):" : "Kayıtta henüz mesaj yok.",
      ...msgs.map((r) => `${r.uid === myUid ? "Ben" : nameOf(r.uid) || "Kişi"}: ${String(r.text).slice(0, 300)}`),
    ]
      .filter(Boolean)
      .join("\n"),
  };
}
const examplesOf = (kind) => ["Bu konuşmayı özetle", kind === "task" ? "Bu görevi tamamla" : "Bundan görev çıkar", "Kayıttakilere yarın hazır olacak yaz"];

// Yazma alanı: elle yaz ya da mikrofonla yazdır (aynen gider); kutu boşken ana asistan (bu kaydı bilir)
function Composer({ text, setText, send, placeholder, focus, kind, bare = false, orb = true }) {
  return (
    <div className={bare ? "" : "border-t border-line px-3 pb-2.5 pt-2"}>
      <ConvoComposer value={text} setValue={setText} onSend={send} placeholder={placeholder} focus={focus} examples={examplesOf(kind)} orb={orb} />
    </div>
  );
}

// Ekranın altına sabitlenen yazma alanı (Replies docked ile birlikte). Yazı asistan nesnesinden gelebilir (AddSheet'te tutulur).
export function ReplyComposer({ onSend, placeholder = "Mesaj yaz…", assistant, kind, rec, nameOf, myUid, orb = true }) {
  const [ownText, setOwnText] = useState("");
  const text = assistant?.setText ? assistant.text : ownText;
  const setText = assistant?.setText || setOwnText;
  const send = () => {
    const t = text.trim();
    if (!t) return;
    onSend(t);
    setText("");
  };
  return <Composer bare text={text} setText={setText} send={send} placeholder={placeholder} kind={kind} focus={recordFocus(kind, rec, nameOf, myUid)} orb={orb} />;
}

// Asistanın kayıt içindeki yanıtı + bekleyen mesaj taslağı (Gönder / Düzenle / Vazgeç). Mesaj onaysız gitmez.
// out: { text, done } · reply: asistanın cümlesi · saveToo: kaydedilmemiş değişiklik varsa düğme "Kaydet ve gönder"
export function AssistantPanel({ reply, out, saveToo, onConfirm, onCancel, onEdit, kind }) {
  if (!reply && !out) return null;
  const label = out?.text ? (saveToo ? "Kaydet ve gönder" : "Gönder") : saveToo ? "Kaydet ve tamamla" : "Tamamla";
  return (
    <div className="fade-in border-t border-line px-3 py-3" aria-live="polite">
      {reply && (
        <div className="flex items-start gap-2">
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-acc text-white"><Icon name="spark" className="size-3.5" /></span>
          <p className="min-w-0 rounded-2xl rounded-tl-md bg-bg px-3 py-2 text-[0.875rem] leading-snug">{reply}</p>
        </div>
      )}
      {out && (
        <div className="mt-2.5 rounded-2xl border border-dashed border-acc/50 bg-acc/[.04] p-3">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-acc">{out.text ? "Gönderilecek mesaj" : "Onay bekliyor"}</p>
          {out.text && <p className="mt-1 whitespace-pre-wrap text-[0.9375rem] leading-snug">{out.text}</p>}
          {out.done && (
            <p className="mt-1.5 flex items-center gap-1.5 text-[0.8125rem] font-medium text-ok">
              <Icon name="check" className="size-4" /> {doneOf(kind).toast.replace("işaretlendi", "işaretlenecek")}
            </p>
          )}
          <div className="mt-2.5 flex gap-2">
            <button type="button" onClick={onConfirm} className="flex h-10 min-w-0 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-acc px-3 text-[0.875rem] font-semibold text-white active:scale-[.98]">
              <Icon name={out.text ? "up" : "check"} className="size-4" /> {label}
            </button>
            {out.text && (
              <button type="button" onClick={onEdit} className="h-10 shrink-0 rounded-xl bg-card px-3 text-[0.875rem] font-semibold ring-1 ring-line active:scale-[.98]">
                Düzenle
              </button>
            )}
            <button type="button" onClick={onCancel} className="h-10 shrink-0 rounded-xl px-2.5 text-[0.875rem] font-semibold text-mut active:bg-bg">
              Vazgeç
            </button>
          </div>
          <p className="mt-1.5 text-[0.6875rem] text-mut">Sesle de onaylayabilirsin: “gönder” ya da “vazgeç”.</p>
        </div>
      )}
    </div>
  );
}

// Başkasının verdiği kayıt (çalışan görünümü): değiştiremez; yalnızca kendisi için "gerçekleşti / yaptım / okudum" der ve mesaj yazar
export function AssignedView({ kind, rec, planTitle, myUid, nameOf, onDone, onReply, assistant, docked = false }) {
  const mine = rec.doneBy?.[myUid];
  const by = nameOf(rec.createdByUid) || "Ana hesap";
  const rows = [
    kind === "plan" && rec.date && ["cal", "Zaman", when(rec)],
    kind === "task" && rec.due && ["cal", "Son gün", rel(rec.due)],
    kind === "plan" && rec.place && ["pin", "Yer", rec.place],
    rec.cat && rec.cat !== "Genel" && ["tag", "Kategori", rec.cat],
    planTitle && ["cal", "Bağlı plan", planTitle],
  ].filter(Boolean);

  return (
    <div>
      <div className="rounded-2xl bg-card px-4 py-4 shadow-[0_1px_3px_rgba(38,40,44,.05)]">
        <p className="text-[0.75rem] font-semibold uppercase tracking-wide text-acc">{KIND[kind]}</p>
        <h3 className="mt-1 text-[1.25rem] font-semibold leading-snug">{rec.title}</h3>
        {kind === "note" && rec.body && rec.body !== rec.title && <p className="mt-2 whitespace-pre-wrap text-[0.9375rem] leading-relaxed">{rec.body}</p>}
        {rows.length > 0 && (
          <ul className="mt-3 divide-y divide-line border-t border-line">
            {rows.map(([ic, label, value]) => (
              <li key={label} className="flex items-center gap-3 py-2.5 text-[0.9375rem]">
                <Icon name={ic} className="size-5 shrink-0 text-mut" />
                <span>{label}</span>
                <span className="ml-auto min-w-0 truncate text-right font-medium">{value}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 flex items-center gap-1.5 text-[0.8125rem] text-mut">
          <Icon name="user" className="size-4" /> {by} verdi{rec.createdAt ? ` · ${stamp(rec.createdAt)}` : ""} · değiştiremezsin
        </p>
      </div>

      {/* Yalnızca kendisi için */}
      <button
        onClick={() => onDone(!mine)}
        className={`mt-3 flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-[1rem] font-semibold transition active:scale-[.98] ${mine ? "bg-ok/10 text-ok ring-1 ring-ok/30" : "bg-acc text-white"}`}
      >
        <Icon name="check" className="size-5 [stroke-width:2.5]" />
        {mine ? `${doneOf(kind).mine} · ${stamp(mine)}` : doneOf(kind).act}
      </button>
      {mine && <p className="mt-1 text-center text-[0.75rem] text-mut">Geri almak için tekrar dokun</p>}

      <Replies key={rec.id} kind={kind} rec={rec} myUid={myUid} nameOf={nameOf} onSend={onReply} placeholder="Ana hesaba mesaj yaz…" assistant={assistant} docked={docked} />
    </div>
  );
}
