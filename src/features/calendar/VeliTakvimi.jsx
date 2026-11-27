"use client";

import "./toplu.css";
import { useCallback, useMemo, useState } from "react";
import { Sheet, SheetActions, SheetTone } from "@/components/ui/Sheet";
import { PdfViewer } from "@/components/ui/PdfViewer";
import { useData } from "@/features/data/DataProvider";
import { todayStr } from "@/lib/utils/format";
import { monthLabel, monthsAhead } from "@/lib/topluAntrenman";
import { cleanExt, monthOf, parentRaces, parentTrainings, periodTitle } from "@/lib/veliTakvimi";
import { useAuth } from "@/features/auth/AuthProvider";
import { audLabel } from "@/lib/kimler";
import { KimlerPick, useKimler } from "./Kimler";

// Veli takvimi (Seyhun 2026-11-26; örnek project-files/toplu-antrenman/ornek.html): aylar · başlık · not → "PDF hazırla".
// PDF görüntüleyicide Paylaş: iPhone paylaşım penceresi (Mail, WhatsApp, Dosyalar). Çizim veliPdf.js, veri lib/veliTakvimi.js.
// Son yazılan başlık ve not bu cihazda hatırlanır (yalnız kolaylık).
const KEY = "sa-veli-takvim";
const saved = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
};
const short = (d) => new Date(`${d}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
const range = (a, b) => (!b || a === b ? short(a) : `${short(a)} – ${short(b)}`);
export function VeliTakvimi({ open, onClose, month, prefill }) {
  const { plans, updateRecord } = useData();
  const { profile } = useAuth();
  const kim = useKimler();
  const [raceOpen, setRaceOpen] = useState("");
  const today = todayStr();
  const all = useMemo(() => monthsAhead(today, 13), [today]);
  const [f, setF] = useState(() => {
    const s = saved();
    const start = month && all.includes(month) ? month : today.slice(0, 7);
    const i = all.indexOf(start);
    return { months: prefill?.months?.length ? prefill.months.filter((m) => all.includes(m)) : all.slice(i, i + 3), title: s.title || "", note: s.note || "", size: s.size === "a4" ? "a4" : "tel", ext: s.ext && typeof s.ext === "object" ? s.ext : {} };
  });
  const [view, setView] = useState(false);
  const put = (p) => setF((x) => ({ ...x, ...p }));
  const flip = (m) => put({ months: f.months.includes(m) ? f.months.filter((x) => x !== m) : [...f.months, m] });
  const months = useMemo(() => [...f.months].sort(), [f.months]);
  const n = useMemo(() => parentTrainings(plans, months).length, [plans, months]);
  const races = useMemo(() => parentRaces(plans, months, null, f.ext), [plans, months, f.ext]);
  // Ekstra gün yalnız PDF içindir, yarış planı değişmez
  const bump = (id, k, d) => put({ ext: { ...f.ext, [id]: { ...cleanExt(f.ext[id]), [k]: cleanExt({ [k]: cleanExt(f.ext[id])[k] + d })[k] } } });
  const nRace = races.length;
  // Yarışın kimleri yarış planına yazılır (Takvim, PDF); yarışa katılacak hesaplar audUids (sporcu tarafında yalnız görünürlük)
  const setRaceAud = (r, aud) => updateRecord("plan", r.id, aud ? { aud, audUids: kim.uidsOf(aud) } : { aud: null, audUids: null }, { name: profile?.name ?? "Kullanıcı" });
  const hol = useMemo(() => months.reduce((a, ym) => a + monthOf(ym).notes.filter((x) => !x.half).length, 0), [months]);

  const make = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ title: f.title, note: f.note, ext: f.ext, size: f.size }));
    } catch {}
    setView(true);
  };
  const load = useCallback(async () => {
    // Telefon (varsayılan, Seyhun 2026-11-27: WhatsApp'tan telefonda açılıyor): her ay ayrı uzun sayfa; A4: yazdırmak için
    const opts = { plans, months, title: f.title.trim(), note: f.note.trim(), ext: f.ext };
    const [{ loadFonts }] = await Promise.all([import("@/features/athletes/raceDocs")]);
    if (f.size === "a4") return (await import("./veliPdf")).buildParentPdf(opts, await loadFonts());
    return (await import("./veliPdfTelefon")).buildPhonePdf(opts, await loadFonts());
    // PDF bir kez hazırlanır (açıkken veri değişse de yeniden çizilmez)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  return (
    <>
      <SheetTone.Provider value="sahne">
        <Sheet open={open && !view} onClose={onClose} title="PDF hazırla" footer={<SheetActions onCancel={onClose} yes="PDF hazırla" onYes={make} disabled={!months.length} />}>
          <div className="tb">
            <div>
              <div className="tb-k">Aylar</div>
              <div className="tb-chips">
                {all.map((m) => (
                  <button key={m} type="button" data-press aria-pressed={f.months.includes(m)} className="tb-chip" onClick={() => flip(m)}>
                    {monthLabel(m)}
                  </button>
                ))}
              </div>
            </div>
            {races.length > 0 && (
              <div>
                <div className="tb-k">Yarışlar · kimler katılır</div>
                <div className="tb-list">
                  {races.map((r) => (
                    <div key={r.id} className="tb-li">
                      <button type="button" data-press="row" className="tb-row" aria-expanded={raceOpen === r.id} onClick={() => setRaceOpen(raceOpen === r.id ? "" : r.id)}>
                        <span className="tb-rn">
                          {r.title}
                          <small>{range(r.date, r.endDate)}</small>
                        </span>
                        <b>{audLabel(r.aud)}</b>
                      </button>
                      {raceOpen === r.id && (
                        <>
                          <KimlerPick value={r.aud} onChange={(aud) => setRaceAud(r, aud)} classes={kim.classes} />
                          {[["pre", "Önce"], ["post", "Sonra"]].map(([k, l]) => (
                            <div key={k} className="tb-row tb-step">
                              <span>{l}</span>
                              <button type="button" data-press aria-label={`${l} bir gün az`} disabled={!cleanExt(f.ext[r.id])[k]} onClick={() => bump(r.id, k, -1)}>−</button>
                              <b>{cleanExt(f.ext[r.id])[k] ? `${cleanExt(f.ext[r.id])[k]} gün` : "Yok"}</b>
                              <button type="button" data-press aria-label={`${l} bir gün ekle`} disabled={cleanExt(f.ext[r.id])[k] >= 3} onClick={() => bump(r.id, k, 1)}>+</button>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <label className="tb-row">
              <span>Başlık</span>
              <input value={f.title} onChange={(e) => put({ title: e.target.value })} placeholder="İsteğe bağlı" maxLength={40} />
            </label>
            <label className="tb-row tb-note">
              <span>Not</span>
              <textarea value={f.note} onChange={(e) => put({ note: e.target.value })} placeholder="Yer, iletişim…" rows={3} maxLength={300} />
            </label>
            <div>
              <div className="tb-k">Sayfa</div>
              <div className="tb-seg tb-seg2" role="radiogroup">
                {[["tel", "Telefon"], ["a4", "A4 · yazdır"]].map(([k, l]) => (
                  <button key={k} type="button" role="radio" aria-checked={f.size === k} onClick={() => put({ size: k })}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <div className="tb-sum" aria-live="polite">
              <b>{periodTitle(months) || "Ay seç"}</b>
              {months.length > 0 && <small>{[`${n} antrenman`, nRace > 0 && `${nRace} yarış`, `${hol} tatil`].filter(Boolean).join(" · ")}</small>}
            </div>
          </div>
        </Sheet>
      </SheetTone.Provider>
      {view && (
        <PdfViewer
          title="Veli takvimi"
          load={load}
          onClose={() => {
            setView(false);
            onClose();
          }}
        />
      )}
    </>
  );
}
