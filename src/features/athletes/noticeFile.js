"use client";

// Yarış talimatının ve sonuç belgesinin kendisi: her cihazdan açılsın diye PDF olarak Firebase Storage'da
// orgs/{org}/noticeFiles/{id} (lib/firebase/fileStore.js). Fotoğraf ve yapıştırılan metin de PDF'e çevrilir.
// Yarışta künye durur: noticeFile { id, name, size, path, url, at } (sonuçlarda results.files).
// Yükleme olmazsa eski yol: Firestore'da parçalar orgs/{org}/noticeFiles/{id}/parts/{000..} (künyede parts;
// açılınca bu cihazda saklanır). Eski talimatlar parçalı yoldan okunmaya devam eder.
import { Bytes, collection, deleteDoc, doc, getDocs, serverTimestamp, setDoc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase/clientApp";
import { dropStored, getStored, putStored } from "@/lib/firebase/fileStore";
import { compressImage } from "@/lib/image";
import { todayStr } from "@/lib/utils/format";
import { dropRaceFile, getRaceFile, saveRaceFile } from "./raceFiles";

const PART = 900_000; // bayt (Firestore belge sınırı 1 MiB)
const col = (orgId) => collection(db, "orgs", orgId, "noticeFiles");
const cacheKey = (id) => `notice:${id}`;

// Talimat dosyasının adı: "Foça ILCA talimatı.pdf"
export function noticeName(race) {
  const base = String(race?.name || "Yarış").replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);
  return `${base || "Yarış"} talimatı.pdf`;
}

// PDF olduğu gibi; fotoğraf tek sayfalık PDF; metin A4 sayfalara yazılır. kind: readNotice'in bulduğu tür
export async function noticePdf(input, kind) {
  if (kind === "pdf") return new Blob([await input.arrayBuffer()], { type: "application/pdf" });
  const [{ PDFDocument }, { default: fontkit }] = await Promise.all([import("pdf-lib"), import("@pdf-lib/fontkit")]);
  const pdf = await PDFDocument.create();
  pdf.setCreator("Velora");
  if (kind === "image") {
    const img = await compressImage(input, 2200, 0.8);
    const jpg = await pdf.embedJpg(Uint8Array.from(atob(img.base64), (c) => c.charCodeAt(0)));
    // A4'e sığdır (dikey ya da yatay)
    const [W, H] = jpg.width > jpg.height ? [841.89, 595.28] : [595.28, 841.89];
    const s = Math.min((W - 40) / jpg.width, (H - 40) / jpg.height);
    const page = pdf.addPage([W, H]);
    page.drawImage(jpg, { x: (W - jpg.width * s) / 2, y: (H - jpg.height * s) / 2, width: jpg.width * s, height: jpg.height * s });
  } else {
    const text = typeof input === "string" ? input : await input.text();
    pdf.registerFontkit(fontkit);
    const res = await fetch("/fonts/LiberationSans-Regular.ttf");
    if (!res.ok) throw new Error("Yazı tipi alınamadı");
    const font = await pdf.embedFont(new Uint8Array(await res.arrayBuffer()), { subset: true });
    textPages(pdf, font, text);
  }
  return new Blob([await pdf.save()], { type: "application/pdf" });
}

// Metni A4 sayfalara satır satır yazar (uzun satırlar kelimeden bölünür)
function textPages(pdf, font, text) {
  const W = 595.28, H = 841.89, M = 48, SIZE = 10.5, LH = 14.5;
  const max = W - M * 2;
  const lines = [];
  for (const para of String(text).replace(/\r/g, "").split("\n")) {
    let line = "";
    for (const word of para.replace(/\t/g, "  ").split(/(\s+)/)) {
      const next = line + word;
      if (font.widthOfTextAtSize(next, SIZE) <= max || !line.trim()) line = next;
      else {
        lines.push(line.trimEnd());
        line = word.trimStart();
      }
    }
    lines.push(line.trimEnd());
  }
  const glyphs = new Set(font.getCharacterSet());
  let page = null;
  let y = 0;
  for (const l of lines) {
    if (!page || y < M) {
      page = pdf.addPage([W, H]);
      y = H - M;
    }
    // Yazı tipinde olmayan işaretler (emoji vb.) atlanır
    const safe = [...l].filter((ch) => ch === " " || glyphs.has(ch.codePointAt(0))).join("");
    if (safe) page.drawText(safe, { x: M, y, size: SIZE, font });
    y -= LH;
  }
}

// Dosyayı Storage'a yükler (olmazsa parçalar halinde Firestore'a); künyeyi döndürür (yarışın noticeFile alanına)
export async function saveNoticeFile(orgId, blob, name) {
  try {
    const s = await putStored(orgId, "noticeFiles", blob, "application/pdf");
    return { id: s.id, name: String(name || "talimat.pdf").slice(0, 120), size: s.size, path: s.path, url: s.url, at: todayStr() };
  } catch (e) {
    console.warn("[noticeFile] Storage'a yüklenemedi, Firestore'a yazılıyor", e?.code || e);
  }
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const ref = doc(col(orgId));
  const parts = Math.max(1, Math.ceil(bytes.length / PART));
  for (let i = 0; i < parts; i += 8) {
    const batch = writeBatch(db);
    for (let j = i; j < Math.min(parts, i + 8); j++) batch.set(doc(ref, "parts", String(j).padStart(3, "0")), { data: Bytes.fromUint8Array(bytes.subarray(j * PART, (j + 1) * PART)) });
    await batch.commit();
  }
  const meta = { id: ref.id, name: String(name || "talimat.pdf").slice(0, 120), size: bytes.length, parts, at: todayStr() };
  await setDoc(ref, { name: meta.name, size: meta.size, parts, createdAt: serverTimestamp() });
  await saveRaceFile({ id: cacheKey(ref.id), blob, name: meta.name });
  return meta;
}

// Talimatı getirir: önce bu cihazdan, yoksa Firestore'dan (parça sayısı kadar okuma)
export async function loadNoticeFile(orgId, meta) {
  const name = meta.name || "talimat.pdf";
  if (meta.path) return new File([await getStored(meta, "application/pdf")], name, { type: "application/pdf" });
  const hit = await getRaceFile(cacheKey(meta.id));
  if (hit?.blob) return new File([hit.blob], name, { type: "application/pdf" });
  const snap = await getDocs(collection(db, "orgs", orgId, "noticeFiles", meta.id, "parts"));
  const list = snap.docs.sort((a, b) => a.id.localeCompare(b.id)).map((d) => d.data().data?.toUint8Array?.());
  if (!list.length || list.length < (meta.parts || 1) || list.some((x) => !x)) throw new Error("Talimat dosyası bulunamadı");
  const blob = new Blob(list, { type: "application/pdf" });
  saveRaceFile({ id: cacheKey(meta.id), blob, name });
  return new File([blob], name, { type: "application/pdf" });
}

// Eski dosyayı siler (yenisi yüklenince ya da yarış silinince); hata sessiz
export async function dropNoticeFile(orgId, meta) {
  if (!meta?.id) return;
  if (meta.path) return dropStored(meta.path);
  try {
    const ref = doc(col(orgId), meta.id);
    const batch = writeBatch(db);
    for (let j = 0; j < (meta.parts || 1); j++) batch.delete(doc(ref, "parts", String(j).padStart(3, "0")));
    await batch.commit();
    await deleteDoc(ref);
  } catch {}
  dropRaceFile(cacheKey(meta.id));
}
