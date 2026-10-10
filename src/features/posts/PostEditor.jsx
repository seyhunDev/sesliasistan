"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Seg, card } from "@/components/ui/Page";
import { useToast } from "@/components/ui/ToastProvider";
import { compressImage, thumbFromDataUrl } from "@/lib/image";
import { DESIGNS, MODERN_HINT, designOf, modernOf, FORMATS, KINDS, dayIn, dayOf, formatOf, nextDays, POST_ASK_KEY, SET_LABELS, STYLES, THEMES, aspectOf, askBeyondLook, autoOf, changedText, cleanPost, designFrom, cleanTags, fullCaption, kindOf, kindTheme, classList, raceBrief, raceMeta, raceWithAthletes, reauto, setOf, sizeAsk, themeOf, wantsPostImage, withInfo } from "./postModel";
import { modernPal } from "./postModern";
import { afisTag, drawPost, loadImg, postFile, thumbOf } from "./postImage";
import { askCaption, askImage, imageUsage, setPostHandler } from "./posts";
import { postArchiveCommand, postDeleteCommand } from "@/lib/assistMore";
import { todayStr } from "@/lib/utils/format";

const area =
  "mt-1.5 w-full resize-none rounded-xl border border-transparent bg-bg px-3.5 py-3 text-base text-fg outline-none transition placeholder:text-mut/70 focus:border-acc focus:bg-card";
const chip = (on) =>
  `flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[0.8125rem] font-semibold transition active:scale-95 ${on ? "bg-deep text-white" : "bg-card text-fg ring-1 ring-line"}`;
const stepBtn = "grid size-10 shrink-0 place-items-center rounded-full bg-bg text-fg ring-1 ring-line transition active:scale-90 disabled:opacity-40";
const small = "flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-line bg-card text-[0.875rem] font-semibold active:scale-[.98] disabled:opacity-50";

const DESIGN_KEY = "sa-post-design";

// Düzenleme ekranının alt çubuğu: her düğme önizlemenin altında tek bir iş açar
const TABS = [
  ["photo", "Fotoğraf", "camera"],
  ["text", "Yazı", "edit"],
  ["look", "Görünüm", "sun"],
  ["share", "Paylaş", "share"],
];

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

