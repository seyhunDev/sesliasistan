"use client";

import { useEffect, useMemo, useState } from "react";
import { BackButton } from "@/components/ui/BackButton";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Loading } from "@/components/ui/Loader";
import { ListHead, Row, RowList, Tag } from "@/components/ui/Row";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuth } from "@/features/auth/AuthProvider";
import { askWord, loadDeck, updateDeck } from "@/features/words/wordData";
import { WordView } from "@/features/words/WordView";
import { cachedDeck, deckCounts, findWord, knowWord, knownList, pageCard, reviewWord, studyRows, studyWord, topicStats } from "@/lib/englishWords";
import { todayStr } from "@/lib/utils/format";

const DAYS = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];
const MONTHS = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
const at = (d) => new Date(`${d}T12:00:00`);
// Tekrar günü: "Bugün", "Yarın", hafta içindeyse gün adı, sonra "17 Eki"
function dueText(due, today) {
  if (!due || due <= today) return "Bugün";
  const n = Math.round((at(due) - at(today)) / 86400000);
  if (n === 1) return "Yarın";
  return n < 7 ? DAYS[at(due).getDay()] : `${at(due).getDate()} ${MONTHS[at(due).getMonth()]}`;
}
const dayText = (d) => (d ? `${at(d).getDate()} ${MONTHS[at(d).getMonth()]}` : "");

