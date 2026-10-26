"use client";

import { useEffect, useMemo, useState } from "react";
import { BackButton } from "@/components/ui/BackButton";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { Loading } from "@/components/ui/Loader";
import { ListHead, Row, RowList, Tag } from "@/components/ui/Row";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuth } from "@/features/auth/AuthProvider";
import { askWord, loadDeck, moreWord, updateDeck } from "@/features/words/wordData";
import { sayEn } from "@/features/words/WordView";
import { cachedDeck, cleanGaps, findWord, hasMore, knowWord, knownList, missWord, pageCard, quizFor, reviewWord, sentencesOf, setMore, studyRows, studyWord, topicStats } from "@/lib/englishWords";
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

const CYAN = "text-[#67e8f9]";
// Arka plan: soluk şehir fotoğrafı (ücretsiz lisanslı Unsplash), aşağı doğru koyu zemine karışır. Yüklenemezse yalnız koyu zemin.
const BG = "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=900&q=60&auto=format&fit=crop";
// Arka plan resmi CSS ile: yüklenemezse kırık resim simgesi çıkmaz, koyu zemin kalır
function Photo() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[34rem] overflow-hidden">
      <div style={{ backgroundImage: `url(${BG})` }} className="size-full bg-cover bg-center opacity-35" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,22,40,.55)_0%,rgba(11,22,40,.85)_55%,#0b1628_100%)]" />
    </div>
  );
}

// Cümlede kelimenin geçtiği yer camgöbeği
function Marked({ text, word }) {
  if (!word) return text;
  const i = text.toLowerCase().indexOf(word.toLowerCase());
  if (i < 0) return text;
  return (
    <>
      {text.slice(0, i)}
      <span className={CYAN}>{text.slice(i, i + word.length)}</span>
      {text.slice(i + word.length)}
    </>
  );
}

// Dokununca İngilizcesi okunan satır: İngilizce, altında soluk Türkçesi
function Line({ e, t, word, who }) {
  return (
    <button type="button" onClick={() => sayEn(e)} className="block w-full text-left">
      <span className="block text-[1.0625rem] leading-snug text-white/90">
        {who && <i className="mr-2 text-[0.8125rem] not-italic text-white/35">{who}</i>}
        <Marked text={e} word={word} />
      </span>
      {t && <span className={`mt-0.5 block text-[0.875rem] leading-snug text-white/40 ${who ? "pl-5" : ""}`}>{t}</span>}
    </button>
  );
}

// Kart: kelime (ya da cümle) ekranı doldurur; anlamı, türü, örnek cümleler ve kısa diyalog. Her İngilizce satır dokununca okunur.
function Card({ w, wait }) {
  const phrase = w.kind === "phrase";
  const ex = phrase ? [] : sentencesOf(w);
  return (
    <div className="py-6">
      <button type="button" onClick={() => sayEn(w.en)} className="block text-left">
        <span className={`block font-bold tracking-[-.03em] ${phrase ? "text-[2.125rem] leading-[1.15]" : "break-words text-[3.25rem] leading-[1.05]"}`}>{w.en}</span>
      </button>
      <p className={`mt-2.5 text-[1.25rem] font-medium ${CYAN}`}>{w.tr}</p>
      <button type="button" onClick={() => sayEn(w.en)} className="mt-4 inline-flex items-center gap-1.5 text-[0.875rem] text-white/50">
        <Icon name="volume" className={`size-[1.125rem] ${CYAN}`} />
        {phrase ? w.topic || "Eklediklerim" : w.type}
      </button>
      {ex.length > 0 && (
        <div className="mt-9 space-y-4">
          {ex.map((x) => (
            <Line key={x.e} e={x.e} t={x.t} word={w.en} />
          ))}
        </div>
      )}
      {w.dlg?.length > 0 && (
        <div className={`${ex.length ? "mt-7" : "mt-10"} space-y-3`}>
          {w.dlg.map((x, i) => (
            <Line key={i} e={x.e} t={x.t} word={phrase ? "" : w.en} who={i % 2 ? "B" : "A"} />
          ))}
        </div>
      )}
      {wait && !w.dlg?.length && (
        <div aria-label="Örnekler hazırlanıyor" className="mt-9 space-y-3">
          {[80, 64, 72].map((n) => (
            <div key={n} style={{ width: `${n}%` }} className="h-3.5 animate-pulse rounded-full bg-white/8" />
          ))}
        </div>
      )}
    </div>
  );
}

