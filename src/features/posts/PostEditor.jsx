"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Label, Seg, card } from "@/components/ui/Page";
import { useToast } from "@/components/ui/ToastProvider";
import { compressImage, thumbFromDataUrl } from "@/lib/image";
import { DESIGNS, MODERN_HINT, designOf, modernOf, FORMATS, KINDS, dayIn, dayOf, formatOf, nextDays, POST_ASK_KEY, SET_LABELS, STYLES, THEMES, aspectOf, autoOf, cleanPost, cleanTags, fullCaption, kindOf, kindTheme, classList, raceBrief, raceMeta, raceWithAthletes, reauto, setOf, sizeAsk, themeOf, wantsPostImage, withInfo } from "./postModel";
import { modernPal } from "./postModern";
import { afisTag, drawPost, drawSlide, loadImg, postFile, thumbOf } from "./postImage";
import { askCaption, askImage, imageUsage, setPostHandler } from "./posts";
import { todayStr } from "@/lib/utils/format";

const area =
  "mt-1.5 w-full resize-none rounded-xl border border-transparent bg-bg px-3.5 py-3 text-base text-fg outline-none transition placeholder:text-mut/70 focus:border-acc focus:bg-card";
const chip = (on) =>
  `flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[0.8125rem] font-semibold transition active:scale-95 ${on ? "bg-deep text-white" : "bg-card text-fg ring-1 ring-line"}`;
const stepBtn = "grid size-10 shrink-0 place-items-center rounded-full bg-bg text-fg ring-1 ring-line transition active:scale-90 disabled:opacity-40";
const small = "flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-line bg-card text-[0.875rem] font-semibold active:scale-[.98] disabled:opacity-50";

const DESIGN_KEY = "sa-post-design";