// İngilizce (Seyhun 2026-10-22: "kelime listesi olsun, hazır cümleler olsun… öğrendiğimi yazarım, öğrenilenlere kaydedilir, sıradakini
// öğrenirim"; örnek /mnt/project-files/ingilizce-kelime/sayfa-ornek.png). Lacivert üstte Kelimeler / Cümleler ve sayılar; altta
// "Sıradaki" kartı (Öğrendim → Öğrendiklerim'e, Sonraki → kaydetmeden geçer). Kelimelerde Çalışıyorum (tekrar günü) ve
// Öğrendiklerim; Cümlelerde konular (dokununca kart o konudan gelir). Ekle: yazılan kelime/cümlenin kartını yapay zeka hazırlar,
// çalışmaya girer. Deste kelime kartıyla aynı (orgs/{orgId}/english/deck, features/words/wordData.js).
export default function EnglishPage() {
  const { profile, isOwner } = useAuth();
  const orgId = isOwner ? profile?.orgId || "" : "";
  const toast = useToast();
  const today = todayStr();
  const [deck, setDeck] = useState(null);
  const [kind, setKind] = useState("word");
  const [topic, setTopic] = useState("");
  const [skip, setSkip] = useState([]);
  const [busy, setBusy] = useState(false);
  const [allKnown, setAllKnown] = useState(false);
  const [add, setAdd] = useState(false);
  const [text, setText] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    let live = true;
    loadDeck(orgId).then(
      (d) => live && setDeck(d),
      () => live && setDeck(cachedDeck()),
    );
    return () => {
      live = false;
    };
  }, [orgId]);

  const cur = useMemo(() => (deck ? pageCard(deck, { kind, today, topic, skip }) : null), [deck, kind, today, topic, skip]);
  // Tekrarı gelen çalışma kelimesi gösterilince o günün tekrarı sayılır (kelime kartındaki gibi)
  const curKey = cur?.status === "study" && (!cur.due || cur.due <= today) ? cur.en : "";
  useEffect(() => {
    if (curKey) updateDeck(orgId, (d) => reviewWord(d, curKey, today)).catch(() => {});
  }, [curKey, orgId, today]);

  const save = async (fn) => {
    setBusy(true);
    try {
      setDeck(await updateDeck(orgId, fn));
      return true;
    } catch {
      toast("Kaydedemedim, bağlantıyı kontrol et");
      return false;
    } finally {
      setBusy(false);
    }
  };
  const learned = async () => {
    if (cur && (await save((d) => knowWord(d, cur.en, today)))) toast("Öğrendiklerine eklendi");
  };
  const next = () => cur && setSkip((s) => [...s, cur.en]);
  const pickKind = (k) => {
    setKind(k);
    setTopic("");
    setSkip([]);
  };
  const addNew = async () => {
    const t = text.trim();
    if (!t) return;
    setAdding(true);
    try {
      const w = findWord(deck, t) || (await askWord(t, kind));
      if (await save((d) => studyWord(d, w, today, new Date().toISOString()))) {
        setAdd(false);
        setText("");
        setSkip([]);
        setTopic("");
        toast(`Çalışmaya eklendi: ${w.en}`);
      }
    } catch (e) {
      toast(e?.message || "Hazırlayamadım, tekrar dene");
    } finally {
      setAdding(false);
    }
  };

  const n = deck ? deckCounts(deck, kind) : null;
  const studying = deck ? studyRows(deck, kind) : [];
  const known = deck ? knownList(deck, kind) : [];
  const topics = deck && kind === "phrase" ? topicStats(deck) : [];
  const shown = allKnown ? known : known.slice(0, 5);

  return (
    <main className="mx-auto max-w-[30rem] px-5 pb-[calc(var(--dome-h,var(--stage-h,6rem))+2rem)]">
      <section className="ck -mx-5 px-5 pb-9 pt-[calc(0.75rem+env(safe-area-inset-top))]" aria-label="İngilizce">
        <header className="flex items-center gap-2.5">
          <BackButton href="/" />
          <h1 className="min-w-0 flex-1 truncate text-[1.375rem] font-bold tracking-[-.02em]">İngilizce</h1>
          <button type="button" data-press onClick={() => setAdd(true)} className="raised h-10 rounded-xl border px-4 text-[0.9375rem] font-semibold">
            Ekle
          </button>
        </header>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {[
            ["word", "Kelimeler"],
            ["phrase", "Cümleler"],
          ].map(([k, l]) => (
            <button key={k} type="button" data-press aria-pressed={kind === k} onClick={() => pickKind(k)} className={`raised h-11 rounded-xl border text-[0.9375rem] font-semibold ${kind === k ? "ck-sel" : ""}`}>
              {l}
            </button>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {[
            [n?.study, "Çalışıyorum"],
            [n?.known, "Öğrendim"],
            [n?.list, "Sırada"],
          ].map(([v, l]) => (
            <div key={l}>
              <b className="block text-[1.625rem] font-bold tabular-nums tracking-[-.02em]">{v ?? "–"}</b>
              <small className="text-[0.8125rem] text-white/65">{l}</small>
            </div>
          ))}
        </div>
      </section>

      <div className="relative -mx-5 -mt-6 min-h-[50vh] space-y-6 rounded-t-[1.75rem] bg-bg px-5 pt-4">
        {!deck && <Loading label="Yükleniyor" />}
        {deck && (
          <section className="rounded-[1.25rem] border border-line bg-card px-4 pb-3.5 pt-3.5" aria-label="Sıradaki">
            <span className="text-[0.6875rem] font-bold tracking-[.08em] text-acc">
              {cur ? `SIRADAKİ · ${cur.status === "study" ? "ÇALIŞ" : (cur.topic || (kind === "phrase" ? "Eklediklerim" : "B2")).toLocaleUpperCase("tr-TR")}` : "SIRADAKİ"}
            </span>
            {cur ? (
              <>
                <WordView w={cur} />
                <div className="mt-3.5 flex gap-2">
                  <Button variant="secondary" full onClick={next} disabled={busy}>
                    Sonraki
                  </Button>
                  <Button full onClick={learned} loading={busy}>
                    Öğrendim
                  </Button>
                </div>
              </>
            ) : (
              <p className="py-4 text-[0.9375rem] font-semibold">{kind === "phrase" ? "Bu konunun hepsini öğrendin." : "Listedeki her kelimeyi öğrendin."}</p>
            )}
          </section>
        )}

        {deck && kind === "phrase" && (
          <section>
            <ListHead title="Konular" />
            <RowList>
              {topics.map((t) => (
                <Row key={t.topic} title={t.topic} right={<span className={topic === t.topic ? "text-acc" : "text-mut"}>{`${t.known}/${t.total}`}</span>} onClick={() => (setTopic(topic === t.topic ? "" : t.topic), setSkip([]))} chev={false} />
              ))}
            </RowList>
          </section>
        )}

        {deck && studying.length > 0 && (
          <section>
            <ListHead title="Çalışıyorum" count={studying.length} />
            <RowList>
              {studying.map((w) => (
                <Row key={w.en} title={w.en} sub={w.tr} right={<span className="whitespace-nowrap rounded-full bg-accbg px-2 py-0.5 text-[0.75rem] font-semibold text-acc">{dueText(w.due, today)}</span>} />
              ))}
            </RowList>
          </section>
        )}

        {deck && known.length > 0 && (
          <section>
            <div className="mb-1.5 flex items-center justify-between gap-3 px-1">
              <h2 className="text-[0.8125rem] font-bold tracking-[.04em] text-mut">
                ÖĞRENDİKLERİM <span className="ml-1 font-semibold tabular-nums">{known.length}</span>
              </h2>
              {known.length > 5 && (
                <button type="button" onClick={() => setAllKnown((v) => !v)} className="text-[0.8125rem] font-semibold text-acc">
                  {allKnown ? "Daha az" : "Tümü ›"}
                </button>
              )}
            </div>
            <RowList>
              {shown.map((w) => (
                <Row key={w.en} title={w.en} sub={w.tr} right={w.kd ? <Tag tone="st">{dayText(w.kd)}</Tag> : null} />
              ))}
            </RowList>
          </section>
        )}
      </div>

      <Sheet open={add} onClose={() => !adding && setAdd(false)} title={kind === "phrase" ? "Cümle ekle" : "Kelime ekle"}>
        <div className="space-y-4 pb-1">
          <Field
            label={kind === "phrase" ? "İngilizce ya da Türkçe cümle" : "İngilizce ya da Türkçe kelime"}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addNew()}
            autoFocus
            autoCapitalize="off"
            enterKeyHint="done"
          />
          <Button full onClick={addNew} loading={adding} disabled={!text.trim()}>
            Ekle
          </Button>
        </div>
      </Sheet>
    </main>
  );
}
