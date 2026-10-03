"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Label, Seg, card } from "@/components/ui/Page";
import { useToast } from "@/components/ui/ToastProvider";
import { compressImage, thumbFromDataUrl } from "@/lib/image";
import { FORMATS, KINDS, THEMES, cleanPost, cleanTags, fullCaption, kindOf, raceBrief } from "./postModel";
import { drawPost, loadImg, postFile, thumbOf } from "./postImage";
import { askCaption, askImage, imageUsage } from "./posts";

const area =
  "mt-1.5 w-full resize-none rounded-xl border border-transparent bg-bg px-3.5 py-3 text-base text-fg outline-none transition placeholder:text-mut/70 focus:border-acc focus:bg-card";
const chip = (on) =>
  `flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[0.8125rem] font-semibold transition active:scale-95 ${on ? "bg-deep text-white" : "bg-card text-fg ring-1 ring-line"}`;
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

// Gönderi: önizleme (canvas), paylaş/indir/kopyala, içerik (tür, yarış, konu → yapay zeka), görsel ayarları, açıklama.
// onSave(post, photo) → kimlik; photo undefined: fotoğraf değişmedi, "": kaldırıldı, dataURL: yeni.
export function PostEditor({ start, startPhoto = "", onSave, onDelete, onRaces }) {
  const toast = useToast();
  const [p, setP] = useState(start);
  const [tags, setTags] = useState(start.hashtags.join(" "));
  const [photo, setPhoto] = useState(startPhoto);
  const [img, setImg] = useState(null);
  const [photoDirty, setPhotoDirty] = useState(false);
  const [saved, setSaved] = useState(() => sig(start));
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [races, setRaces] = useState(null);
  const [wish, setWish] = useState("");
  const [usage, setUsage] = useState(null);
  const canvas = useRef(null);
  const file = useRef(null);
  const fileInput = useRef(null);
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
  const look = JSON.stringify([post.format, post.theme, post.pos, post.focus, post.headline, post.sub, post.tag]);
  useEffect(() => {
    let live = true;
    file.current = null;
    const t = setTimeout(async () => {
      if (!canvas.current) return;
      await drawPost(canvas.current, cleanPost(p), shown);
      if (!live) return;
      file.current = await postFile(canvas.current, slug(p.headline)).catch(() => null);
    }, 200);
    return () => {
      live = false;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [look, shown]);

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

  // Paylaş: açıklama panoya, görsel paylaşım menüsüne (Instagram açıklamayı almaz; yapıştırılır). Kayıt arkada.
  const share = async () => {
    const text = fullCaption(post);
    const copied = text ? copyText(text) : Promise.resolve(false);
    const f = file.current || (await getFile());
    if (f && navigator.canShare?.({ files: [f] })) {
      const sharing = navigator.share({ files: [f] }).catch((e) => e?.name === "NotAllowedError" && download());
      if (dirty) save(true);
      if (await copied) toast("Açıklama kopyalandı · Instagram'da yapıştır");
      await sharing;
      return;
    }
    await download();
    if (await copied) toast("Açıklama kopyalandı");
    if (dirty) save(true);
  };
  const download = async () => {
    const f = await getFile();
    if (!f) return;
    const url = URL.createObjectURL(f);
    const a = document.createElement("a");
    a.href = url;
    a.download = f.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };
  const copy = async () => {
    const text = fullCaption(post);
    if (!text) return toast("Önce açıklama yaz");
    toast((await copyText(text)) ? "Açıklama kopyalandı" : "Kopyalanamadı, elle seç");
  };

  const ai = async () => {
    setErr("");
    setBusy("ai");
    try {
      const r = await askCaption(post);
      setP((x) => ({ ...x, headline: r.headline || x.headline, sub: r.sub || x.sub, tag: r.tag || x.tag, caption: r.caption || x.caption }));
      if (r.hashtags?.length) setTags(r.hashtags.join(" "));
    } catch (e) {
      setErr(e?.message || "Açıklama yazılamadı");
    } finally {
      setBusy("");
    }
  };

  // Gemini ile görsel: yazısız fotoğraf gelir, başlık ve logo üstüne çizilir
  const genImage = async () => {
    setErr("");
    setBusy("img");
    try {
      const r = await askImage(post, wish.trim());
      const dataUrl = await thumbFromDataUrl(r.image, 1440, 0.85);
      setPhoto(dataUrl);
      setPhotoDirty(true);
      put("focus", 50);
      if (r.usage) setUsage(r.usage);
    } catch (x) {
      setErr(x?.message || "Görsel üretilemedi");
      if (x?.usage) setUsage(x.usage);
    } finally {
      setBusy("");
    }
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
  const setRace = (r) => {
    const race = raceBrief(r);
    setRaces(null);
    setP((x) => ({ ...x, race, headline: x.headline || race?.name || "", sub: x.sub || [r.district, race?.dates.replace(/ \d{4}$/, "")].filter(Boolean).join(" · ") }));
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

  return (
    <div className="mt-2 pb-6">
      <div className={`${card} overflow-hidden`}>
        <canvas ref={canvas} className="block h-auto w-full bg-deep" style={{ aspectRatio: post.format === "portrait" ? "4 / 5" : "1 / 1" }} />
      </div>
      <Seg value={post.format} onChange={(v) => put("format", v)} options={FORMATS.map(([k, l]) => [k, l])} className="mt-3" />

      <div className="mt-3">
        <Button onClick={share} disabled={!!busy && busy !== "save"}>
          <Icon name="share" className="size-5" />
          Paylaş
        </Button>
        <div className="mt-2 flex gap-2">
          <button type="button" onClick={download} className={small}>
            <Icon name="download" className="size-[1.125rem]" />
            Görseli indir
          </button>
          <button type="button" onClick={copy} className={small}>
            <Icon name="copy" className="size-[1.125rem]" />
            Açıklamayı kopyala
          </button>
        </div>
        <p className="mt-2 px-1 text-center text-[0.75rem] leading-snug text-mut">Paylaş&apos;a basınca açıklama kopyalanır; menüden Instagram&apos;ı seç, açıklama alanına yapıştır.</p>
      </div>

      <Label>NE PAYLAŞACAKSIN</Label>
      <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-0.5 [scrollbar-width:none]">
        {KINDS.map(([k, label, icon, tag]) => (
          <button key={k} type="button" aria-pressed={post.kind === k} className={chip(post.kind === k)} onClick={() => setP((x) => ({ ...x, kind: k, tag: !x.tag || KINDS.some((q) => q[3] === x.tag) ? tag : x.tag }))}>
            <Icon name={icon} className="size-4" />
            {label}
          </button>
        ))}
      </div>

      <div className={`${card} mt-3 flex items-center gap-3 px-4 py-3`}>
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-rose-500/10 text-rose-700">
          <Icon name="flag" className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <b className="block truncate text-[0.9375rem] font-semibold">{post.race?.name || "Yarış bağlı değil"}</b>
          <span className="block truncate text-[0.8125rem] text-mut">{post.race ? [post.race.place, post.race.dates].filter(Boolean).join(" · ") : "Yarış bilgisi açıklamaya eklenir"}</span>
        </span>
        {post.race ? (
          <button type="button" onClick={() => put("race", null)} aria-label="Yarışı kaldır" className="grid size-9 place-items-center rounded-full text-mut active:bg-line">
            <Icon name="x" className="size-[1.125rem]" />
          </button>
        ) : (
          <button type="button" onClick={openRaces} disabled={busy === "races"} className="h-9 shrink-0 rounded-full bg-acc px-3.5 text-[0.8125rem] font-semibold text-white active:scale-95 disabled:opacity-60">
            {busy === "races" ? "…" : races ? "Kapat" : "Yarış seç"}
          </button>
        )}
      </div>
      {races && (
        <ul className={`${card} mt-2 divide-y divide-line overflow-hidden`}>
          {races.length === 0 && <li className="px-4 py-3 text-[0.875rem] text-mut">Kayıtlı yarış yok</li>}
          {races.map((r) => (
            <li key={r.id}>
              <button type="button" onClick={() => setRace(r)} className="block w-full px-4 py-2.5 text-left active:bg-line/50">
                <b className="block truncate text-[0.875rem] font-semibold">{r.name || "Adsız yarış"}</b>
                <span className="block truncate text-[0.75rem] text-mut">{raceBrief(r)?.dates || "Tarih yok"}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <label className="mt-3 block">
        <span className="text-[0.8125rem] font-medium text-mut">Anlat (ne oldu, kimler, sonuç…)</span>
        <textarea
          value={p.topic}
          onChange={(e) => put("topic", e.target.value)}
          maxLength={1500}
          rows={3}
          className={area}
          placeholder="Foça'daki ligde Optimist'te Ali 2. oldu, rüzgâr sertti, velilere teşekkür"
        />
      </label>
      {err && <p className="mt-2 text-center text-[0.875rem] text-rec">{err}</p>}
      <Button onClick={ai} loading={busy === "ai"} disabled={!!busy || (!p.topic.trim() && !post.race)} className="mt-3">
        <Icon name="zap" className="size-5" />
        {post.caption ? "Yapay zekayla yeniden yaz" : "Yapay zekayla yaz"}
      </Button>
      {post.caption && <p className="mt-1.5 px-1 text-center text-[0.75rem] text-mut">İstersen anlatıma &quot;daha kısa&quot;, &quot;emoji olmasın&quot; gibi ekle, yeniden yazdır.</p>}

      <Label>GÖRSEL</Label>
      <div className="space-y-3.5">
        <div className={`${card} p-4`}>
          <b className="flex items-center gap-2 text-[0.9375rem] font-semibold">
            <Icon name="spark" className="size-5 text-acc" />
            Yapay zekayla görsel
          </b>
          <textarea
            value={wish}
            onChange={(e) => setWish(e.target.value)}
            maxLength={600}
            rows={2}
            className={area}
            placeholder="İsteğe bağlı: gün batımında Optimist tekneleri, Dikili koyu"
          />
          <Button onClick={genImage} loading={busy === "img"} disabled={!!busy || usage?.left === 0} className="mt-2.5">
            <Icon name="image" className="size-5" />
            {photo ? "Yeni görsel üret" : "Görsel üret"}
          </Button>
          {busy === "img" && <p className="mt-1.5 text-center text-[0.75rem] text-mut">Gemini görseli çiziyor, 10-20 saniye sürebilir…</p>}
          {usage && (
            <p className={`mt-2 text-center text-[0.75rem] leading-snug tabular-nums ${usage.left === 0 ? "text-rec" : "text-mut"}`}>
              Bugün {usage.today}/{usage.limit} görsel · bu ay {usage.month} görsel (≈ ${usage.cost.toFixed(2)}){" · "}
              <a href="https://aistudio.google.com/usage" target="_blank" rel="noreferrer" className="font-semibold text-acc underline">
                Google kotası
              </a>
            </p>
          )}
          <p className="mt-1 text-center text-[0.6875rem] leading-snug text-mut">Görselde yazı olmaz; başlık ve logo üstüne eklenir. Görsel başı yaklaşık {usage ? `$${usage.price}` : "4 sent"}.</p>
        </div>
        <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={pick} />
        <div className="flex gap-2">
          <button type="button" onClick={() => fileInput.current?.click()} disabled={busy === "photo"} className={small}>
            <Icon name="image" className="size-[1.125rem]" />
            {busy === "photo" ? "Hazırlanıyor…" : photo ? "Kendi fotoğrafım" : "Fotoğraf seç"}
          </button>
          {photo && (
            <button type="button" onClick={() => (setPhoto(""), setPhotoDirty(true))} className={small}>
              <Icon name="trash" className="size-[1.125rem]" />
              Fotoğrafı kaldır
            </button>
          )}
        </div>
        {photo ? (
          <label className="block">
            <span className="text-[0.8125rem] font-medium text-mut">Fotoğrafı kaydır</span>
            <input type="range" min={0} max={100} value={post.focus} onChange={(e) => put("focus", Number(e.target.value))} className="mt-2 w-full accent-[var(--acc)]" />
          </label>
        ) : (
          <div>
            <span className="text-[0.8125rem] font-medium text-mut">Zemin (fotoğraf yokken)</span>
            <div className="-mx-5 mt-1.5 flex gap-2 overflow-x-auto px-5 pb-0.5 [scrollbar-width:none]">
              {THEMES.map(([k, label, c1, c2]) => (
                <button key={k} type="button" aria-pressed={post.theme === k} onClick={() => put("theme", k)} className={chip(post.theme === k)}>
                  <span className="size-4 rounded-full ring-1 ring-white/40" style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }} />
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
        <Seg value={post.pos} onChange={(v) => put("pos", v)} options={[["bottom", "Yazı altta"], ["top", "Yazı üstte"]]} />
        <label className="block">
          <span className="text-[0.8125rem] font-medium text-mut">Başlık</span>
          <textarea value={p.headline} onChange={(e) => put("headline", e.target.value)} maxLength={90} rows={2} className={area} placeholder="Foça'da Yelken Ligi" />
        </label>
        <Field label="Alt satır" value={p.sub} onChange={(e) => put("sub", e.target.value)} maxLength={90} placeholder="Foça · 7-11 Ekim" />
        <Field label="Etiket" value={p.tag} onChange={(e) => put("tag", e.target.value)} maxLength={18} placeholder={kindOf(post.kind)[3] || "DUYURU"} hint="Boş bırakılırsa küçük renkli çizgi görünür." />
      </div>

      <Label right={post.caption ? `${fullCaption(post).length} / 2200` : null}>AÇIKLAMA</Label>
      <textarea value={p.caption} onChange={(e) => put("caption", e.target.value)} maxLength={2200} rows={9} className={`${area} mt-0`} placeholder="Yapay zekayla yaz ya da kendin yaz" />
      <label className="mt-3 block">
        <span className="text-[0.8125rem] font-medium text-mut">Etiketler (#)</span>
        <textarea value={tags} onChange={(e) => setTags(e.target.value)} onBlur={() => setTags(cleanTags(tags).join(" "))} rows={2} className={area} placeholder="#dikiliyelken #yelken #sailing" />
      </label>

      <div className="mt-6 space-y-2.5">
        <Button onClick={() => save(false)} loading={busy === "save"} disabled={!!busy || (!dirty && !!pid)}>
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
