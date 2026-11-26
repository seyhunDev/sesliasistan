"use client";

import { BackButton } from "@/components/ui/BackButton";
import { Icon } from "@/components/ui/Icon";
import { allPathStats, chunkById, chunkState, chunkStats, patternText, pathStats } from "@/lib/englishChunkStudy";
import { PATHS, SIT_INFO, pathById } from "@/lib/englishPaths";
import { enHead } from "./fonts";

// İngilizce açılışı ve bölüm sayfası (Seyhun 2026-11-26, örnek /mnt/project-files/ingilizce-hatirla/acilis.html onaylandı).
// Açılış: "Bugün ne çalışalım?", sarı "Kaldığın yer" kartı (son açılan kalıp, bu cihazda), altında bölümler (lib/englishPaths.js PATHS)
// ve her birinin ilerlemesi; hepsi çalışıldıysa yeşil "Tamamlandı" + "Baştan çalış". Bölüm sayfası: ilerleme, gruplar (fiil satırı
// noktalı, durum kutuları, kalıp konuları), altta sarı "Devam et". Yeni bölüm PATHS'e eklenince burada kendiliğinden görünür.
// Altyazı diliyle aynı: koyu zemin, Bricolage başlık, sarı vurgu. Telefon tek sütun, iPad (md) üç sütun / iki sütun.
const LAST_KEY = "sa-en-son";
export function lastChunk() {
  try {
    return chunkById(localStorage.getItem(LAST_KEY) || "");
  } catch {
    return null;
  }
}
export function rememberChunk(id) {
  try {
    localStorage.setItem(LAST_KEY, id);
  } catch {
    /* yok */
  }
}

const Y = "#ffe14d";
const G = "#3ddc84";
// Kalıbın kısa adı: fiilde "get = almak", diğerlerinde iskelet
export const chunkLabel = (c) => (c.path === "fiil" ? `${c.topic} = ${c.rule}` : patternText(c));

function Bar({ n, of, color }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/12">
        <i className="block h-full rounded-full" style={{ width: `${of ? Math.round((n / of) * 100) : 0}%`, background: color }} />
      </div>
      <span className="whitespace-nowrap text-[0.8rem] font-semibold tabular-nums text-white/75">
        {n} / {of}
      </span>
    </div>
  );
}

function Shell({ title, onBack, children }) {
  return (
    <div className={`${enHead.variable} relative flex flex-1 flex-col`}>
      <header className="relative flex items-center justify-between pt-[calc(0.75rem+env(safe-area-inset-top))] text-white/70">
        {onBack ? <BackButton onClick={onBack} className="opacity-70" /> : <BackButton href="/" className="opacity-70" />}
        <b className="font-[family-name:var(--en-font)] text-[0.875rem] font-bold tracking-[.08em] text-white">{title}</b>
        <span className="size-9" />
      </header>
      {children}
    </div>
  );
}