const ASK = { mean: "ANLAMINI SEÇ", blank: "BOŞLUĞU DOLDUR", en: "İNGİLİZCESİNİ SEÇ", listen: "DİNLE, ANLAMINI SEÇ" };
// Sına: üç soru; şıkka dokununca doğru yeşil, yanlış kırmızı görünür, "Devam" ile sıradaki. Bitince sonuç.
function Quiz({ qs, step, picked, onPick }) {
  const q = qs[step];
  const parts = q.kind === "blank" ? q.ask.split("___") : null;
  return (
    <div className="py-6">
      <small className="text-[0.8125rem] tracking-[.04em] text-white/45">{ASK[q.kind]}</small>
      {q.kind === "listen" ? (
        <button type="button" onClick={() => sayEn(q.say)} aria-label="Dinle" className="mt-4 grid size-20 place-items-center rounded-full bg-[#67e8f9]/14">
          <Icon name="volume" className={`size-9 ${CYAN}`} />
        </button>
      ) : (
        <p className="mt-3 text-[1.75rem] font-semibold leading-[1.3]">
          {parts ? (
            <>
              {parts[0]}
              <span className="mx-1 inline-block w-28 border-b-2 border-[#67e8f9] align-baseline" />
              {parts[1]}
            </>
          ) : (
            q.ask
          )}
        </p>
      )}
      {q.kind === "blank" && (
        <button type="button" onClick={() => sayEn(q.say)} className="mt-4 inline-flex items-center gap-1.5 text-[0.875rem] text-white/50">
          <Icon name="volume" className={`size-[1.125rem] ${CYAN}`} />
          dinle
        </button>
      )}
      <div className="mt-8">
        {q.opts.map((o, i) => {
          const done = picked != null;
          const look = done && i === q.ok ? "font-semibold text-[#9fe7c6]" : done && i === picked ? "text-[#f3a39a]" : "text-white/75";
          return (
            <button key={o} type="button" disabled={done} onClick={() => onPick(i)} className={`flex w-full items-center justify-between gap-3 border-b border-white/8 py-3.5 text-left text-[1.1875rem] ${look}`}>
              <span className="min-w-0">{o}</span>
              {done && i === q.ok && <Icon name="check" className="size-5 shrink-0" />}
              {done && i === picked && i !== q.ok && <Icon name="x" className="size-5 shrink-0" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// İngilizce (Seyhun 2026-10-26: "fitness sayfası gibi, arka planlı… kelimeyle ilgili cümleler olsun, diyalog olsun… öyle hemen
// öğrendim, neyi öğrendin?… İngilizce her şeyi tıklayarak duyabilmeliyiz"; "asıl amaç bir kelimeyi veya bir cümleyi öğrenmek,
// onu ön plana çıkaralım"; örnek /mnt/project-files/ingilizce-kelime/yeni/ornek-2.png). Koyu, soluk fotoğraflı ekranda tek kart:
// kelime ya da cümle büyük, anlamı, örnek cümleler ve kısa diyalog (yapay zeka bir kez hazırlar, desteye yazılır). Altta Geç ve
// Sına (3 soru: hepsi doğruysa Öğrendiklerim'e, değilse yarın yeniden). Listeler, konular ve Ekle "⋯" içinde.
// Deste kelime kartıyla aynı (orgs/{orgId}/english/deck, features/words/wordData.js).
export default function EnglishPage() {
  const { profile, isOwner } = useAuth();
  const orgId = isOwner ? profile?.orgId || "" : "";
  const toast = useToast();
  const today = todayStr();
  const [deck, setDeck] = useState(null);
  const [kind, setKind] = useState("word");
  const [topic, setTopic] = useState("");
  const [skip, setSkip] = useState([]);
  const [pin, setPin] = useState("");
  const [menu, setMenu] = useState(false);
  const [allKnown, setAllKnown] = useState(false);
  const [add, setAdd] = useState(false);
  const [text, setText] = useState("");
  const [adding, setAdding] = useState(false);
  const [wait, setWait] = useState("");
  const [tried, setTried] = useState([]);
  // Sına: { w, qs, step, picked, right, done }
  const [quiz, setQuiz] = useState(null);

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

  const cur = useMemo(() => (deck ? (pin && findWord(deck, pin)) || pageCard(deck, { kind, today, topic, skip }) : null), [deck, pin, kind, today, topic, skip]);
  // Tekrarı gelen çalışma kelimesi gösterilince o günün tekrarı sayılır (kelime kartındaki gibi)
  const curKey = cur?.status === "study" && (!cur.due || cur.due <= today) ? cur.en : "";
  useEffect(() => {
    if (curKey) updateDeck(orgId, (d) => reviewWord(d, curKey, today)).catch(() => {});
  }, [curKey, orgId, today]);

  // Kartın ek örnekleri yoksa bir kez hazırlanır ve desteye yazılır (bu açılışta aynı kart için yeniden sorulmaz)
  const need = cur && !hasMore(cur) && !tried.includes(cur.en) ? cur : null;
  useEffect(() => {
    if (!need) return;
    Promise.resolve()
      .then(() => {
        setTried((t) => [...t, need.en]);
        setWait(need.en);
        return moreWord(need);
      })
      .then((m) => updateDeck(orgId, (d) => setMore(d, need.en, m)))
      .then(setDeck, () => {})
      .finally(() => setWait((v) => (v === need.en ? "" : v)));
  }, [need, orgId]);

  const save = async (fn) => {
    try {
      setDeck(await updateDeck(orgId, fn));
      return true;
    } catch {
      toast("Kaydedemedim, bağlantıyı kontrol et");
      return false;
    }
  };
  const next = () => {
    if (!cur) return;
    setSkip((s) => [...s, cur.en]);
    setPin("");
  };
  const pickKind = (k) => {
    setKind(k);
    setTopic("");
    setSkip([]);
    setPin("");
  };
  const open = (w) => {
    setPin(w.en);
    setMenu(false);
  };
  const startQuiz = () => cur && setQuiz({ w: cur, qs: quizFor(deck, cur), step: 0, picked: null, right: 0, done: false });
  const pickOpt = (i) => setQuiz((z) => ({ ...z, picked: i, right: z.right + (i === z.qs[z.step].ok ? 1 : 0) }));
  const goOn = async () => {
    const z = quiz;
    if (z.done) {
      // Sınanan kart geçilir (yanlışsa yarına kaldı, doğruysa öğrenildi): sıradaki gelir
      setQuiz(null);
      setSkip((s) => [...s, z.w.en]);
      setPin("");
      return;
    }
    if (z.step + 1 < z.qs.length) {
      const q = z.qs[z.step + 1];
      if (q.kind === "listen") sayEn(q.say);
      setQuiz({ ...z, step: z.step + 1, picked: null });
      return;
    }
    const all = z.right === z.qs.length;
    setQuiz({ ...z, done: true });
    await save((d) => (all ? knowWord(d, z.w.en, today) : missWord(d, z.w, today)));
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
        setPin(w.en);
      }
    } catch (e) {
      toast(e?.message || "Hazırlayamadım, tekrar dene");
    } finally {
      setAdding(false);
    }
  };

  const studying = deck ? studyRows(deck, kind) : [];
  const known = deck ? knownList(deck, kind) : [];
  const topics = deck && kind === "phrase" ? topicStats(deck) : [];
  const shown = allKnown ? known : known.slice(0, 5);
  const gaps = deck ? cleanGaps(deck.gaps).length : 5;
  const box = cur?.status === "study" ? Math.min(cur.box, gaps) : cur?.status === "known" ? gaps : 0;
  const q = quiz && !quiz.done ? quiz : null;

  return (
    <main data-theme="dark" className="navy fit-dark relative mx-auto flex min-h-dvh max-w-[30rem] flex-col px-6 pb-[calc(var(--dome-h,var(--stage-h,6rem))+1rem)]">
      <Photo />
      <header className="relative flex items-center justify-between gap-3 pt-[calc(0.75rem+env(safe-area-inset-top))] text-[0.875rem] text-white/45">
        {quiz ? (
          <>
            <Button variant="icon" size="sm" aria-label="Sınavı kapat" onClick={() => setQuiz(null)} className="!text-white/50">
              <Icon name="x" className="size-5" />
            </Button>
            <span className="tabular-nums">{quiz.done ? "" : `${quiz.step + 1} / ${quiz.qs.length}`}</span>
            <span className="size-9" />
          </>
        ) : (
          <>
            <BackButton href="/" className="opacity-60" />
            <div className="flex items-center gap-1">
              {[
                ["word", "Kelime"],
                ["phrase", "Cümle"],
              ].map(([k, l], i) => (
                <span key={k} className="flex items-center gap-1">
                  {i > 0 && <span aria-hidden="true">·</span>}
                  <button type="button" aria-pressed={kind === k} onClick={() => pickKind(k)} className={`px-1.5 py-2 ${kind === k ? "font-semibold text-white/85" : ""}`}>
                    {l}
                  </button>
                </span>
              ))}
            </div>
            <Button variant="icon" size="sm" aria-label="Listeler ve ekle" onClick={() => setMenu(true)} className="!text-white/50">
              <Icon name="more" className="size-5" />
            </Button>
          </>
        )}
      </header>

      <section className="relative flex flex-1 flex-col justify-center" aria-label="İngilizce">
        {!deck && <Loading label="Yükleniyor" />}
        {deck && !quiz && (cur ? <Card w={cur} wait={wait === cur.en} /> : <p className="text-[1.25rem] font-semibold">{kind === "phrase" ? "Bu konunun hepsini öğrendin." : "Listedeki her kelimeyi öğrendin."}</p>)}
        {q && <Quiz qs={q.qs} step={q.step} picked={q.picked} onPick={pickOpt} />}
        {quiz?.done && (
          <div className="py-6">
            <b className="block text-[3.25rem] font-bold leading-none tabular-nums tracking-[-.03em]">
              {quiz.right} / {quiz.qs.length}
            </b>
            <button type="button" onClick={() => sayEn(quiz.w.en)} className="mt-4 block text-left text-[1.5rem] font-semibold">
              {quiz.w.en}
            </button>
            <p className={`mt-1.5 text-[1.0625rem] ${quiz.right === quiz.qs.length ? "text-[#9fe7c6]" : "text-white/55"}`}>{quiz.right === quiz.qs.length ? "Öğrendiklerine eklendi" : "Yarın yeniden soracağım"}</p>
          </div>
        )}
      </section>

      {deck && (cur || quiz) && (
        <footer className="relative flex items-center justify-between gap-3">
          {quiz ? <span /> : (
            <Button variant="text" onClick={next} className="!text-white/50">
              Geç
            </Button>
          )}
          {!quiz && (
            <div className="flex gap-1.5" aria-label={`Tekrar ${box} / ${gaps}`}>
              {Array.from({ length: gaps }, (_, i) => (
                <i key={i} className={`size-1.5 rounded-full ${i < box ? "bg-[#67e8f9]" : "bg-white/20"}`} />
              ))}
            </div>
          )}
          {(!quiz || quiz.picked != null || quiz.done) && (
            <Button variant="secondary" full={false} onClick={quiz ? goOn : startQuiz} className="!h-12 !rounded-full !border-0 !bg-[#67e8f9]/14 !px-7 !text-[#67e8f9] !shadow-none">
              {!quiz ? "Sına" : quiz.done ? "Sıradaki" : "Devam"}
            </Button>
          )}
        </footer>
      )}

      <Sheet open={menu} onClose={() => setMenu(false)} navy title={kind === "phrase" ? "Cümleler" : "Kelimeler"}>
        <div className="space-y-6 pb-1">
          <Button
            variant="secondary"
            onClick={() => {
              setMenu(false);
              setAdd(true);
            }}
          >
            {kind === "phrase" ? "Cümle ekle" : "Kelime ekle"}
          </Button>
          {topics.length > 0 && (
            <section>
              <ListHead title="Konular" />
              <RowList>
                {topics.map((t) => (
                  <Row key={t.topic} title={t.topic} right={<span className={topic === t.topic ? "text-acc" : "text-mut"}>{`${t.known}/${t.total}`}</span>} onClick={() => (setTopic(topic === t.topic ? "" : t.topic), setSkip([]), setPin(""), setMenu(false))} chev={false} />
                ))}
              </RowList>
            </section>
          )}
          {studying.length > 0 && (
            <section>
              <ListHead title="Çalışıyorum" count={studying.length} />
              <RowList>
                {studying.map((w) => (
                  <Row key={w.en} title={w.en} sub={w.tr} onClick={() => open(w)} chev={false} right={<span className="whitespace-nowrap rounded-full bg-accbg px-2 py-0.5 text-[0.75rem] font-semibold text-acc">{dueText(w.due, today)}</span>} />
                ))}
              </RowList>
            </section>
          )}
          {known.length > 0 && (
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
                  <Row key={w.en} title={w.en} sub={w.tr} onClick={() => open(w)} chev={false} right={w.kd ? <Tag tone="st">{dayText(w.kd)}</Tag> : null} />
                ))}
              </RowList>
            </section>
          )}
        </div>
      </Sheet>

      <Sheet open={add} onClose={() => !adding && setAdd(false)} navy title={kind === "phrase" ? "Cümle ekle" : "Kelime ekle"}>
        <div className="space-y-4 pb-1">
          <Field
            label={kind === "phrase" ? "İngilizce ya da Türkçe cümle" : "İngilizce ya da Türkçe kelime"}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addNew()}
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