// Önizlemenin altındaki ayar araçları
const TOOLS = [
  ["photo", "Fotoğraf", "camera"],
  ["fit", "Büyüt", "image"],
  ["shade", "Gölge", "moon"],
  ["size", "Boyut", "clip"],
  ["style", "Tasarım", "box"],
  ["color", "Renk", "sun"],
  ["text", "Yazı", "edit"],
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

// Gönderi ekranı: önizleme, hemen altında görsel ayarları (fotoğraf, büyüt/kaydır, gölge, boyut, şablon, renk, yazı yeri) + paylaş; yarış (sporcular, sınıflar), tür, görsel, görseldeki yazılar, açıklama.
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
  const [raceMenu, setRaceMenu] = useState(false);
  const [usage, setUsage] = useState(null);
  const [texts, setTexts] = useState(true);
  const canvas = useRef(null);
  const file = useRef(null);
  const setFiles = useRef({});
  const fileInput = useRef(null);
  const moreInput = useRef(null);
  const latest = useRef(null);
  const drag = useRef(null);
  // Önizlemenin altındaki ayarlar: seçili araç
  const [tool, setTool] = useState(startPhoto ? "fit" : "photo");
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
  // Kaydırmalı gönderi: ek fotoğraflar (en çok 9). Yalnız bu cihazda, bu ekran açıkken durur; kaydedilmez.
  const [extras, setExtras] = useState([]); // [{ id, src, i }]
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
  const look = JSON.stringify([post.format, post.theme, post.style, post.pos, post.focus, post.fx, post.zoom, post.shade, post.headline, post.noHead, post.headSize, post.subSize, post.sub, post.people, post.wish, post.info, post.classes, post.tag, post.meta, post.race]);
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
      setP((x) => ({ ...x, focus: 50, fx: 50, zoom: 100 }));
      setTool("fit");
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
      // "Başlığı kaldır", "başlığı biraz küçült", "alt yazıyı büyüt": yalnız görsel ayarı
      const size = sizeAsk(text, now);
      if (size) {
        setP((x) => ({ ...x, ...size }));
        return { say: size.noHead ? "Başlığı görselden kaldırdım." : size.noHead === false && !size.headSize ? "Başlık görselde yeniden görünüyor." : size.headSize ? `Başlık boyu yüzde ${size.headSize}.` : `Alt satır boyu yüzde ${size.subSize}.` };
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
    // "29 Ekim gönderisi hazırla": özel gün şablonu hazır gelir
    const d = !start.race && said ? dayIn(said, todayStr()) : null;
    const first = d ? reauto(start, { ...start, kind: "ozel", day: d.id, year: d.year }) : start;
    const t = setTimeout(() => {
      if (d) setP((x) => reauto(x, { ...x, kind: "ozel", day: d.id, year: d.year }));
      if (said && !start.race) put("topic", said);
      write({ ...first, topic: start.topic || said }).catch(() => {});
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
      setP((x) => ({ ...x, focus: 50, fx: 50, zoom: 100 }));
      setTool("fit");
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
  // Özel günde gün seçilmediyse en yakın gün seçilir
  const setKind = (k) => {
    if (k === post.kind) return;
    const near = k === "ozel" && !dayOf(post.day) ? nextDays(todayStr())[0] : null;
    const day = near ? { day: near.id, year: near.year } : {};
    const next = reauto(post, { ...post, kind: k, ...day });
    setP((x) => reauto(x, { ...x, kind: k, ...day }));
    const mine = post.caption && post.caption !== autoCap.current;
    if (!mine && (post.race || post.topic.trim() || k === "ozel")) write({ ...next, caption: "" }).catch(() => {});
  };
  // Özel gün seçilince hazır şablon (etiket, başlık, dilek, renk) gelir; açıklama elle değiştirilmediyse o güne göre yazılır
  const setDay = (d) => {
    if (d.id === post.day && d.year === post.year) return;
    const next = reauto(post, { ...post, day: d.id, year: d.year });
    setP((x) => reauto(x, { ...x, day: d.id, year: d.year }));
    const mine = post.caption && post.caption !== autoCap.current;
    if (!mine) write({ ...next, caption: "" }).catch(() => {});
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
  const noPhoto = (
    <div className="flex items-center gap-3">
      <p className="min-w-0 flex-1 text-[0.8125rem] text-mut">Bu ayar fotoğraf eklenince çalışır.</p>
      <button type="button" onClick={() => setTool("photo")} className="h-9 shrink-0 rounded-full bg-acc px-3.5 text-[0.8125rem] font-semibold text-white active:scale-95">
        Fotoğraf ekle
      </button>
    </div>
  );
  const empty = !race && !post.caption && !post.topic;

  return (
    <div
      className="mt-2 pb-6"
      onFocusCapture={(e) => /^(TEXTAREA|INPUT)$/.test(e.target.tagName) && !/^(range|checkbox|file|button)$/.test(e.target.type) && setTyping(true)}
      onBlurCapture={() => setTyping(false)}
    >
      {/* Önizleme üstte sabit kalır (ekranın yarısı); ayarlar ve yazılar altında kayar, değişiklik hep görünür */}
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
          style={{ aspectRatio: aspectOf(post.format), height: `min(${typing ? 24 : 52}svh, calc(100cqw * ${formatOf(post.format)[3] / formatOf(post.format)[2]}))` }}
        />
        {/* Karede profil ızgarasında kesilen kenarlar (ızgara 3:4 gösterir): yazı bu çizgilerin içinde kalır */}
        {post.format === "square" && (
          <>
            <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-[12.5%] border-r border-dashed border-white/60 bg-black/25" />
            <span aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-[12.5%] border-l border-dashed border-white/60 bg-black/25" />
            <span className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/55 px-2.5 py-1 text-[0.6875rem] font-medium text-white">Profilde gri kenarlar görünmez</span>
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

      {/* Görsel ayarları önizlemenin hemen altında: araç seç, değiştir, önizlemede anında gör */}
      <div className={`${card} mt-1 overflow-hidden`}>
        <div className="grid grid-cols-4 gap-1.5 px-3 pt-3">
          {TOOLS.map(([k, label, icon]) => (
            <button key={k} type="button" aria-pressed={tool === k} onClick={() => setTool(k)} className={`flex h-14 flex-col items-center justify-center gap-1 rounded-xl text-[0.75rem] font-semibold transition active:scale-95 ${tool === k ? "bg-deep text-white" : "bg-bg text-fg"}`}>
              <Icon name={icon} className="size-[1.125rem]" />
              {label}
            </button>
          ))}
        </div>
        <div className="space-y-3 px-4 pb-4 pt-3">
          {tool === "photo" && (
            <>
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
              {usage && (
                <p className={`text-center text-[0.6875rem] leading-snug tabular-nums ${usage.left === 0 ? "text-rec" : "text-mut"}`}>
                  Yapay zeka görseli: bugün {usage.today}/{usage.limit} · bu ay {usage.month} (≈ ${usage.cost.toFixed(2)}) · görsel başı ≈ ${usage.price}{" · "}
                  <a href="https://aistudio.google.com/usage" target="_blank" rel="noreferrer" className="font-semibold text-acc underline">
                    Google kotası
                  </a>
                </p>
              )}
            </>
          )}
          {tool === "fit" &&
            (photo ? (
              <>
                {slider("zoom", "Büyüt", 100, 250, 5, "%")}
                {slider("fx", "Sağa-sola kaydır", 0, 100)}
                {slider("focus", "Yukarı-aşağı kaydır", 0, 100)}
                <div className="flex items-center gap-3">
                  <p className="min-w-0 flex-1 text-[0.75rem] text-mut">Önizlemede parmağınla sürükleyerek de yerleştirebilirsin.</p>
                  <button type="button" onClick={() => setP((x) => ({ ...x, zoom: 100, fx: 50, focus: 50 }))} className="h-8 shrink-0 rounded-full px-3 text-[0.75rem] font-semibold text-acc ring-1 ring-line active:scale-95">
                    Sıfırla
                  </button>
                </div>
              </>
            ) : (
              noPhoto
            ))}
          {tool === "shade" && (photo ? <>{slider("shade", "Gölge (yazı okunsun)", 0, 100)}</> : noPhoto)}
          {tool === "size" && <Seg value={post.format} onChange={(v) => put("format", v)} options={FORMATS.map(([k, l]) => [k, l.split(" ")[0]])} />}
          {tool === "style" && (
            <>
              <Seg value={designOf(post.style)} onChange={setDesign} options={DESIGNS} />
              {post.style === "modern" ? (
                <p className="text-[0.75rem] leading-snug text-mut">
                  {modernOf(post.kind) ? `Modern tasarım türe göre değişir. ${MODERN_HINT[modernOf(post.kind)]}.` : "Özel günde günün afişi kullanılır."}
                </p>
              ) : (
                <Seg value={post.style} onChange={(v) => put("style", v)} options={STYLES} />
              )}
            </>
          )}
          {tool === "color" && (
            <div className="flex flex-wrap items-center gap-1.5">
              {THEMES.map(([k, label, c1, c2]) => (
                <button key={k} type="button" aria-label={label} aria-pressed={post.theme === k} onClick={() => put("theme", k)} className={`grid size-9 shrink-0 place-items-center rounded-full transition active:scale-95 ${post.theme === k ? "ring-2 ring-deep ring-offset-2 ring-offset-card" : "ring-1 ring-line"}`}>
                  <span className="grid size-7 place-items-center rounded-full" style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}>
                    {post.style === "modern" && <span className="size-2.5 rounded-full ring-1 ring-black/20" style={{ background: modernPal(k).acc }} />}
                    {post.style === "afis" && <span className="size-2.5 rounded-sm ring-1 ring-black/20" style={{ background: afisTag(k) }} />}
                  </span>
                </button>
              ))}
            </div>
          )}
          {tool === "text" && (
            <>
              <Seg value={post.pos} onChange={(v) => put("pos", v)} options={[["top", "Yazı üstte"], ["bottom", "Yazı altta"]]} />
              <label className="flex items-center justify-between gap-3">
                <span className="text-[0.8125rem]">Başlık görselde</span>
                <input type="checkbox" checked={!post.noHead} onChange={(e) => put("noHead", !e.target.checked)} className="size-5 accent-[var(--acc)]" />
              </label>
              {!post.noHead && slider("headSize", "Başlık boyu", 60, 150, 5, "%")}
              {slider("subSize", "Alt satır boyu", 80, 150, 5, "%")}
              {race && (
                <label className="flex items-center justify-between gap-3">
                  <span className="text-[0.8125rem]">Yer ve tarih görselde</span>
                  <input type="checkbox" checked={post.meta} onChange={(e) => put("meta", e.target.checked)} className="size-5 accent-[var(--acc)]" />
                </label>
              )}
              <button type="button" onClick={() => (setTexts(true), document.getElementById("post-texts")?.scrollIntoView({ behavior: "smooth", block: "center" }))} className="text-[0.8125rem] font-semibold text-acc">
                Yazıları düzenle ›
              </button>
            </>
          )}
          {err && <p className="text-center text-[0.875rem] text-rec">{err}</p>}
        </div>
      </div>

      {/* Yarış bağla ayarların altında; bağlıysa adı ve üç nokta (Değiştir / Kaldır) */}
      <div className={`${card} mt-3 px-4 py-3`}>
        <div className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-rose-500/10 text-rose-700">
            <Icon name="flag" className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <b className="block truncate text-[0.9375rem] font-semibold">{race?.name || "Yarış bağlı değil"}</b>
            <span className="block truncate text-[0.8125rem] text-mut">{race ? raceMeta(race) || "Yer ve tarih yok" : "Yarış seçilince sporcular, sınıflar ve başarı dileği gelir"}</span>
          </span>
          {race && !races ? (
            <div className="relative shrink-0">
              <button type="button" onClick={() => setRaceMenu((v) => !v)} aria-label="Yarış seçenekleri" aria-expanded={raceMenu} disabled={busy === "races"} className="grid size-9 place-items-center rounded-full text-mut ring-1 ring-line active:bg-line disabled:opacity-60">
                <Icon name="more" className="size-5" />
              </button>
              {raceMenu && (
                <>
                  <button type="button" aria-label="Menüyü kapat" onClick={() => setRaceMenu(false)} className="fixed inset-0 z-20 cursor-default" />
                  <div role="menu" className="absolute right-0 top-11 z-30 w-40 overflow-hidden rounded-xl bg-card shadow-lg ring-1 ring-line">
                    <button type="button" role="menuitem" onClick={() => (setRaceMenu(false), openRaces())} className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-[0.875rem] font-semibold active:bg-line/50">
                      <Icon name="flag" className="size-[1.125rem] text-acc" />
                      Değiştir
                    </button>
                    <button type="button" role="menuitem" onClick={() => (setRaceMenu(false), dropRace())} className="flex w-full items-center gap-2.5 border-t border-line px-4 py-3 text-left text-[0.875rem] font-semibold text-rec active:bg-line/50">
                      <Icon name="trash" className="size-[1.125rem]" />
                      Kaldır
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <button type="button" onClick={openRaces} disabled={busy === "races"} className="h-9 shrink-0 rounded-full bg-acc px-3.5 text-[0.8125rem] font-semibold text-white active:scale-95 disabled:opacity-60">
              {busy === "races" ? "…" : races ? "Kapat" : "Yarış bağla"}
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
      {post.kind === "ozel" && (
        <div className={`${card} mt-2 px-4 py-3`}>
          <p className="text-[0.8125rem] font-medium text-mut">Hangi gün? Yaklaşan önce; şablon hazır gelir, yazılar değiştirilebilir.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {nextDays(todayStr()).map((d) => (
              <button key={d.id} type="button" aria-pressed={post.day === d.id} className={chip(post.day === d.id)} onClick={() => setDay(d)}>
                <span className="size-3 shrink-0 rounded-full ring-1 ring-white/60" style={{ background: { milli: "#d0142c", anma: "#2a2b2f", dini: "#e3c06b", deniz: "#1d6a8f" }[d.mood] || "#f6c445" }} />
                {d.name}
                <span className={post.day === d.id ? "text-white/70" : "text-mut"}>{d.left === 0 ? "bugün" : `${d.left} gün`}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <Label right="isteğe bağlı">2 · KAYDIRMALI GÖNDERİ</Label>
      <div>
        <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={pick} />
        <input ref={moreInput} type="file" accept="image/*" multiple className="hidden" onChange={addExtras} />
        <div>
          <span className="text-[0.75rem] font-medium text-mut">{extras.length ? `${extras.length + 1} sayfa · ilk sayfa yukarıdaki tasarım` : "Ek fotoğraflar (ilk sayfa yukarıdaki tasarım)"}</span>
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

      {/* Görseldeki yazılar: kendiliğinden dolar, istenirse elle düzenlenir */}
      <button id="post-texts" type="button" onClick={() => setTexts((v) => !v)} className={`${card} mt-6 scroll-mt-4 flex w-full items-center gap-3 px-4 py-3 text-left`}>
        <Icon name="edit" className="size-5 shrink-0 text-acc" />
        <span className="min-w-0 flex-1">
          <b className="block text-[0.9375rem] font-semibold">3 · Görseldeki yazılar</b>
          <span className="block truncate text-[0.75rem] text-mut">{[post.noHead ? "" : post.headline, post.wish].filter(Boolean).join(" · ") || "Başlık, alt satır, sporcular, dilek"}</span>
        </span>
        <Icon name="chev" className={`size-5 shrink-0 text-mut transition ${texts ? "-rotate-90" : "rotate-90"}`} />
      </button>
      {texts && (
        <div className="mt-3 space-y-3">
          <div>
            <span className="flex items-center justify-between gap-3 text-[0.8125rem] font-medium text-mut">
              Başlık (kısa)
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

      <Label right={post.caption ? `${fullCaption(post).length} / 2200` : null}>4 · AÇIKLAMA</Label>
      <textarea value={p.caption} onChange={(e) => put("caption", e.target.value)} maxLength={2200} rows={9} className={`${area} mt-0`} placeholder={aiBusy ? "Yapay zeka yazıyor…" : "Yarış seçince ya da asistana anlatınca yapay zeka yazar; kendin de yazabilirsin"} />
      <label className="mt-3 block">
        <span className="text-[0.8125rem] font-medium text-mut">Etiketler (#)</span>
        <textarea value={tags} onChange={(e) => setTags(e.target.value)} onBlur={() => setTags(cleanTags(tags).join(" "))} rows={2} className={area} placeholder="#dikiliyelken #yelken #sailing" />
      </label>

      <Label>5 · PAYLAŞ</Label>
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
        {pid && onArchive && (
          <Button variant="ghost" onClick={arc} loading={busy === "arc"} disabled={!!busy}>
            <Icon name="archive" className="size-5" />
            {post.archived ? "Arşivden çıkar" : "Arşive kaldır"}
          </Button>
        )}
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
