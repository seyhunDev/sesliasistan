"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { Icon } from "@/components/ui/Icon";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { card } from "@/components/ui/Page";
import { useToast } from "@/components/ui/ToastProvider";
import { DikiliLogin } from "@/features/athletes/Connect";
import { dikiliAuth } from "@/features/athletes/dikili";
import { todayStr } from "@/lib/utils/format";
import { NEWS_MAX_PHOTOS, newsBody, newsDraft, newsTitle } from "./newsModel";
import { addNews, editNews, findNews, newsAccess, newsError, publishNews, removeNews } from "./clubNews";

const area =
  "mt-1.5 w-full resize-none rounded-xl border border-transparent bg-bg px-3.5 py-3 text-base text-fg outline-none transition placeholder:text-mut/70 focus:border-acc focus:bg-card";
const small = "flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-line bg-card text-[0.875rem] font-semibold active:scale-[.98] disabled:opacity-50";
const LOGIN = "Dikili Yelken yönetici hesabıyla giriş yapın";

// Gönderi › Paylaş › "Kulüpten haberler": afişi Dikili Yelken sitesine haber olarak ekler (clubNews.js).
// post: açık gönderi; poster(): afişin tuvali (0. fotoğraf); ensureId(): gönderi kaydedilmemişse kaydedip kimliği verir;
// onLinked(newsId): gönderideki bağlantıyı yazar. ref: asistan için run(op) (add, edit, publish, unpublish, remove).
export const NewsPanel = forwardRef(function NewsPanel({ show, post, pid, poster, ensureId, onLinked }, ref) {
  const toast = useToast();
  const [acc, setAcc] = useState(undefined); // { user, admin } | undefined (bakılıyor)
  const [item, setItem] = useState(undefined); // haber belgesi | null (yok) | undefined (bakılıyor)
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [login, setLogin] = useState(false);
  const [form, setForm] = useState(null); // { title, body, date, published, extras: [File], redo }
  const fileRef = useRef(null);
  const latest = useRef({});
  const saving = useRef(false); // bu ekrandan haber eklendi/eklenirken (gönderi de o an kaydedilir)

  // Kulüp hesabı oturumu (sporcularla aynı bağlantı); değişince yönetici mi yeniden bakılır
  useEffect(() => onAuthStateChanged(dikiliAuth(), () => newsAccess().then(setAcc, () => setAcc({ user: null, admin: false }))), []);
  const ok = !!acc?.user && acc.admin !== false;

  // Gönderinin haberi: newsId ya da sourceId ile (aynı afiş iki kez eklenmesin); bulunan bağlanır
  useEffect(() => {
    if (!acc?.user || !pid) return setItem(pid ? undefined : null);
    let live = true;
    findNews(pid, post.newsId).then(
      (n) => {
        if (!live) return;
        // Bu arada bu ekrandan eklendiyse (yeni gönderi kaydedilirken) bulunamadı sonucu onu silmesin
        if (!n && saving.current) return;
        setItem(n);
        if (n && n.id !== post.newsId) onLinked(n.id);
        if (!n && post.newsId) onLinked("");
      },
      () => live && setItem(null),
    );
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acc, pid]);

  const fail = (e) => {
    const m = newsError(e);
    setErr(m);
    return m;
  };

  const openForm = useCallback(() => {
    setErr("");
    const d = item ? { title: item.title || "", body: item.body || "", date: item.date || todayStr(), published: !!item.published } : newsDraft(post, todayStr());
    setForm({ ...d, extras: [], redo: !item });
  }, [item, post]);

  // Kaydet: yeni haber ya da düzenleme
  const submit = async () => {
    if (!form || busy) return;
    if (!newsTitle(form.title)) return setErr("Başlık yaz.");
    setBusy("save");
    setErr("");
    saving.current = true;
    try {
      const id = await ensureId();
      if (!id) throw new Error("Önce gönderiyi kaydet.");
      const src = poster();
      const sources = form.redo ? [src, ...form.extras].filter(Boolean).slice(0, NEWS_MAX_PHOTOS) : null;
      if (item) {
        await editNews(item.id, id, form, sources);
        setItem({ ...item, ...form, title: newsTitle(form.title), body: newsBody(form.body), photoCount: sources ? sources.length : item.photoCount });
        toast("Haber güncellendi");
      } else {
        const nid = await addNews(id, form, sources || [src].filter(Boolean));
        setItem({ id: nid, ...form, title: newsTitle(form.title), body: newsBody(form.body), photoCount: (sources || [src]).filter(Boolean).length });
        onLinked(nid, id);
        toast("Kulüpten haberler'e eklendi");
      }
      setForm(null);
    } catch (e) {
      saving.current = false;
      fail(e);
    } finally {
      setBusy("");
    }
  };

  const toggle = async (to = !item?.published) => {
    if (!item) return "Bu afiş henüz haber olarak eklenmedi.";
    if (!!item.published === to) return to ? "Haber zaten yayında." : "Haber zaten yayında değil.";
    setBusy("pub");
    setErr("");
    try {
      await publishNews(item.id, to);
      setItem({ ...item, published: to });
      return to ? "Haberi yayınladım." : "Haberi yayından aldım.";
    } catch (e) {
      throw new Error(fail(e));
    } finally {
      setBusy("");
    }
  };

  const remove = async () => {
    if (!item) return "Bu afiş haberlerde yok.";
    if (!confirm("Haber Dikili Yelken sitesinden kaldırılsın mı? Fotoğrafları da silinir.")) return "Haberi kaldırmadım.";
    setBusy("del");
    setErr("");
    try {
      await removeNews(item.id);
      saving.current = false;
      setItem(null);
      onLinked("");
      toast("Haber kaldırıldı");
      return "Haberi sitedeki Kulüpten haberler'den kaldırdım.";
    } catch (e) {
      throw new Error(fail(e));
    } finally {
      setBusy("");
    }
  };

  // Asistan: "haber olarak ekle", "haberi yayınla", "yayından al", "haberden kaldır" (kaldırma onay sorar)
  latest.current = { ok, acc, item, openForm, toggle, remove };
  useImperativeHandle(ref, () => ({
    run: async (op) => {
      const { ok: can, acc: a, item: it, openForm: of, toggle: tg, remove: rm } = latest.current;
      if (a === undefined) return "Kulüp hesabına bakılıyor, biraz sonra tekrar söyle.";
      if (!can) return a?.user ? "Bu kulüp hesabı yönetici değil; haber eklemek için Dikili Yelken yönetici hesabıyla giriş yapın." : `${LOGIN}. Paylaş › Kulüpten haberler'den giriş yapabilirsin.`;
      if (op === "add" || op === "edit") {
        if (op === "edit" && !it) return "Bu afiş henüz haber olarak eklenmedi. “Haber olarak ekle” de.";
        of();
        return it ? "Haber düzenleme penceresini açtım; kontrol edip kaydet." : "Haber penceresini açtım; başlık ve metni kontrol edip kaydet.";
      }
      if (op === "publish" || op === "unpublish") return tg(op === "publish");
      if (op === "remove") return rm();
      return "";
    },
  }));

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const pickExtras = (e) => {
    const files = [...(e.target.files || [])].filter((f) => f.type.startsWith("image/"));
    e.target.value = "";
    setForm((f) => ({ ...f, redo: true, extras: [...f.extras, ...files].slice(0, NEWS_MAX_PHOTOS - 1) }));
  };

  // Durum satırı
  const status =
    acc === undefined ? "Bakılıyor…" : !acc.user ? LOGIN : acc.admin === false ? "Bu hesap yönetici değil" : item === undefined ? "Bakılıyor…" : !item ? "Henüz eklenmedi" : item.published ? "Sitede yayında" : "Eklendi, yayında değil";

  return (
    <div className={`${card} mt-2 space-y-3 px-4 py-4 ${show ? "" : "hidden"}`}>
      <p className="text-[0.8125rem] leading-snug text-mut">Afiş, Dikili Yelken sitesindeki “Kulüpten haberler”e eklenir: başlık, metin ve afişin kendisi (istersen birkaç fotoğraf daha).</p>
      <p className={`text-[0.875rem] font-semibold ${item?.published ? "text-acc" : ""}`}>{status}</p>
      {acc && !ok && (
        <>
          <p className="rounded-xl bg-bg px-3 py-2.5 text-[0.8125rem] leading-snug">{acc.user ? `${acc.user.email} yönetici değil. ${LOGIN}.` : `${LOGIN}.`}</p>
          {!acc.user && (login ? <DikiliLogin onDone={() => setLogin(false)} /> : <button type="button" onClick={() => setLogin(true)} className={`${small} w-full`}>Kulüp hesabıyla giriş yap</button>)}
        </>
      )}
      {!item ? (
        <Button onClick={openForm} disabled={!ok || item === undefined || !!busy}>
          <Icon name="plus" className="size-5" />
          Haber olarak ekle
        </Button>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={openForm} disabled={!ok || !!busy} className={small}>
              <Icon name="edit" className="size-[1.125rem]" />
              Haberi düzenle
            </button>
            <button type="button" onClick={() => toggle().catch(() => {})} disabled={!ok || !!busy} className={small}>
              <Icon name={item.published ? "x" : "check"} className="size-[1.125rem]" />
              {busy === "pub" ? "…" : item.published ? "Yayından al" : "Yayınla"}
            </button>
          </div>
          <button type="button" onClick={() => remove().catch(() => {})} disabled={!ok || !!busy} className={`${small} w-full text-rec`}>
            <Icon name="trash" className="size-[1.125rem]" />
            {busy === "del" ? "Kaldırılıyor…" : "Haberden kaldır"}
          </button>
        </div>
      )}
      {err && <p className="text-[0.8125rem] leading-snug text-rec">{err}</p>}

      <Sheet open={!!form} onClose={() => !busy && setForm(null)} title={item ? "Haberi düzenle" : "Haber olarak ekle"}>
        {form && (
          <div className="space-y-3 pb-2">
            <Field label="Başlık (en çok 70 harf)" value={form.title} maxLength={90} onChange={(e) => set("title", e.target.value)} />
            {form.title && newsTitle(form.title) !== form.title.trim() && <p className="-mt-1.5 text-[0.75rem] text-mut">Sitede: {newsTitle(form.title)}</p>}
            <label className="block">
              <span className="text-[0.8125rem] font-medium text-mut">Metin</span>
              <textarea value={form.body} onChange={(e) => set("body", e.target.value)} rows={8} className={area} placeholder="Haber metni" />
              <span className="mt-1 block text-[0.75rem] text-mut">Etiketler (#), emoji ve “linki biyografide” gibi sözler sitede çıkarılır.</span>
            </label>
            <Field label="Tarih" type="date" value={form.date} onChange={(e) => set("date", e.target.value)} />
            <label className="flex items-center justify-between gap-3 rounded-xl bg-bg px-3.5 py-3">
              <span className="text-[0.9375rem] font-semibold">Sitede yayında</span>
              <input type="checkbox" checked={form.published} onChange={(e) => set("published", e.target.checked)} className="size-5 accent-[var(--acc)]" />
            </label>
            <div className="rounded-xl bg-bg px-3.5 py-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[0.9375rem] font-semibold">Fotoğraflar</span>
                {item && (
                  <label className="flex items-center gap-2 text-[0.8125rem]">
                    Yenile
                    <input type="checkbox" checked={form.redo} onChange={(e) => set("redo", e.target.checked)} className="size-5 accent-[var(--acc)]" />
                  </label>
                )}
              </div>
              <p className="mt-1 text-[0.8125rem] leading-snug text-mut">
                {form.redo ? `1. fotoğraf afişin kendisi${form.extras.length ? ` + ${form.extras.length} fotoğraf` : ""} (en çok ${NEWS_MAX_PHOTOS}).` : `Sitedeki ${item?.photoCount || 0} fotoğraf olduğu gibi kalır.`}
              </p>
              {form.redo && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {form.extras.map((f, i) => (
                    <button key={i} type="button" onClick={() => set("extras", form.extras.filter((_, j) => j !== i))} data-press className="btn btn-secondary btn-sm">
                      {f.name.slice(0, 16)} <Icon name="x" className="size-3.5" />
                    </button>
                  ))}
                  {form.extras.length < NEWS_MAX_PHOTOS - 1 && (
                    <button type="button" onClick={() => fileRef.current?.click()} data-press className="btn btn-secondary btn-sm">
                      <Icon name="plus" className="size-3.5" /> Fotoğraf ekle
                    </button>
                  )}
                </div>
              )}
              <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={pickExtras} />
            </div>
            {err && <p className="text-[0.8125rem] leading-snug text-rec">{err}</p>}
            <Button onClick={submit} loading={busy === "save"} disabled={!!busy}>
              {item ? "Kaydet" : "Haberlere ekle"}
            </Button>
          </div>
        )}
      </Sheet>
    </div>
  );
});
