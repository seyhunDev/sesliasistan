"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useSpeech } from "@/hooks/useSpeech";
import { courseVoice, dropSend } from "./courseVoice";

// Sesle parkur (Seyhun 2026-11-05 "bas konuş değil; tıkladım, konuştum, gönder dedim, gönderdi; uzun konuşma da olabilir"):
// asistan düğmesine bir dokunuş → alt pencere dinler (parkur arkada açık), yazı akar; Gönder ya da "gönder" deyince yapay zekâ çözer
// (courseVoice: telefondaki parkur kuralları + parkur yapay zekâsı) ve hemen parkura yazar (apply). Düğmeler hep iki: solda vazgeç, sağda iş.
// Dinlerken İptal · Gönder; işlerken Vazgeç · (dönen halka) Çözümlüyorum; yazılınca Geri al · Devam konuş; hata İptal · Tekrar dene.
const TERMS = ["rüzgâr", "eksen", "rota", "parkur", "trapez", "orsa", "pin", "komite", "knot", "derece", "arası", "finiş", "sağanak", "kart", "grup", "Altın", "Gümüş", "Bronz"];
const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export function CourseTalk({ open, onClose, course, apply, undo, onWrote }) {
  const [st, setSt] = useState("idle"); // listen · busy · done · fail
  const [text, setText] = useState("");
  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");
  const prev = useRef(null);
  const run = useRef(0);
  const alive = useRef(false); // pencere açık (kapandıktan sonra gelen çeviri yazılmaz)
  const go = async (said) => {
    if (!alive.current) return;
    const t = dropSend(said);
    if (!t) return setSt("idle"), onClose();
    setText(t);
    setSt("busy");
    const my = ++run.current;
    try {
      const r = await courseVoice(t, course);
      if (my !== run.current) return; // Vazgeç'e basıldı: hiçbir şey yazılmaz
      if (r.error) throw new Error("Yapay zekâya ulaşamadım. İnterneti kontrol edip tekrar dene.");
      if (r.need) throw new Error(r.need === "axis" ? "Önce ekseni söyle: “eksen 320”." : "Önce rüzgârı söyle: “rüzgâr 330, 12 knot”.");
      if (r.none) throw new Error("Parkurla ilgili bir şey anlayamadım.");
      prev.current = course;
      const out = await apply(r);
      if (my !== run.current) return;
      setItems(out);
      setSt("done");
      onWrote?.(out.filter((x) => !x.miss).map((x) => x.k));
    } catch (e) {
      if (my !== run.current) return;
      setErr(e?.message || "Yazılamadı, tekrar dene.");
      setSt("fail");
    }
  };
  const sp = useSpeech({ terms: TERMS, onFinal: (t) => void go(t), onFail: (m) => (setErr(m), setSt("fail")), onMiss: () => {
      // ses yazıya dönmediyse (sessizlik, bağlantı): bekleme sürmesin
      if (stRef.current !== "busy") return;
      setErr((e) => e || "Sesini anlayamadım, tekrar konuş.");
      setSt("fail");
    },
  });
  const stRef = useRef(st);
  useEffect(() => {
    stRef.current = st;
  }, [st]);
  const live = `${sp.finalText || ""}${sp.interim ? ` ${sp.interim}` : ""}`.trim();
  const listen = () => {
    setText("");
    setItems([]);
    setErr("");
    setSt("listen");
    sp.start({ autoStop: 0 });
  };
  // Gönder: yazı hemen soluklaşır, çeviri bitince (onFinal) çözülür
  const send = () => {
    setText(live);
    setSt("busy");
    sp.stop("send");
  };
  // pencere açılınca dinlemeye başlar; kapanınca susar
  useEffect(() => {
    if (!open) return;
    alive.current = true;
    const t = setTimeout(listen, 0);
    return () => (clearTimeout(t), (alive.current = false), sp.cancel?.(), run.current++);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  // "… gönder" deyince gönderilir
  useEffect(() => {
    if (st !== "listen" || !/g[öo]nder[\s.!]*$/i.test(live)) return;
    const t = setTimeout(send, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, st]);
  if (!open) return null;
  const close = () => ((alive.current = false), sp.cancel?.(), run.current++, setSt("idle"), onClose());
  return (
    <div className="masa-talk" role="dialog" aria-label="Sesle parkur">
      {st === "listen" || st === "busy" ? (
        <>
          <div className={`masa-talk-orb${st === "listen" ? " on" : ""}`} aria-hidden="true" />
          <p className="masa-talk-st">{st === "listen" ? `Dinliyorum · ${mmss(sp.elapsed || 0)}` : "Çözümlüyorum"}</p>
          <p className={`masa-talk-tx${st === "busy" ? " dim" : ""}`}>{(st === "busy" ? text : live) || "…"}</p>
          <div className="masa-talk-row">
            <Button variant="secondary" onClick={close}>
              {st === "busy" ? "Vazgeç" : "İptal"}
            </Button>
            <Button onClick={send} loading={st === "busy"} disabled={st === "busy"}>
              {st === "busy" ? "Çözümlüyorum" : "Gönder"}
            </Button>
          </div>
        </>
      ) : st === "done" ? (
        <>
          <h4 className="masa-talk-h">Yazdım</h4>
          <ul className="masa-talk-list">
            {items.map((x, i) => (
              <li key={i} className={x.miss ? "no" : ""}>
                <i aria-hidden="true">{x.miss ? "!" : "✓"}</i>
                <div>
                  <b>{x.t}</b>
                  {x.s ? <span>{x.s}</span> : null}
                </div>
              </li>
            ))}
          </ul>
          <div className="masa-talk-row">
            <Button variant="secondary" onClick={async () => (prev.current ? await undo(prev.current) : null, close())}>
              Geri al
            </Button>
            <Button onClick={() => ((alive.current = true), listen())}>Devam konuş</Button>
          </div>
        </>
      ) : st === "fail" ? (
        <>
          <p className="masa-talk-err">{err}</p>
          {text ? <p className="masa-talk-tx dim">{text}</p> : null}
          <div className="masa-talk-row">
            <Button variant="secondary" onClick={close}>
              İptal
            </Button>
            <Button onClick={() => ((alive.current = true), text ? go(text) : listen())}>Tekrar dene</Button>
          </div>
        </>
      ) : null}
    </div>
  );
}
