"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Label, Seg, card } from "@/components/ui/Page";
import { useToast } from "@/components/ui/ToastProvider";
import { compressImage, thumbFromDataUrl } from "@/lib/image";
import { FORMATS, KINDS, POST_ASK_KEY, RACE_KINDS, SET_LABELS, STYLES, THEMES, aspectOf, autoOf, cleanPost, cleanTags, fullCaption, kindOf, kindTheme, classList, raceBrief, raceMeta, raceWithAthletes, reauto, setOf, themeOf, wantsPostImage, withInfo } from "./postModel";
import { drawPost, drawSlide, loadImg, postFile, thumbOf } from "./postImage";
import { askCaption, askImage, imageUsage, setPostHandler } from "./posts";

const area =
  "mt-1.5 w-full resize-none rounded-xl border border-transparent bg-bg px-3.5 py-3 text-base text-fg outline-none transition placeholder:text-mut/70 focus:border-acc focus:bg-card";
const chip = (on) =>
  `flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[0.8125rem] font-semibold transition active:scale-95 ${on ? "bg-deep text-white" : "bg-card text-fg ring-1 ring-line"}`;
const row = "flex items-center gap-3 py-2.5";
const rowLabel = "w-14 shrink-0 text-[0.8125rem] font-medium text-mut";
const small = "flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-line bg-card text-[0.875rem] font-semibold active:scale-[.98] disabled:opacity-50";