// onPath(id): bölümü aç; onResume(c): kaldığın yerden; onAgain(id): bölümü baştan; onWords: eski Kelime/Cümle
export function EnHome({ deck, today, onPath, onResume, onAgain, onWords }) {
  const st = chunkStats(deck, today);
  const last = lastChunk();
  const rows = allPathStats(deck);
  return (
    <Shell title="İNGİLİZCE">
      <div className="relative flex flex-1 flex-col gap-4 py-5 md:gap-6 md:py-8">
        <div>
          <h1 className="text-balance font-[family-name:var(--en-font)] text-[2rem] font-extrabold leading-[1.05] tracking-[-.01em] md:text-[2.75rem]">Bugün ne çalışalım?</h1>
          <p className="mt-1.5 text-[0.9rem] text-white/55">
            {st.days ? `${st.days} gün üst üste · ` : ""}
            {st.known + st.study} kalıp çalıştın
          </p>
        </div>
        {last && (
          <button type="button" onClick={() => onResume(last)} style={{ background: Y }} className="flex items-center gap-3 rounded-[1.25rem] px-4 py-3.5 text-left text-[#1a1505] active:scale-[.99]">
            <span className="min-w-0 flex-1">
              <b className="block truncate font-[family-name:var(--en-font)] text-[1.0625rem] font-extrabold">Kaldığın yer: {chunkLabel(last)}</b>
              <small className="block truncate text-[0.8rem] opacity-75">
                {pathById(last.path).name} · {last.topic}
              </small>
            </span>
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#1a1505]" style={{ color: Y }}>
              <Icon name="chev" className="size-5" />
            </span>
          </button>
        )}
        <div className="grid gap-3 md:grid-cols-3 md:gap-4">
          {rows.map(({ path: p, done, total, complete }) => (
            <div key={p.id} className="relative flex min-h-[9.5rem] flex-col gap-2 overflow-hidden rounded-[1.5rem] border border-white/8 p-[1.125rem] md:min-h-[15rem] md:p-[1.375rem]" style={{ background: `linear-gradient(145deg, ${p.color}38, ${p.color}0a)` }}>
              <button type="button" onClick={() => onPath(p.id)} aria-label={p.name} className="absolute inset-0" />
              <span className="text-[0.7rem] font-bold tracking-[.14em] text-white/60">{p.name.toLocaleUpperCase("tr-TR")}</span>
              <span className="font-[family-name:var(--en-font)] text-[2rem] font-extrabold leading-none tracking-[-.02em] md:text-[2.25rem]">{p.big}</span>
              <span className="text-[0.85rem] leading-snug text-white/70">{p.desc}</span>
              <div className="mt-auto">
                {complete ? (
                  <div className="relative flex items-center gap-4 text-[0.8rem] font-bold">
                    <span className="inline-flex items-center gap-1.5" style={{ color: G }}>
                      <Icon name="check" className="size-4" /> Tamamlandı
                    </span>
                    <button type="button" onClick={() => onAgain(p.id)} className="font-semibold text-white/65 underline underline-offset-4">
                      Baştan çalış
                    </button>
                  </div>
                ) : done ? (
                  <Bar n={done} of={total} color={p.color} />
                ) : (
                  <span className="text-[0.8rem] font-bold" style={{ color: p.color }}>
                    Yeni · Başla
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
        <button type="button" onClick={onWords} className="mt-auto self-center py-3 text-[0.875rem] font-semibold text-white/45">
          Kelimelerim ve cümlelerim
        </button>
      </div>
    </Shell>
  );
}

// Bölüm sayfası. onTopic(topic): o grubu çalış; onStart(): sıradaki; onAgain(): baştan; onBack(): açılışa
export function PathPage({ pathId, deck, onBack, onTopic, onStart, onAgain }) {
  const p = pathById(pathId);
  const s = pathStats(deck, p.id);
  const dot = (c) => {
    const x = chunkState(deck, c.id);
    return x?.st === "known" ? G : x ? p.color : "";
  };
  return (
    <Shell title={p.name.toLocaleUpperCase("tr-TR")} onBack={onBack}>
      <div className="relative flex flex-1 flex-col gap-5 py-5 md:py-8">
        <div className="flex flex-col gap-2.5">
          <h1 className="font-[family-name:var(--en-font)] text-[2rem] font-extrabold leading-none tabular-nums md:text-[2.75rem]">
            {s.done} / {s.total} {p.unit}
          </h1>
          {s.complete ? (
            <div className="flex items-center gap-4 text-[0.875rem] font-bold">
              <span className="inline-flex items-center gap-1.5" style={{ color: G }}>
                <Icon name="check" className="size-4" /> Tamamlandı
              </span>
              <button type="button" onClick={onAgain} className="font-semibold text-white/65 underline underline-offset-4">
                Baştan çalış
              </button>
            </div>
          ) : (
            <Bar n={s.done} of={s.total} color={p.color} />
          )}
        </div>

        {p.id === "durum" ? (
          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-3.5">
            {p.topics.map((t) => {
              const l = p.chunks.filter((c) => c.topic === t);
              const n = l.filter((c) => chunkState(deck, c.id)).length;
              const full = n === l.length;
              return (
                <button key={t} type="button" onClick={() => onTopic(t)} className="flex min-h-[6.25rem] flex-col justify-between gap-1 rounded-[1.1rem] p-3.5 text-left md:min-h-[8rem]" style={{ background: full ? `${G}24` : n ? `${p.color}24` : "rgba(255,255,255,.06)" }}>
                  <b className="font-[family-name:var(--en-font)] text-[1.15rem] font-extrabold leading-tight">{t}</b>
                  <small className="text-[0.75rem] text-white/55">{SIT_INFO[t]?.sub}</small>
                  <span className="flex items-center gap-1 text-[0.75rem] font-semibold" style={{ color: full ? G : n ? p.color : "rgba(255,255,255,.45)" }}>
                    {full ? (
                      <>
                        <Icon name="check" className="size-3.5" /> Tamamlandı
                      </>
                    ) : n ? (
                      `${n} / ${l.length}`
                    ) : (
                      "Başla"
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 md:gap-x-9">
            {p.topics.map((t) => {
              const l = p.chunks.filter((c) => c.topic === t);
              const verb = p.id === "fiil";
              return (
                <button key={t} type="button" onClick={() => onTopic(t)} className="flex items-center gap-3.5 border-b border-white/8 py-3.5 text-left">
                  <span className={`shrink-0 font-[family-name:var(--en-font)] font-extrabold ${verb ? "min-w-[4.5rem] text-[1.5rem]" : "min-w-0 flex-1 text-[1.15rem]"}`} style={{ color: l.every((c) => dot(c) === G) ? G : "#fff" }}>
                    {t}
                  </span>
                  {verb && <span className="min-w-0 flex-1 text-[0.8rem] leading-snug text-white/55">{l.map((c) => c.rule).join(" · ")}</span>}
                  <span className="flex shrink-0 gap-1">
                    {l.map((c) => (
                      <i key={c.id} className="size-2 rounded-full" style={{ background: dot(c) || "rgba(255,255,255,.14)" }} />
                    ))}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <button type="button" onClick={onStart} style={{ background: Y }} className="mt-auto flex h-[3.75rem] w-full items-center justify-center gap-2.5 self-center rounded-full text-[1.0625rem] font-bold text-[#1a1505] active:scale-[.98] md:h-[4.25rem] md:max-w-[32rem]">
          {s.done ? "Devam et" : "Başla"}
          <Icon name="chev" className="size-5" />
        </button>
      </div>
    </Shell>
  );
}

export { PATHS };