// Gönderi ekranı telefonda iki adım (Seyhun: "detaylı ama telefonda kullanışlı değil"):
// 1) Ne paylaşacaksın: büyük tür düğmeleri, isteğe bağlı yarış ve konu, "Hazırla" (yazıları yapay zeka yazar).
// 2) Düzenle: önizleme üstte sabit, altta dört düğme (Fotoğraf, Yazı, Görünüm, Paylaş); her biri önizlemenin altında yalnız kendi ayarlarını açar.
// Yapay zeka ayrı kutuda değil: yarış bağlanınca açıklama kendiliğinden yazılır, değişiklikler ana asistana söylenir
// ("daha kısa yaz", "Mete 2. oldu diye ekle", "gün batımında teknelerle görsel üret"; setPostHandler).
// onSave(post, photo) → kimlik; photo undefined: fotoğraf değişmedi, "": kaldırıldı, dataURL: yeni.
export function PostEditor({ start: given, startPhoto = "", onSave, onDelete, onArchive, onRaces, onAthletes }) {
  const toast = useToast();
  // Yeni gönderi son seçilen tasarımla (Klasik / Modern) açılır
  const [start] = useState(() => {
    const g = withInfo(given);
    if (g.id) return g;
    try {
      if (localStorage.getItem(DESIGN_KEY) === "modern") return { ...g, style: "modern" };
    } catch {}
    return g;
  });
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
  const canvas = useRef(null);
  const file = useRef(null);
  const [autoSave, setAutoSave] = useState(false); // asistanla açılan gönderi hazır olunca kaydedilsin
  const setFiles = useRef({});
  const fileInput = useRef(null);
  const latest = useRef(null);
  const arcRef = useRef(null); // asistanın "arşive kaldır" demesi için (arc aşağıda)
  const delRef = useRef(null); // asistanın "gönderiyi sil" demesi için (del aşağıda, onay sorar)
  const drag = useRef(null);
  // Adım: "kind" (ne paylaşacaksın) ya da "edit" (önizleme + alt çubuk). Yeni ve boş gönderi türle başlar.
  const [step, setStep] = useState(() => {
    if (start.id || start.race || start.caption) return "edit";
    try {
      if (sessionStorage.getItem(POST_ASK_KEY)) return "edit";
    } catch {}
    return "kind";
  });
  const entry = useRef(""); // tür adımına girerken seçili olan (değiştiyse yazılar yeniden yazılır)
  // Alt çubukta seçili düğme; Paylaş'taki kapalı satırlar; Yazı'daki diğer yazılar
  const [tool, setTool] = useState(startPhoto ? "text" : "photo");
  const [open, setOpen] = useState("");
  const [more, setMore] = useState(false);
  // Önizleme ekranın üstünde sabit (sayfa başlığının altında); yazı yazarken küçülür, klavyeye yer kalsın
  const [typing, setTyping] = useState(false);
  const [top, setTop] = useState(0);
  useEffect(() => {
    const head = () => setTop(canvas.current?.closest("main")?.querySelector(":scope > .sticky")?.offsetHeight || 0);
    head();
    window.addEventListener("resize", head);
    return () => window.removeEventListener("resize", head);
  }, []);
  // Yapay zekanın son yazdığı açıklama: elle değiştirilmediyse tür değişince yeni türe göre yeniden yazılır (kayıtlı gönderide elle sayılır)
  const autoCap = useRef(start.id ? null : start.caption);
  const [set, setSet] = useState([]); // üç boyut: [{ f, thumb }]; dosyalar setFiles'ta
  const [pid, setPid] = useState(start.id || null);

  const shown = img?.src === photo ? img.i : null; // yüklenmiş fotoğraf (kaldırılınca null)
  const post = cleanPost({ ...p, hashtags: cleanTags(tags) });
  const dirty = photoDirty || sig(post) !== saved;
  const put = (k, v) => setP((x) => ({ ...x, [k]: v }));
  // Klasik'e dönünce son klasik şablon geri gelir
  const lastClassic = useRef(start.style === "modern" ? "afis" : start.style);
  const setDesign = (d) => {
    if (d === designOf(post.style)) return;
    if (d === "modern") lastClassic.current = post.style;
    put("style", d === "modern" ? "modern" : lastClassic.current || "afis");
    try {
      localStorage.setItem(DESIGN_KEY, d);
    } catch {}
  };

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

  // Önizlemeyi hemen çiz (ayar değişince anında görünsün), paylaşılacak dosyayı kısa gecikmeyle hazırla
  const look = JSON.stringify([post.format, post.theme, post.style, post.pos, post.focus, post.fx, post.zoom, post.shade, post.headline, post.noHead, post.noBrand, post.headSize, post.subSize, post.sub, post.people, post.wish, post.info, post.classes, post.tag, post.meta, post.race]);
  useEffect(() => {
    let live = true;
    file.current = null;
    const raf = requestAnimationFrame(() => {
      if (canvas.current && !drag.current) drawPost(canvas.current, cleanPost(p), shown);
    });
    const t = setTimeout(async () => {
      if (!canvas.current || !live) return;
      file.current = await postFile(canvas.current, slug(p.headline)).catch(() => null);
    }, 400);
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
      cancelAnimationFrame(raf);
      clearTimeout(t);
      clearTimeout(t2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [look, shown, step]);

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
      setP((x) => ({ ...x, focus: 50, fx: 50, zoom: 100 }));
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
    latest.current = { post, write, makeImage, pid };
  });
  useEffect(() => {
    const ask = async (text) => {
      const { post: now, write: w, makeImage: mk, pid: id } = latest.current;
      // "Arşive kaldır", "arşivden çıkar": gönderi silinmez (lib/assistMore.js)
      const ac = postArchiveCommand(text);
      if (ac) {
        if (!id) return { say: "Gönderi henüz kaydedilmedi; önce kaydet, sonra arşive kaldırabilirim." };
        if (!!now.archived === ac.archived) return { say: ac.archived ? "Gönderi zaten arşivde." : "Gönderi arşivde değil." };
        await arcRef.current?.();
        return { say: ac.archived ? "Gönderiyi arşive kaldırdım." : "Gönderiyi arşivden çıkardım." };
      }
      // "Gönderiyi sil": silme onayı sorulur (geri alınamaz)
      if (postDeleteCommand(text)) {
        if (!id) return { say: "Gönderi henüz kaydedilmedi, silinecek bir şey yok." };
        await delRef.current?.();
        return { say: "Silmeyi onaylarsan gönderi silinir." };
      }
      // "Rengi mavi yap", "hikâye boyutunda olsun", "modern şablon": yalnız tasarım; başka yazı isteği yoksa yazılar değişmez
      const look = designFrom(text);
      const lookOnly = Object.keys(look).length && !askBeyondLook(text);
      const dressed = (x) => ({ ...(look.kind ? reauto(x, { ...x, kind: look.kind }) : x), ...look, kind: look.kind || x.kind });
      if (Object.keys(look).length) setP(dressed);
      if (lookOnly) return { say: look.tag ? `Gönderiyi “${look.tag}” yaptım.` : "Tasarımı değiştirdim." };
      if (wantsPostImage(text)) {
        const u = await mk(text);
        return { say: `Yeni görseli ekledim, başlık ve logo üstünde.${u ? ` Bugün ${u.today}/${u.limit} görsel.` : ""}` };
      }
      // "Başlığı kaldır", "başlığı biraz küçült", "alt yazıyı büyüt": yalnız görsel ayarı
      const size = sizeAsk(text, now);
      if (size) {
        setP((x) => ({ ...x, ...size }));
        if ("noBrand" in size) return { say: size.noBrand ? "Logoyu ve kulüp adını görselden kaldırdım." : "Logo ve kulüp adı görselde yeniden görünüyor." };
        return { say: size.noHead ? "Başlığı görselden kaldırdım." : size.noHead === false && !size.headSize ? "Başlık görselde yeniden görünüyor." : size.headSize ? `Başlık boyu yüzde ${size.headSize}.` : `Alt satır boyu yüzde ${size.subSize}.` };
      }
      // Boş gönderide ilk cümle ne paylaşılacağıdır (konu); sonrakiler değişiklik
      const first = !now.caption && !now.race && !now.topic.trim();
      if (first) put("topic", text);
      const base = Object.keys(look).length ? dressed(now) : now;
      const r = await w(first ? { ...base, topic: text } : base, first ? "" : text);
      return { say: first ? "Gönderiyi hazırladım: başlık, açıklama ve etiketler hazır. Değiştirmek istediğini söyle." : changedText(now, r) };
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
    // "29 Ekim gönderisi hazırla": özel gün şablonu hazır gelir
    const d = !start.race && said ? dayIn(said, todayStr()) : null;
    // Söylenen renk, boyut, şablon, tür ("mavi, hikâye boyutunda, modern"): uygulamadaki seçeneklerle eşleşir
    const { kind: lk, ...look } = said ? designFrom(said) : {};
    const dress = (x) => {
      const k = d ? reauto(x, { ...x, kind: "ozel", day: d.id, year: d.year }) : lk ? reauto(x, { ...x, kind: lk }) : x;
      return { ...k, ...look };
    };
    const first = dress(start);
    const t = setTimeout(() => {
      if (d || lk || Object.keys(look).length) setP(dress);
      if (said && !start.race) put("topic", said);
      const w = write({ ...first, topic: start.topic || said }).catch(() => {});
      // Asistanla hazırlanan gönderi kendiliğinden kaydedilir (Seyhun: "gönderiyi kaydetsin, düzeltmeleri sonra yaparım"):
      // yazılar gelince görsel yeniden çizilsin diye kısa beklenir, sonra kaydedilir
      if (said) w.then(() => setAutoSave(true));
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

  // Asistanla hazırlanan gönderi yazıları gelince bir kez kaydedilir (yukarıdaki açılış)
  useEffect(() => {
    if (!autoSave) return;
    const t = setTimeout(() => {
      setAutoSave(false);
      save(false);
    }, 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSave]);

  const getFile = async () => file.current || (canvas.current && (await postFile(canvas.current, slug(p.headline))));
  // Paylaş: açıklama panoya, görsel paylaşım menüsüne (Instagram açıklamayı almaz; yapıştırılır). Kayıt arkada.
  const share = async () => {
    const text = fullCaption(post);
    const copied = text ? copyText(text) : Promise.resolve(false);
    const files = [file.current || (await getFile())].filter(Boolean);
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
    for (const f of [await getFile()].filter(Boolean)) {
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
      setP((x) => ({ ...x, focus: 50, fx: 50, zoom: 100 }));
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
    if (!post.caption && step !== "kind") write(next).catch(() => {});
  };
  const dropRace = () => setP((x) => reauto(x, { ...x, race: null }));
  const dropAthlete = (i) =>
    setP((x) => {
      const athletes = x.race.athletes.filter((_, k) => k !== i);
      return reauto(x, { ...x, race: { ...x.race, athletes, count: athletes.length } });
    });
  // Tür adımında seçim yalnız yazıları hazırlar; yapay zeka "Hazırla"da yazar
  const pickKind = (k) => {
    const near = k === "ozel" && !dayOf(post.day) ? nextDays(todayStr())[0] : null;
    const day = near ? { day: near.id, year: near.year } : {};
    setP((x) => reauto(x, { ...x, kind: k, ...day }));
  };
  const pickDay = (d) => setP((x) => reauto(x, { ...x, day: d.id, year: d.year }));
  const chosen = () => JSON.stringify([post.kind, post.day, post.year, post.race?.name || "", post.race?.athletes?.length || 0, post.topic.trim()]);
  const toKind = () => {
    entry.current = chosen();
    setRaces(null);
    setStep("kind");
    window.scrollTo(0, 0);
  };
  // Hazırla: açıklama boşsa ya da seçim değiştiyse (elle yazılmış açıklama korunur) yapay zeka yazar
  const ready = () => {
    const mine = post.caption && post.caption !== autoCap.current;
    if (!post.caption || (entry.current !== chosen() && !mine)) write({ ...post, caption: "" }).catch(() => {});
    setRaces(null);
    setStep("edit");
    setTool(photo ? "text" : "photo");
    window.scrollTo(0, 0);
  };
  // Arşive kaldır / çıkar: değişiklikler de kaydedilir, sonra listeye dönülür
  const arc = async () => {
    if (!canvas.current) return;
    setBusy("arc");
    try {
      const archived = !post.archived;
      await onSave({ ...post, archived, id: pid, thumb: thumbOf(canvas.current) }, photoDirty ? photo : undefined);
      onArchive(archived);
    } catch {
      setErr(post.archived ? "Arşivden çıkarılamadı" : "Arşive kaldırılamadı");
      setBusy("");
    }
  };

  useEffect(() => {
    arcRef.current = arc;
  });

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
  useEffect(() => {
    delRef.current = del;
  });

  // Önizlemede parmakla sürükleyince fotoğraf kayar (büyütülmüşse iki yönde); sürüklerken doğrudan çizilir
  const dragStart = (e) => {
    if (!shown || !canvas.current) return;
    const [, , W, H] = formatOf(post.format);
    const s = Math.max(W / shown.naturalWidth, H / shown.naturalHeight) * (post.zoom / 100);
    const ow = shown.naturalWidth * s - W;
    const oh = shown.naturalHeight * s - H;
    if (ow < 1 && oh < 1) return;
    canvas.current.setPointerCapture?.(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, fx: post.fx, fy: post.focus, ow, oh, k: W / canvas.current.getBoundingClientRect().width, raf: 0 };
  };
  const dragMove = (e) => {
    const d = drag.current;
    if (!d) return;
    const fx = d.ow < 1 ? d.fx : Math.max(0, Math.min(100, d.fx - (((e.clientX - d.x) * d.k) / d.ow) * 100));
    const fy = d.oh < 1 ? d.fy : Math.max(0, Math.min(100, d.fy - (((e.clientY - d.y) * d.k) / d.oh) * 100));
    d.next = { fx: Math.round(fx), focus: Math.round(fy) };
    if (d.raf) return;
    d.raf = requestAnimationFrame(() => {
      d.raf = 0;
      if (canvas.current && drag.current === d) drawPost(canvas.current, cleanPost({ ...p, ...d.next }), shown);
    });
  };
  const dragEnd = () => {
    const d = drag.current;
    drag.current = null;
    if (d?.next) setP((x) => ({ ...x, ...d.next }));
  };


  const race = post.race;
  const classes = classList(post.classes);
  // Kaydırıcı + iki yanda − / + (önizlemeye bakarak adım adım)
  const slider = (k, label, min, max, step = 5, unit = "") => (
    <div>
      <span className="flex items-center justify-between text-[0.75rem] font-medium text-mut">
        {label}
        <span className="tabular-nums">
          {unit === "%" ? "%" : ""}
          {post[k]}
        </span>
      </span>
      <span className="mt-1 flex items-center gap-2">
        <button type="button" aria-label={`${label} azalt`} onClick={() => put(k, Math.max(min, post[k] - step))} disabled={post[k] <= min} className={stepBtn}>
          <Icon name="minus" className="size-5" />
        </button>
        <input type="range" min={min} max={max} step={step} value={post[k]} onChange={(e) => put(k, Number(e.target.value))} aria-label={label} className="min-w-0 flex-1 touch-pan-y accent-[var(--acc)]" />
        <button type="button" aria-label={`${label} artır`} onClick={() => put(k, Math.min(max, post[k] + step))} disabled={post[k] >= max} className={stepBtn}>
          <Icon name="plus" className="size-5" />
        </button>
      </span>
    </div>
  );
  const toggle = (label, on, set) => (
    <label className="flex items-center justify-between gap-3">
      <span className="text-[0.875rem]">{label}</span>
      <input type="checkbox" checked={on} onChange={(e) => set(e.target.checked)} className="size-5 accent-[var(--acc)]" />
    </label>
  );
  // Paylaş'taki kapalı satır
  const row = (k, title, sub) => (
    <button type="button" onClick={() => setOpen((o) => (o === k ? "" : k))} aria-expanded={open === k} className={`${card} mt-2 flex w-full items-center gap-3 px-4 py-3.5 text-left`}>
      <span className="min-w-0 flex-1">
        <b className="block text-[0.9375rem] font-semibold">{title}</b>
        {sub && <span className="block truncate text-[0.75rem] text-mut">{sub}</span>}
      </span>
      <Icon name="chev" className={`size-5 shrink-0 text-mut transition ${open === k ? "-rotate-90" : "rotate-90"}`} />
    </button>
  );
  const fileBox = <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={pick} />;

  // Yarış listesi (tür adımında)
  const raceList = races && (
    <ul className={`${card} mt-2 divide-y divide-line overflow-hidden`}>
      {races.length === 0 && <li className="px-4 py-3 text-[0.875rem] text-mut">Kayıtlı yarış yok</li>}
      {races.map((r) => (
        <li key={r.id}>
          <button type="button" onClick={() => setRace(r)} className="block w-full px-4 py-3 text-left active:bg-line/50">
            <b className="block truncate text-[0.9375rem] font-semibold">{r.name || "Adsız yarış"}</b>
            <span className="block truncate text-[0.75rem] text-mut">{[raceBrief(r)?.dates || "Tarih yok", r.athleteIds?.length ? `${r.athleteIds.length} sporcu` : ""].filter(Boolean).join(" · ")}</span>
          </button>
        </li>
      ))}
    </ul>
  );

  // 1. adım: ne paylaşacaksın
  if (step === "kind")
    return (
      <div className="mt-2 pb-6">
        <h2 className="text-[1.5rem] font-extrabold leading-tight">Ne paylaşacaksın?</h2>
        <p className="mt-1 text-[0.875rem] text-mut">Seç, yazıları ben hazırlayayım.</p>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {KINDS.map(([k, label, icon]) => (
            <button key={k} type="button" aria-pressed={post.kind === k} onClick={() => pickKind(k)} className={`flex h-[5.5rem] flex-col items-start justify-between rounded-2xl p-3 text-left transition active:scale-95 ${post.kind === k ? "bg-deep text-white" : "bg-card text-fg ring-1 ring-line"}`}>
              <span className="flex w-full items-center justify-between">
                <Icon name={icon} className="size-5" />
                <span className="size-3 shrink-0 rounded-full ring-1 ring-white/60" style={{ background: `linear-gradient(135deg, ${themeOf(kindTheme(k))[2]}, ${themeOf(kindTheme(k))[3]})` }} />
              </span>
              <b className="text-[0.8125rem] font-semibold leading-tight">{label}</b>
            </button>
          ))}
        </div>
        {post.kind === "ozel" && (
          <div className="mt-3 flex flex-wrap gap-2">
            {nextDays(todayStr()).map((d) => (
              <button key={d.id} type="button" aria-pressed={post.day === d.id} className={chip(post.day === d.id)} onClick={() => pickDay(d)}>
                {d.name}
                <span className={post.day === d.id ? "text-white/70" : "text-mut"}>{d.left === 0 ? "bugün" : `${d.left} gün`}</span>
              </button>
            ))}
          </div>
        )}

        {/* Yarış isteğe bağlı: seçilince sporcular, yer ve tarih gelir */}
        <div className={`${card} mt-4 px-4 py-3`}>
          <div className="flex items-center gap-3">
            <Icon name="flag" className="size-5 shrink-0 text-acc" />
            <span className="min-w-0 flex-1">
              <b className="block truncate text-[0.9375rem] font-semibold">{race?.name || "Yarış (isteğe bağlı)"}</b>
              <span className="block truncate text-[0.75rem] text-mut">{race ? raceMeta(race) || "Yer ve tarih yok" : "Seçilirse sporcular ve tarih yazılara gelir"}</span>
            </span>
            {race && !races && (
              <button type="button" onClick={dropRace} aria-label="Yarışı kaldır" className="grid size-9 shrink-0 place-items-center rounded-full text-mut ring-1 ring-line active:bg-line">
                <Icon name="x" className="size-4" />
              </button>
            )}
            <button type="button" onClick={openRaces} disabled={busy === "races"} className="h-9 shrink-0 rounded-full bg-acc px-3.5 text-[0.8125rem] font-semibold text-white active:scale-95 disabled:opacity-60">
              {busy === "races" ? "…" : races ? "Kapat" : race ? "Değiştir" : "Seç"}
            </button>
          </div>
          {race?.athletes?.length > 0 && !races && (
            <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-line pt-2.5">
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
        </div>
        {raceList}
        {!race && post.kind !== "ozel" && (
          <label className="mt-3 block">
            <span className="text-[0.8125rem] font-medium text-mut">Kısaca ne anlatalım? (isteğe bağlı)</span>
            <textarea value={p.topic} onChange={(e) => put("topic", e.target.value)} rows={2} maxLength={400} className={area} placeholder="Cumartesi 10:00'da marinada start çalışması" />
          </label>
        )}
        {err && <p className="mt-3 text-center text-[0.875rem] text-rec">{err}</p>}
        <div className="mt-5">
          <Button onClick={ready} disabled={busy === "races"}>
            <Icon name="spark" className="size-5" />
            Hazırla
          </Button>
        </div>
        {fileBox}
      </div>
    );

  // 2. adım: önizleme üstte, altında seçili düğmenin ayarları, en altta dört düğme
  return (
    <div
      className="mt-1 pb-6"
      onFocusCapture={(e) => /^(TEXTAREA|INPUT)$/.test(e.target.tagName) && !/^(range|checkbox|file|button)$/.test(e.target.type) && setTyping(true)}
      onBlurCapture={() => setTyping(false)}
    >
      {/* Tür ve yarış: dokununca 1. adıma dönülür */}
      <button type="button" onClick={toKind} className="mb-1 flex w-full items-center gap-2 rounded-xl px-1 py-1.5 text-left active:bg-line/50">
        <Icon name={kindOf(post.kind)[2]} className="size-[1.125rem] shrink-0 text-acc" />
        <span className="min-w-0 flex-1 truncate text-[0.875rem] font-semibold">
          {post.kind === "ozel" && dayOf(post.day) ? dayOf(post.day).name : kindOf(post.kind)[1]}
          {race && <span className="font-normal text-mut"> · {race.name}</span>}
        </span>
        <span className="shrink-0 text-[0.8125rem] font-semibold text-acc">Değiştir</span>
      </button>

      {/* Önizleme üstte sabit kalır; ayarlar altında, değişiklik hep görünür */}
      <div className="sticky z-[9] -mx-5 bg-bg/95 px-5 pb-2 pt-1 backdrop-blur [container-type:inline-size]" style={{ top }}>
        <div className={`${card} overflow-hidden`}>
          <div className="relative mx-auto w-fit">
            <canvas
              ref={canvas}
              onPointerDown={dragStart}
              onPointerMove={dragMove}
              onPointerUp={dragEnd}
              onPointerCancel={dragEnd}
              className={`block w-auto max-w-full bg-deep transition-[height] duration-200 ${shown ? "cursor-grab touch-none" : ""}`}
              style={{ aspectRatio: aspectOf(post.format), height: `min(${typing ? 24 : 46}svh, calc(100cqw * ${formatOf(post.format)[3] / formatOf(post.format)[2]}))` }}
            />
            {/* Karede profil ızgarasında kesilen kenarlar (ızgara 3:4 gösterir): yazı bu çizgilerin içinde kalır */}
            {post.format === "square" && (
              <>
                <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-[12.5%] border-r border-dashed border-white/60 bg-black/25" />
                <span aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-[12.5%] border-l border-dashed border-white/60 bg-black/25" />
              </>
            )}
            {(aiBusy || busy === "img") && (
              <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-[0.75rem] font-semibold text-white backdrop-blur">
                <Icon name="spark" className="size-4 animate-pulse" />
                {busy === "img" ? "Görsel çiziliyor…" : "Yapay zeka yazıyor…"}
              </span>
            )}
          </div>
        </div>
      </div>

      {aiErr && (
        <div className="mt-2 flex gap-3 rounded-2xl bg-rec/10 px-4 py-3">
          <Icon name="alert" className="mt-0.5 size-5 shrink-0 text-rec" />
          <p className="text-[0.8125rem] leading-snug">
            {aiErr}{" "}
            <button type="button" onClick={() => write(post).catch(() => {})} className="font-semibold text-acc underline">
              Tekrar dene
            </button>
          </p>
        </div>
      )}

      <div className="mt-2 space-y-3">
        {tool === "photo" && (
          <div className={`${card} space-y-3 px-4 py-4`}>
            <div className="flex gap-2">
              <button type="button" onClick={() => fileInput.current?.click()} disabled={busy === "photo"} className={small}>
                <Icon name="camera" className="size-[1.125rem]" />
                {busy === "photo" ? "Hazırlanıyor…" : photo ? "Değiştir" : "Fotoğraf seç"}
              </button>
              <button type="button" onClick={genImage} disabled={!!busy || usage?.left === 0} className={small}>
                <Icon name="spark" className="size-[1.125rem] text-acc" />
                {busy === "img" ? "Çiziliyor…" : "Yapay zeka görseli"}
              </button>
              {photo && (
                <button type="button" onClick={() => (setPhoto(""), setPhotoDirty(true))} aria-label="Fotoğrafı kaldır" className="grid size-11 shrink-0 place-items-center rounded-xl border border-line bg-card text-rec active:scale-95">
                  <Icon name="trash" className="size-[1.125rem]" />
                </button>
              )}
            </div>
            {photo ? (
              <>
                {slider("zoom", "Büyüt", 100, 250, 5, "%")}
                {slider("fx", "Sağa-sola kaydır", 0, 100)}
                {slider("focus", "Yukarı-aşağı kaydır", 0, 100)}
                {slider("shade", "Gölge (yazı okunsun)", 0, 100)}
                <div className="flex items-center gap-3">
                  <p className="min-w-0 flex-1 text-[0.75rem] text-mut">Önizlemede parmağınla sürükleyerek de yerleştirebilirsin.</p>
                  <button type="button" onClick={() => setP((x) => ({ ...x, zoom: 100, fx: 50, focus: 50 }))} className="h-8 shrink-0 rounded-full px-3 text-[0.75rem] font-semibold text-acc ring-1 ring-line active:scale-95">
                    Sıfırla
                  </button>
                </div>
              </>
            ) : (
              <p className="text-[0.8125rem] text-mut">Fotoğraf eklemezsen sade zemin kullanılır.</p>
            )}
            {usage && (
              <p className={`text-center text-[0.6875rem] leading-snug tabular-nums ${usage.left === 0 ? "text-rec" : "text-mut"}`}>
                Yapay zeka görseli: bugün {usage.today}/{usage.limit} · bu ay {usage.month} (≈ ${usage.cost.toFixed(2)}){" · "}
                <a href="https://aistudio.google.com/usage" target="_blank" rel="noreferrer" className="font-semibold text-acc underline">
                  Google kotası
                </a>
              </p>
            )}
          </div>
        )}

        {tool === "text" && (
          <div className={`${card} space-y-3 px-4 py-4`}>
            <div>
              <span className="flex items-center justify-between gap-3 text-[0.8125rem] font-medium text-mut">
                Başlık
                <label className="flex items-center gap-2 font-normal">
                  Görselde
                  <input type="checkbox" checked={!post.noHead} onChange={(e) => put("noHead", !e.target.checked)} className="size-5 accent-[var(--acc)]" />
                </label>
              </span>
              {post.noHead ? (
                <p className="mt-1 text-[0.8125rem] text-mut">Başlık görselde yok; asıl yazı alt satırda ve açıklamada.</p>
              ) : (
                <textarea value={p.headline} onChange={(e) => put("headline", e.target.value)} maxLength={90} rows={2} className={area} placeholder="Yarışa Hazırız" aria-label="Başlık" />
              )}
            </div>
            {!post.noHead && slider("headSize", "Başlık boyu", 60, 150, 5, "%")}
            <label className="block">
              <span className="text-[0.8125rem] font-medium text-mut">Alt satır</span>
              <textarea value={p.sub} onChange={(e) => put("sub", e.target.value)} maxLength={200} rows={3} className={area} placeholder="Sporcumuz Mete Ok, Foça'nın rüzgarlı sularında kulübümüzü temsil etmek üzere tüm hazırlıklarını tamamladı." />
            </label>
            {slider("subSize", "Alt satır boyu", 80, 150, 5, "%")}
            <Field label="Dilek satırı" value={p.wish} onChange={(e) => put("wish", e.target.value)} maxLength={60} placeholder="Sporcularımıza başarılar!" hint="Boş bırakılırsa görselde çıkmaz." />
            <button type="button" onClick={() => setMore((v) => !v)} aria-expanded={more} className="flex w-full items-center justify-between pt-1 text-[0.875rem] font-semibold text-acc">
              Diğer yazılar ve ayarlar
              <Icon name="chev" className={`size-5 transition ${more ? "-rotate-90" : "rotate-90"}`} />
            </button>
            {more && (
              <div className="space-y-3 border-t border-line pt-3">
                <Seg value={post.pos} onChange={(v) => put("pos", v)} options={[["top", "Yazı üstte"], ["bottom", "Yazı altta"]]} />
                {toggle("Logo ve kulüp adı", !post.noBrand, (v) => put("noBrand", !v))}
                {race && toggle("Yer ve tarih görselde", post.meta, (v) => put("meta", v))}
                {post.meta && <Field label="Yer · tarih" value={p.info} onChange={(e) => put("info", e.target.value)} maxLength={60} placeholder="Foça · 7-11 Ekim 2026" />}
                <Field label="Etiket" value={p.tag} onChange={(e) => put("tag", e.target.value)} maxLength={24} placeholder={kindOf(post.kind)[3] || "DUYURU"} hint="Boş bırakılırsa küçük renkli çizgi görünür." />
                <label className="block">
                  <span className="text-[0.8125rem] font-medium text-mut">Sporcular (en çok 2 satır)</span>
                  <textarea value={p.people} onChange={(e) => put("people", e.target.value.split("\n").slice(0, 2).join("\n"))} rows={2} className={area} placeholder={"Ali Yılmaz · Optimist · ilk yarışı\nAyşe Kaya · ILCA 4 · 2. oldu"} />
                </label>
                {classes.length > 0 && <p className="text-[0.75rem] text-mut">Sınıflar: {classes.join(", ")}</p>}
              </div>
            )}
            <p className="flex gap-2 text-[0.75rem] leading-snug text-mut">
              <Icon name="mic" className="size-4 shrink-0 text-acc" />
              Asistana da söyleyebilirsin: &quot;daha kısa yaz&quot;, &quot;başlığı küçült&quot;, &quot;Mete ikinci oldu diye ekle&quot;.
            </p>
          </div>
        )}

        {tool === "look" && (
          <div className={`${card} space-y-4 px-4 py-4`}>
            <div>
              <span className="text-[0.8125rem] font-medium text-mut">Tasarım</span>
              <div className="mt-1.5 space-y-2">
                <Seg value={designOf(post.style)} onChange={setDesign} options={DESIGNS} />
                {post.style === "modern" ? (
                  <p className="text-[0.75rem] leading-snug text-mut">{modernOf(post.kind) ? `Modern tasarım türe göre değişir. ${MODERN_HINT[modernOf(post.kind)]}.` : "Özel günde günün afişi kullanılır."}</p>
                ) : (
                  <Seg value={post.style} onChange={(v) => put("style", v)} options={STYLES} />
                )}
              </div>
            </div>
            <div>
              <span className="text-[0.8125rem] font-medium text-mut">Renk</span>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                {THEMES.map(([k, label, c1, c2]) => (
                  <button key={k} type="button" aria-label={label} aria-pressed={post.theme === k} onClick={() => put("theme", k)} className={`grid size-10 shrink-0 place-items-center rounded-full transition active:scale-95 ${post.theme === k ? "ring-2 ring-deep ring-offset-2 ring-offset-card" : "ring-1 ring-line"}`}>
                    <span className="grid size-8 place-items-center rounded-full" style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}>
                      {post.style === "modern" && <span className="size-2.5 rounded-full ring-1 ring-black/20" style={{ background: modernPal(k).acc }} />}
                      {post.style === "afis" && <span className="size-2.5 rounded-sm ring-1 ring-black/20" style={{ background: afisTag(k) }} />}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className="text-[0.8125rem] font-medium text-mut">Boyut</span>
              <div className="mt-1.5">
                <Seg value={post.format} onChange={(v) => put("format", v)} options={FORMATS.map(([k, l]) => [k, l.split(" ")[0]])} />
              </div>
              {post.format === "square" && <p className="mt-1.5 text-[0.75rem] text-mut">Profilde gri kenarlar görünmez.</p>}
            </div>
          </div>
        )}

        {tool === "share" && (
          <div>
            <Button onClick={share} disabled={!!busy && busy !== "save"}>
              <Icon name="share" className="size-5" />
              Instagram&apos;da paylaş
            </Button>
            <p className="mt-2 px-1 text-center text-[0.75rem] leading-snug text-mut">Açıklama kopyalanır; menüden Instagram&apos;ı seç, açıklama alanına yapıştır.</p>
            <div className="mt-2">
              <Button variant="ghost" onClick={() => save(false)} loading={busy === "save"} disabled={!!busy || (!dirty && !!pid)}>
                <Icon name="check" className="size-5" />
                {!dirty && pid ? "Kaydedildi" : "Kaydet"}
              </Button>
            </div>
            <p className={`${card} mt-3 line-clamp-4 whitespace-pre-line px-4 py-3 text-[0.8125rem] leading-snug text-fg/80`}>{fullCaption(post) || (aiBusy ? "Açıklama yazılıyor…" : "Açıklama yok")}</p>
            {row("cap", "Açıklamayı düzenle", post.caption ? `${fullCaption(post).length} / 2200` : "")}
            {open === "cap" && (
              <div className={`${card} mt-2 space-y-3 px-4 py-4`}>
                <textarea value={p.caption} onChange={(e) => put("caption", e.target.value)} maxLength={2200} rows={8} className={`${area} mt-0`} placeholder={aiBusy ? "Yapay zeka yazıyor…" : "Açıklamayı yaz"} aria-label="Açıklama" />
                <label className="block">
                  <span className="text-[0.8125rem] font-medium text-mut">Etiketler (#)</span>
                  <textarea value={tags} onChange={(e) => setTags(e.target.value)} onBlur={() => setTags(cleanTags(tags).join(" "))} rows={2} className={area} placeholder="#dikiliyelken #yelken #sailing" />
                </label>
                <button type="button" onClick={copy} className={`${small} w-full`}>
                  <Icon name="copy" className="size-[1.125rem]" />
                  Açıklamayı kopyala
                </button>
              </div>
            )}
            {row("sizes", "Hikâye ve Reels boyutu", "Aynı tasarım üç ölçüde")}
            {open === "sizes" && (
              <div className={`${card} mt-2 px-4 py-4`}>
                {/* Üç boyut birden: aynı tasarım gönderi, hikâye ve reels ölçüsünde; dokununca o boyut paylaşılır */}
                <div className="grid grid-cols-3 items-end gap-2.5">
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
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button type="button" onClick={downloadSet} className={small}>
                    <Icon name="download" className="size-[1.125rem]" />
                    Üçünü indir
                  </button>
                  <button type="button" onClick={download} className={small}>
                    <Icon name="download" className="size-[1.125rem]" />
                    Görseli indir
                  </button>
                </div>
                <p className="mt-2 text-center text-[0.75rem] leading-snug text-mut">Reels için görseli Instagram&apos;da Reels › galeriden seç; Instagram onu kısa videoya çevirir.</p>
              </div>
            )}
            {pid && row("more", onArchive ? "Arşivle ya da sil" : "Gönderiyi sil", "")}
            {pid && open === "more" && (
              <div className="mt-2 space-y-2.5">
                {onArchive && (
                  <Button variant="ghost" onClick={arc} loading={busy === "arc"} disabled={!!busy}>
                    <Icon name="archive" className="size-5" />
                    {post.archived ? "Arşivden çıkar" : "Arşive kaldır"}
                  </Button>
                )}
                <Button variant="ghost" onClick={del} loading={busy === "del"} disabled={!!busy} className="text-rec">
                  <Icon name="trash" className="size-5" />
                  Gönderiyi sil
                </Button>
              </div>
            )}
          </div>
        )}
        {err && <p className="text-center text-[0.875rem] text-rec">{err}</p>}
      </div>
      {fileBox}

      {/* Alt çubuk: dört düğme; asistan kubbesinin hemen üstünde, yazarken gizlenir */}
      <div data-pagebar="" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card/95 px-3 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 backdrop-blur">
        <div className="mx-auto grid max-w-[30rem] grid-cols-4 gap-1">
          {TABS.map(([k, label, icon]) => (
            <button key={k} type="button" aria-pressed={tool === k} onClick={() => (setTool(k), setOpen(""))} className={`flex flex-col items-center gap-1 rounded-xl py-1 text-[0.75rem] font-semibold transition active:scale-95 ${tool === k ? "text-deep" : "text-mut"}`}>
              <span className={`grid h-9 w-12 place-items-center rounded-xl ${tool === k ? "bg-deep text-white" : "bg-bg text-fg"}`}>
                <Icon name={icon} className="size-5" />
              </span>
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