const slug = (s) =>
  String(s || "gonderi")
    .toLocaleLowerCase("tr-TR")
    .replace(/[çğıöşü]/g, (c) => ({ ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u" })[c])
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "gonderi";

// Kaydedilmemiş değişiklik var mı (küçük görsel ve kimlik hariç)
const sig = (x) => JSON.stringify(cleanPost({ ...x, thumb: "" }));

// Kopyalama: önce panoya yazma (Safari dokunuş içinde ister), olmazsa eski yol
function copyText(t) {
  try {
    if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(t).then(() => true, () => legacyCopy(t));
  } catch {}
  return Promise.resolve(legacyCopy(t));
}
function legacyCopy(t) {
  const el = document.createElement("textarea");
  el.value = t;
  el.setAttribute("readonly", "");
  el.style.position = "fixed";
  el.style.opacity = "0";
  document.body.appendChild(el);
  el.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {}
  el.remove();
  return ok;
}

// Gönderi ekranı: önizleme + tasarım (biçim, şablon, renk) + paylaş; yarış (sporcular, sınıflar), tür, görsel, görseldeki yazılar, açıklama.
// Yapay zeka ayrı kutuda değil: yarış bağlanınca açıklama kendiliğinden yazılır, değişiklikler ana asistana söylenir
// ("daha kısa yaz", "Mete 2. oldu diye ekle", "gün batımında teknelerle görsel üret"; setPostHandler).
// onSave(post, photo) → kimlik; photo undefined: fotoğraf değişmedi, "": kaldırıldı, dataURL: yeni.
export function PostEditor({ start: given, startPhoto = "", onSave, onDelete, onRaces, onAthletes }) {
  const toast = useToast();
  const [start] = useState(() => withInfo(given));
  const [p, setP] = useState(start);
  const [tags, setTags] = useState(start.hashtags.join(" "));
  const [photo, setPhoto] = useState(startPhoto);
  const [img, setImg] = useState(null);
  const [photoDirty, setPhotoDirty] = useState(false);
  const [saved, setSaved] = useState(() => sig(start));
  const [busy, setBusy] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [err, setErr] = useState("");
  const [aiErr, setAiErr] = useState("");
  const [races, setRaces] = useState(null);
  const [usage, setUsage] = useState(null);
  const [texts, setTexts] = useState(true);
  const canvas = useRef(null);
  const file = useRef(null);
  const setFiles = useRef({});
  const fileInput = useRef(null);
  const moreInput = useRef(null);
  const latest = useRef(null);
  // Yapay zekanın son yazdığı açıklama: elle değiştirilmediyse tür değişince yeni türe göre yeniden yazılır (kayıtlı gönderide elle sayılır)
  const autoCap = useRef(start.id ? null : start.caption);
  // Kaydırmalı gönderi: ek fotoğraflar (en çok 9). Yalnız bu cihazda, bu ekran açıkken durur; kaydedilmez.
  const [extras, setExtras] = useState([]); // [{ id, src, i }]
  const [set, setSet] = useState([]); // üç boyut: [{ f, thumb }]; dosyalar setFiles'ta
  const [pid, setPid] = useState(start.id || null);

  const shown = img?.src === photo ? img.i : null; // yüklenmiş fotoğraf (kaldırılınca null)
  const post = cleanPost({ ...p, hashtags: cleanTags(tags) });
  const dirty = photoDirty || sig(post) !== saved;
  const put = (k, v) => setP((x) => ({ ...x, [k]: v }));

  useEffect(() => {
    let live = true;
    if (photo) loadImg(photo).then((i) => live && setImg({ src: photo, i }), () => live && setImg(null));
    return () => {
      live = false;
    };
  }, [photo]);

  // Yapay zeka görsel sayacı (bugün / bu ay, sınır, yaklaşık maliyet): sayfa açılınca bir kez
  useEffect(() => {
    let live = true;
    imageUsage().then((u) => live && u && setUsage(u), () => {});
    return () => {
      live = false;
    };
  }, []);

  // Önizlemeyi çiz, paylaşılacak dosyayı hazırla (yazarken kısa gecikmeyle)
  const look = JSON.stringify([post.format, post.theme, post.style, post.pos, post.focus, post.shade, post.headline, post.sub, post.people, post.wish, post.info, post.classes, post.tag, post.meta, post.race]);
  useEffect(() => {
    let live = true;
    file.current = null;
    const t = setTimeout(async () => {
      if (!canvas.current) return;
      await drawPost(canvas.current, cleanPost(p), shown);
      if (!live) return;
      file.current = await postFile(canvas.current, slug(p.headline)).catch(() => null);
    }, 200);
    // Üç boyut (gönderi, hikâye, reels): küçük önizleme + paylaşılacak dosya, ana çizimden sonra
    setFiles.current = {};
    const t2 = setTimeout(async () => {
      const c = document.createElement("canvas");
      const out = [];
      for (const f of setOf(p.format)) {
        await drawPost(c, cleanPost({ ...p, format: f }), shown);
        if (!live) return;
        setFiles.current[f] = await postFile(c, `${slug(p.headline)}-${f}`).catch(() => null);
        out.push({ f, thumb: thumbOf(c, 200) });
      }
      if (live) setSet(out);
    }, 900);
    return () => {
      live = false;
      clearTimeout(t);
      clearTimeout(t2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [look, shown]);

  // Yapay zekanın yazdıkları: ilk yazımda elle değiştirilmiş görsel yazılarına dokunulmaz; asistana söylenen değişiklikte hepsi
  const apply = (r, all) =>
    setP((x) => {
      const auto = autoOf(x);
      const keep = (k) => !all && x[k] && x[k] !== auto[k];
      const out = { ...x, caption: r.caption || x.caption };
      for (const k of ["headline", "sub", "people", "wish", "tag", "info", "classes"]) if (r[k] != null && (r[k] || all) && !keep(k)) out[k] = r[k];
      return out;
    });

  // Açıklama + görsel yazıları (yapay zeka). ask: ana asistana söylenen değişiklik; yoksa ilk yazım.
  const write = async (base, ask = "") => {
    setAiErr("");
    setAiBusy(true);
    try {
      const r = await askCaption(base, ask);
      apply(r, !!ask);
      if (r.caption) autoCap.current = r.caption;
      if (r.hashtags?.length) setTags(r.hashtags.join(" "));
      return r;
    } catch (e) {
      setAiErr(e?.message || "Açıklama yazılamadı");
      throw e;
    } finally {
      setAiBusy(false);
    }
  };

  // Gemini ile görsel: yazısız fotoğraf gelir, başlık ve logo üstüne çizilir
  const makeImage = async (wish = "") => {
    setErr("");
    setBusy("img");
    try {
      const r = await askImage(post, wish.trim());
      const dataUrl = await thumbFromDataUrl(r.image, 1440, 0.85);
      setPhoto(dataUrl);
      setPhotoDirty(true);
      put("focus", 50);
      if (r.usage) setUsage(r.usage);
      return r.usage || null;
    } catch (x) {
      if (x?.usage) setUsage(x.usage);
      throw x;
    } finally {
      setBusy("");
    }
  };
  const genImage = () => makeImage().catch((x) => setErr(x?.message || "Görsel üretilemedi"));

  // Ana asistan bu ekrana söyleneni buraya verir (yalnız ekran açıkken)
  useEffect(() => {
    latest.current = { post, write, makeImage };
  });
  useEffect(() => {
    const ask = async (text) => {
      const { post: now, write: w, makeImage: mk } = latest.current;
      if (wantsPostImage(text)) {
        const u = await mk(text);
        return { say: `Yeni görseli ekledim, başlık ve logo üstünde.${u ? ` Bugün ${u.today}/${u.limit} görsel.` : ""}` };
      }
      // Boş gönderide ilk cümle ne paylaşılacağıdır (konu); sonrakiler değişiklik
      const first = !now.caption && !now.race && !now.topic.trim();
      if (first) put("topic", text);
      await w(first ? { ...now, topic: text } : now, first ? "" : text);
      return { say: first ? "Gönderiyi hazırladım: başlık, açıklama ve etiketler hazır. Değiştirmek istediğini söyle." : "Gönderiyi güncelledim." };
    };
    setPostHandler({ ask });
    return () => setPostHandler(null);
  }, []);

  // Yarıştan ya da asistandan açıldıysa açıklama kendiliğinden yazılır (bir kez)
  useEffect(() => {
    let said = "";
    try {
      said = sessionStorage.getItem(POST_ASK_KEY) || "";
      if (said) setTimeout(() => sessionStorage.removeItem(POST_ASK_KEY), 1500);
    } catch {}
    if (start.caption || (!start.race && !said)) return;
    const t = setTimeout(() => {
      if (said && !start.race) put("topic", said);
      write({ ...start, topic: start.topic || said }).catch(() => {});
    }, 50);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async (quiet) => {
    if (!canvas.current) return;
    setBusy((b) => b || "save");
    try {
      const hasPhoto = photoDirty ? !!photo : post.hasPhoto;
      const nid = await onSave({ ...post, id: pid || undefined, thumb: thumbOf(canvas.current) }, photoDirty ? photo : undefined);
      if (!pid) window.history.replaceState(null, "", `/posts/${nid}`);
      setPid(nid);
      setPhotoDirty(false);
      setP((x) => ({ ...x, hasPhoto }));
      setSaved(sig({ ...post, hasPhoto }));
      if (!quiet) toast("Gönderi kaydedildi");
    } catch (e) {
      if (!quiet) setErr(e?.message || "Kaydedilemedi");
    } finally {
      setBusy((b) => (b === "save" ? "" : b));
    }
  };

  const getFile = async () => file.current || (canvas.current && (await postFile(canvas.current, slug(p.headline))));
  // Kapak + ek fotoğraflar (aynı boyutta, sırayla)
  const getFiles = async () => {
    const f = await getFile();
    if (!f || !extras.length) return f ? [f] : [];
    const c = document.createElement("canvas");
    const out = [f];
    for (const [k, x] of extras.entries()) {
      await drawSlide(c, post.format, x.i);
      out.push(await postFile(c, `${slug(p.headline)}-${k + 2}`));
    }
    return out;
  };
  const addExtras = async (e) => {
    const list = [...(e.target.files || [])].slice(0, 9 - extras.length);
    e.target.value = "";
    if (!list.length) return;
    setBusy("photo");
    try {
      const add = [];
      for (const f of list) {
        const { dataUrl } = await compressImage(f, 1440, 0.82);
        add.push({ id: `${Date.now()}-${add.length}`, src: dataUrl, i: await loadImg(dataUrl) });
      }
      setExtras((x) => [...x, ...add].slice(0, 9));
    } catch (x) {
      setErr(x?.message || "Fotoğraf açılamadı");
    } finally {
      setBusy("");
    }
  };

  // Paylaş: açıklama panoya, görsel paylaşım menüsüne (Instagram açıklamayı almaz; yapıştırılır). Kayıt arkada.
  const share = async () => {
    const text = fullCaption(post);
    const copied = text ? copyText(text) : Promise.resolve(false);
    const files = extras.length ? await getFiles() : [file.current || (await getFile())].filter(Boolean);
    if (files.length && navigator.canShare?.({ files })) {
      const sharing = navigator.share({ files }).catch((e) => e?.name === "NotAllowedError" && download());
      if (dirty) save(true);
      if (await copied) toast("Açıklama kopyalandı · Instagram'da yapıştır");
      await sharing;
      return;
    }
    await download();
    if (await copied) toast("Açıklama kopyalandı");
    if (dirty) save(true);
  };
  // Tek boyutu paylaş (üç boyut satırından); açıklama yine panoya
  const shareOne = async (f) => {
    const one = setFiles.current[f] || (await (async () => {
      const c = document.createElement("canvas");
      await drawPost(c, cleanPost({ ...p, format: f }), shown);
      return postFile(c, `${slug(p.headline)}-${f}`);
    })());
    const text = fullCaption(post);
    const copied = text ? copyText(text) : Promise.resolve(false);
    if (dirty) save(true);
    if (navigator.canShare?.({ files: [one] })) {
      const sharing = navigator.share({ files: [one] }).catch((e) => e?.name === "NotAllowedError" && saveFiles([one]));
      if (await copied) toast(f === "reels" ? "Açıklama kopyalandı · Instagram › Reels › galeriden seç" : "Açıklama kopyalandı · Instagram'da yapıştır");
      return sharing;
    }
    saveFiles([one]);
    if (await copied) toast("Açıklama kopyalandı");
  };
  // Üç boyutu birden indir
  const downloadSet = async () => {
    const out = [];
    for (const f of setOf(post.format)) {
      let one = setFiles.current[f];
      if (!one) {
        const c = document.createElement("canvas");
        await drawPost(c, cleanPost({ ...p, format: f }), shown);
        one = await postFile(c, `${slug(p.headline)}-${f}`);
      }
      out.push(one);
    }
    saveFiles(out);
    toast("Gönderi, hikâye ve reels indirildi");
  };
  const saveFiles = (files) => {
    for (const f of files) {
      const url = URL.createObjectURL(f);
      const a = document.createElement("a");
      a.href = url;
      a.download = f.name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    }
  };
  const download = async () => {
    for (const f of await getFiles()) {
      const url = URL.createObjectURL(f);
      const a = document.createElement("a");
      a.href = url;
      a.download = f.name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    }
  };
  const copy = async () => {
    const text = fullCaption(post);
    if (!text) return toast("Önce açıklama yaz");
    toast((await copyText(text)) ? "Açıklama kopyalandı" : "Kopyalanamadı, elle seç");
  };

  const pick = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setBusy("photo");
    try {
      let { dataUrl } = await compressImage(f, 1440, 0.82);
      if (dataUrl.length > 900_000) dataUrl = await thumbFromDataUrl(dataUrl, 1200, 0.7);
      setPhoto(dataUrl);
      setPhotoDirty(true);
    } catch (x) {
      setErr(x?.message || "Fotoğraf açılamadı");
    } finally {
      setBusy("");
    }
  };

  const openRaces = async () => {
    if (races) return setRaces(null);
    setBusy("races");
    try {
      setRaces((await onRaces()).slice(0, 12));
    } catch {
      setErr("Yarışlar alınamadı");
    } finally {
      setBusy("");
    }
  };
  // Yarış seçilince sporcuların adı ve sınıfı kulüp listesinden gelir; yazılar yenilenir, açıklama boşsa yapay zeka yazar
  const setRace = async (r) => {
    setBusy("races");
    const data = await onAthletes?.().catch(() => null);
    setBusy("");
    const race = raceBrief(data ? raceWithAthletes(r, data) : r, data ? raceWithAthletes(r, data).athletes : undefined);
    setRaces(null);
    const next = reauto(post, { ...post, race });
    setP((x) => reauto(x, { ...x, race }));
    if (!data && r.athleteIds?.length) toast("Sporcu adları alınamadı; yazıları elle düzenleyebilirsin");
    if (!post.caption) write(next).catch(() => {});
  };
  const dropRace = () => setP((x) => reauto(x, { ...x, race: null }));
  const dropAthlete = (i) =>
    setP((x) => {
      const athletes = x.race.athletes.filter((_, k) => k !== i);
      return reauto(x, { ...x, race: { ...x.race, athletes, count: athletes.length } });
    });
  // Tür değişince yazılar, renk ve desen değişir; açıklama elle değiştirilmediyse yeni türe göre yeniden yazılır
  const setKind = (k) => {
    if (k === post.kind) return;
    const next = reauto(post, { ...post, kind: k });
    setP((x) => reauto(x, { ...x, kind: k }));
    const mine = post.caption && post.caption !== autoCap.current;
    if (!mine && (post.race || post.topic.trim())) write({ ...next, caption: "" }).catch(() => {});
  };

  const del = async () => {
    if (!confirm("Bu gönderi silinsin mi?")) return;
    setBusy("del");
    try {
      await onDelete({ ...post, id: pid });
    } catch {
      setErr("Silinemedi");
      setBusy("");
    }
  };

  const race = post.race;
  const classes = classList(post.classes);
  const empty = !race && !post.caption && !post.topic;

  return (
    <div className="mt-2 pb-6">
      <div className={`${card} relative overflow-hidden`}>
        <canvas ref={canvas} className="block h-auto w-full bg-deep" style={{ aspectRatio: aspectOf(post.format) }} />
        {(aiBusy || busy === "img") && (
          <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-[0.75rem] font-semibold text-white backdrop-blur">
            <Icon name="spark" className="size-4 animate-pulse" />
            {busy === "img" ? "Görsel çiziliyor…" : "Yapay zeka yazıyor…"}
          </span>
        )}
      </div>

      {/* Ana asistana ne söyleneceği (ayrı yapay zeka kutusu yok) */}
      <div className={`mt-4 flex gap-3 rounded-2xl px-4 py-3 ${aiErr ? "bg-rec/10" : "bg-acc/10"}`}>
        <Icon name={aiErr ? "alert" : "mic"} className={`mt-0.5 size-5 shrink-0 ${aiErr ? "text-rec" : "text-acc"}`} />
        <p className="text-[0.8125rem] leading-snug">
          {aiErr ? (
            <>
              {aiErr}{" "}
              <button type="button" onClick={() => write(post).catch(() => {})} className="font-semibold text-acc underline">
                Tekrar dene
              </button>
            </>
          ) : empty ? (
            <>Ne paylaşmak istediğini alttaki asistana anlat ya da bir yarış seç; başlık, açıklama ve etiketleri yapay zeka yazar.</>
          ) : (
            <>Değiştirmek için asistana söyle: &quot;daha kısa yaz&quot;, &quot;Mete ikinci oldu diye ekle&quot;, &quot;gün batımında teknelerle görsel üret&quot;.</>
          )}
        </p>
      </div>

      <Label>1 · NE PAYLAŞACAKSIN</Label>
      <div className="flex flex-wrap gap-2">
        {KINDS.map(([k, label, icon]) => (
          <button key={k} type="button" aria-pressed={post.kind === k} className={chip(post.kind === k)} onClick={() => setKind(k)}>
            <span className="size-3.5 shrink-0 rounded-full ring-1 ring-white/60" style={{ background: `linear-gradient(135deg, ${themeOf(kindTheme(k))[2]}, ${themeOf(kindTheme(k))[3]})` }} />
            <Icon name={icon} className="size-4" />
            {label}
          </button>
        ))}
      </div>

      <Label right={RACE_KINDS.includes(post.kind) ? null : "isteğe bağlı"}>2 · YARIŞ</Label>
      <div className={`${card} px-4 py-3`}>
        <div className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-rose-500/10 text-rose-700">
            <Icon name="flag" className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <b className="block truncate text-[0.9375rem] font-semibold">{race?.name || "Yarış bağlı değil"}</b>
            <span className="block truncate text-[0.8125rem] text-mut">{race ? raceMeta(race) || "Yer ve tarih yok" : "Yarış seçilince sporcular, sınıflar ve başarı dileği gelir"}</span>
          </span>
          {race ? (
            <button type="button" onClick={dropRace} aria-label="Yarışı kaldır" className="grid size-9 place-items-center rounded-full text-mut active:bg-line">
              <Icon name="x" className="size-[1.125rem]" />
            </button>
          ) : (
            <button type="button" onClick={openRaces} disabled={busy === "races"} className="h-9 shrink-0 rounded-full bg-acc px-3.5 text-[0.8125rem] font-semibold text-white active:scale-95 disabled:opacity-60">
              {busy === "races" ? "…" : races ? "Kapat" : "Yarış seç"}
            </button>
          )}
        </div>
        {race && (
          <div className="mt-3 border-t border-line pt-3">
            {classes.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {classes.map((c) => (
                  <span key={c} className="rounded-full bg-bg px-2.5 py-1 text-[0.75rem] font-semibold ring-1 ring-line">
                    {c}
                  </span>
                ))}
              </div>
            )}
            <span className="mt-2.5 block text-[0.75rem] font-medium text-mut">{race.athletes?.length > 2 ? "Adları açıklamada geçer (görselde yalnız 1-2 sporcunun adı yazılır)" : race.athletes?.length ? "Görselde ve açıklamada geçen sporcular" : race.count ? `${race.count} sporcu (adlar alınamadı)` : "Sporcu seçilmemiş"}</span>
            {race.athletes?.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {race.athletes.map((a, i) => (
                  <span key={`${a.name}-${i}`} className="flex h-8 items-center gap-1 rounded-full bg-deep/10 pl-3 pr-1 text-[0.8125rem] font-semibold">
                    {a.name}
                    {a.cls && <small className="font-normal text-mut">· {a.cls}</small>}
                    <button type="button" aria-label={`${a.name} çıkar`} onClick={() => dropAthlete(i)} className="grid size-6 place-items-center rounded-full text-mut active:bg-line">
                      <Icon name="x" className="size-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <label className="mt-3 flex items-center justify-between gap-3">
              <span className="text-[0.8125rem]">Yer ve tarih görselde</span>
              <input type="checkbox" checked={post.meta} onChange={(e) => put("meta", e.target.checked)} className="size-5 accent-[var(--acc)]" />
            </label>
          </div>
        )}
      </div>
      {races && (
        <ul className={`${card} mt-2 divide-y divide-line overflow-hidden`}>
          {races.length === 0 && <li className="px-4 py-3 text-[0.875rem] text-mut">Kayıtlı yarış yok</li>}
          {races.map((r) => (
            <li key={r.id}>
              <button type="button" onClick={() => setRace(r)} className="block w-full px-4 py-2.5 text-left active:bg-line/50">
                <b className="block truncate text-[0.875rem] font-semibold">{r.name || "Adsız yarış"}</b>
                <span className="block truncate text-[0.75rem] text-mut">{[raceBrief(r)?.dates || "Tarih yok", r.athleteIds?.length ? `${r.athleteIds.length} sporcu` : ""].filter(Boolean).join(" · ")}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <Label>3 · FOTOĞRAF</Label>
      <div className="space-y-3">
        <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={pick} />
        <div className="flex gap-2">
          <button type="button" onClick={() => fileInput.current?.click()} disabled={busy === "photo"} className={small}>
            <Icon name="camera" className="size-[1.125rem]" />
            {busy === "photo" ? "Hazırlanıyor…" : photo ? "Fotoğrafı değiştir" : "Fotoğraf seç"}
          </button>
          <button type="button" onClick={genImage} disabled={!!busy || usage?.left === 0} className={small}>
            <Icon name="spark" className="size-[1.125rem] text-acc" />
            {busy === "img" ? "Çiziliyor…" : "Yapay zeka görseli"}
          </button>
        </div>
        {err && <p className="text-center text-[0.875rem] text-rec">{err}</p>}
        {usage && (
          <p className={`text-center text-[0.6875rem] leading-snug tabular-nums ${usage.left === 0 ? "text-rec" : "text-mut"}`}>
            Yapay zeka görseli: bugün {usage.today}/{usage.limit} · bu ay {usage.month} (≈ ${usage.cost.toFixed(2)}) · görsel başı ≈ ${usage.price}{" · "}
            <a href="https://aistudio.google.com/usage" target="_blank" rel="noreferrer" className="font-semibold text-acc underline">
              Google kotası
            </a>
          </p>
        )}
        {photo && (
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1 space-y-2">
              <label className="block">
                <span className="text-[0.75rem] font-medium text-mut">Fotoğrafı kaydır</span>
                <input type="range" min={0} max={100} value={post.focus} onChange={(e) => put("focus", Number(e.target.value))} className="mt-1 w-full accent-[var(--acc)]" />
              </label>
              <label className="block">
                <span className="text-[0.75rem] font-medium text-mut">Karartma (yazı okunsun)</span>
                <input type="range" min={0} max={100} value={post.shade} onChange={(e) => put("shade", Number(e.target.value))} className="mt-1 w-full accent-[var(--acc)]" />
              </label>
            </div>
            <button type="button" onClick={() => (setPhoto(""), setPhotoDirty(true))} aria-label="Fotoğrafı kaldır" className="grid size-10 shrink-0 place-items-center rounded-xl border border-line bg-card text-rec active:scale-95">
              <Icon name="trash" className="size-[1.125rem]" />
            </button>
          </div>
        )}
        <input ref={moreInput} type="file" accept="image/*" multiple className="hidden" onChange={addExtras} />
        <div>
          <span className="text-[0.75rem] font-medium text-mut">Kaydırmalı gönderi {extras.length ? `· ${extras.length + 1} sayfa` : "(ek fotoğraflar)"}</span>
          <div className="-mx-5 mt-1.5 flex gap-2 overflow-x-auto px-5 pb-0.5 [scrollbar-width:none]">
            {extras.map((x, k) => (
              <span key={x.id} className="relative shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={x.src} alt={`${k + 2}. sayfa`} className="h-20 w-16 rounded-lg object-cover" />
                <button type="button" aria-label="Kaldır" onClick={() => setExtras((l) => l.filter((y) => y.id !== x.id))} className="absolute -right-1.5 -top-1.5 grid size-6 place-items-center rounded-full bg-fg text-white">
                  <Icon name="x" className="size-3.5" />
                </button>
              </span>
            ))}
            {extras.length < 9 && (
              <button type="button" onClick={() => moreInput.current?.click()} disabled={busy === "photo"} className="grid h-20 w-16 shrink-0 place-items-center rounded-lg bg-bg text-mut ring-1 ring-line active:scale-95">
                <Icon name="plus" className="size-5" />
              </button>
            )}
          </div>
          {extras.length > 0 && <p className="mt-1 text-[0.6875rem] leading-snug text-mut">Paylaş hepsini sırayla gönderir; ek fotoğraflar kaydedilmez, bu ekranda kalır.</p>}
        </div>
      </div>


      {/* Tasarım: biçim, şablon, renk, yazının yeri; her satırda solda ad, sağda seçim */}
      <Label>4 · TASARIM</Label>
      <div className={`${card} divide-y divide-line px-4`}>
        <div className={row}>
          <span className={rowLabel}>Boyut</span>
          <Seg value={post.format} onChange={(v) => put("format", v)} options={FORMATS.map(([k, l]) => [k, l.split(" ")[0]])} className="flex-1" />
        </div>
        <div className={row}>
          <span className={rowLabel}>Şablon</span>
          <Seg value={post.style} onChange={(v) => put("style", v)} options={STYLES} className="flex-1" />
        </div>
        <div className={row}>
          <span className={rowLabel}>Renk</span>
          <div className="flex flex-1 flex-wrap items-center gap-1.5">
            {THEMES.map(([k, label, c1, c2]) => (
              <button key={k} type="button" aria-label={label} aria-pressed={post.theme === k} onClick={() => put("theme", k)} className={`grid size-8 shrink-0 place-items-center rounded-full transition active:scale-95 ${post.theme === k ? "ring-2 ring-deep ring-offset-2 ring-offset-card" : "ring-1 ring-line"}`}>
                <span className="size-6 rounded-full" style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }} />
              </button>
            ))}
          </div>
        </div>
        <div className={row}>
          <span className={rowLabel}>Yazı</span>
          <Seg value={post.pos} onChange={(v) => put("pos", v)} options={[["top", "Üstte"], ["bottom", "Altta"]]} className="flex-1" />
        </div>
      </div>

      {/* Görseldeki yazılar: kendiliğinden dolar, istenirse elle düzenlenir */}
      <button type="button" onClick={() => setTexts((v) => !v)} className={`${card} mt-6 flex w-full items-center gap-3 px-4 py-3 text-left`}>
        <Icon name="edit" className="size-5 shrink-0 text-acc" />
        <span className="min-w-0 flex-1">
          <b className="block text-[0.9375rem] font-semibold">5 · Görseldeki yazılar</b>
          <span className="block truncate text-[0.75rem] text-mut">{[post.headline, post.wish].filter(Boolean).join(" · ") || "Başlık, alt satır, sporcular, dilek"}</span>
        </span>
        <Icon name="chev" className={`size-5 shrink-0 text-mut transition ${texts ? "-rotate-90" : "rotate-90"}`} />
      </button>
      {texts && (
        <div className="mt-3 space-y-3">
          <label className="block">
            <span className="text-[0.8125rem] font-medium text-mut">Başlık</span>
            <textarea value={p.headline} onChange={(e) => put("headline", e.target.value)} maxLength={90} rows={2} className={area} placeholder="ILCA TYF Ligi Başlıyor" />
          </label>
          <label className="block">
            <span className="text-[0.8125rem] font-medium text-mut">Alt satır</span>
            <textarea value={p.sub} onChange={(e) => put("sub", e.target.value)} maxLength={200} rows={3} className={area} placeholder="Sporcumuz Mete Ok, Foça'nın rüzgarlı sularında kulübümüzü temsil etmek üzere tüm hazırlıklarını tamamladı." />
          </label>
          <label className="block">
            <span className="text-[0.8125rem] font-medium text-mut">Sporcular (en çok 2 satır; daha çok sporcu varsa adlar açıklamada)</span>
            <textarea value={p.people} onChange={(e) => put("people", e.target.value.split("\n").slice(0, 2).join("\n"))} rows={3} className={area} placeholder={"Ali Yılmaz · Optimist · ilk yarışı\nAyşe Kaya · ILCA 4 · 2. oldu"} />
          </label>
          <Field label="Dilek satırı" value={p.wish} onChange={(e) => put("wish", e.target.value)} maxLength={60} placeholder="Sporcularımıza başarılar!" hint="Boş bırakılırsa görselde çıkmaz." />
          {post.meta && <Field label="Yer · tarih" value={p.info} onChange={(e) => put("info", e.target.value)} maxLength={60} placeholder="Foça · 7-11 Ekim 2026" />}
          <Field label="Etiket" value={p.tag} onChange={(e) => put("tag", e.target.value)} maxLength={18} placeholder={kindOf(post.kind)[3] || "DUYURU"} hint="Boş bırakılırsa küçük renkli çizgi görünür." />
        </div>
      )}

      <Label right={post.caption ? `${fullCaption(post).length} / 2200` : null}>6 · AÇIKLAMA</Label>
      <textarea value={p.caption} onChange={(e) => put("caption", e.target.value)} maxLength={2200} rows={9} className={`${area} mt-0`} placeholder={aiBusy ? "Yapay zeka yazıyor…" : "Yarış seçince ya da asistana anlatınca yapay zeka yazar; kendin de yazabilirsin"} />
      <label className="mt-3 block">
        <span className="text-[0.8125rem] font-medium text-mut">Etiketler (#)</span>
        <textarea value={tags} onChange={(e) => setTags(e.target.value)} onBlur={() => setTags(cleanTags(tags).join(" "))} rows={2} className={area} placeholder="#dikiliyelken #yelken #sailing" />
      </label>

      <Label>7 · PAYLAŞ</Label>
      <div>
        {/* Üç boyut birden: aynı tasarım gönderi, hikâye ve reels ölçüsünde; dokununca o boyut paylaşılır */}
        <div className="mb-3 grid grid-cols-3 items-end gap-2.5">
          {setOf(post.format).map((f) => {
            const s = set.find((x) => x.f === f);
            return (
              <button key={f} type="button" onClick={() => shareOne(f)} disabled={!!busy && busy !== "save"} className="flex flex-col items-center gap-1.5 active:scale-95 disabled:opacity-50">
                <span className={`block w-full overflow-hidden rounded-lg bg-line ring-1 ring-line ${post.format === f ? "ring-2 ring-acc" : ""}`} style={{ aspectRatio: aspectOf(f) }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {s && <img src={s.thumb} alt="" className="block size-full object-cover" />}
                </span>
                <span className="flex items-center gap-1 text-[0.75rem] font-semibold">
                  <Icon name="share" className="size-3.5 text-acc" />
                  {SET_LABELS[f]}
                </span>
              </button>
            );
          })}
        </div>
        <Button onClick={share} disabled={!!busy && busy !== "save"}>
          <Icon name="share" className="size-5" />
          Paylaş
        </Button>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button type="button" onClick={download} className={small}>
            <Icon name="download" className="size-[1.125rem]" />
            Görseli indir
          </button>
          <button type="button" onClick={downloadSet} className={`${small} col-span-2 row-start-1`}>
            <Icon name="download" className="size-[1.125rem]" />
            Üç boyutu indir
          </button>
          <button type="button" onClick={copy} className={small}>
            <Icon name="copy" className="size-[1.125rem]" />
            Açıklamayı kopyala
          </button>
        </div>
        <p className="mt-2 px-1 text-center text-[0.75rem] leading-snug text-mut">Paylaş&apos;a basınca açıklama kopyalanır; menüden Instagram&apos;ı seç, açıklama alanına yapıştır. Reels için görseli Instagram&apos;da Reels › galeriden seç; Instagram onu kısa videoya çevirir.</p>
      </div>

      <div className="mt-3 space-y-2.5">
        <Button variant="ghost" onClick={() => save(false)} loading={busy === "save"} disabled={!!busy || (!dirty && !!pid)}>
          <Icon name="check" className="size-5" />
          {!dirty && pid ? "Kaydedildi" : "Kaydet"}
        </Button>
        {pid && (
          <Button variant="ghost" onClick={del} loading={busy === "del"} disabled={!!busy} className="text-rec">
            <Icon name="trash" className="size-5" />
            Gönderiyi sil
          </Button>
        )}
      </div>
    </div>
  );
}
