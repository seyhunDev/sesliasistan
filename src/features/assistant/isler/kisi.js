// Asistanın işleri: AssistantSheet.jsx'ten taşındı (ctx: bileşenin durumu ve yardımcıları).
import { readPerson, createPerson, newPassword, openAccount, askOpen, removePerson } from "@/features/people/personActions";
import { nextQuestion, findDuplicates, summarySay, loginIn, wantsPerson, applyAnswer, changes, formatPhone, suggestLogin } from "@/features/people/assistPerson";
import { isNo, isYes, undoLast } from "@/lib/assistantLocal";
import { validUsername, KIND_LABEL, groupOfKind } from "@/lib/kinds";
import { QUESTION } from "./ortak";
import { birthdayDeleteCommand, personDeleteCommand, personOpenCommand } from "@/lib/assistMore";
import { personPath } from "@/lib/personPage";
import { matchPerson } from "@/lib/names";
import { setDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase/clientApp";

export async function startPerson(ctx, s, viaVoice) {
  const { isStaff, reply, runId, setPhase, stepPerson } = ctx;
  if (isStaff) return reply("Kişi eklemeyi yalnız ana hesap yapabilir.", { engine: "local" }, viaVoice);
  const id = ++runId.current;
  setPhase("thinking");
  let r;
  try {
    r = await readPerson(s);
  } catch (e) {
    if (id === runId.current) setPhase("idle");
    return reply(e.message || "Kişi eklemeyi yalnız ana hesap yapabilir.", { fail: true, engine: "local" }, viaVoice);
  }
  if (id !== runId.current) return;
  setPhase("idle");
  // Öğrenme kaydına yazılmaz (cümlede telefon/e-posta olabilir)
  stepPerson(r.draft, viaVoice, r.engine === "ai" ? "ai" : "local");
}

// Sıradaki adım: eksik/hatalı alan varsa tek soru; yoksa mükerrer kontrolü ve özet + onay
export function stepPerson(ctx, draft, viaVoice, engine = "local", lead = "") {
  const { allMembers, members, personCard, personFlow, reply, waitFor } = ctx;
  const q = nextQuestion(draft);
  if (q) {
    waitFor("person");
    personFlow.current = { draft, step: "ask", ask: q.field };
    return reply(`${lead}${q.ask}`, { person: personCard(personFlow.current), engine, expect: true }, viaVoice);
  }
  const dups = findDuplicates(draft, allMembers || members);
  waitFor("person");
  personFlow.current = { draft, step: "confirm", ask: "", dups };
  const warn = dups.length
    ? ` Dikkat, listede benzer kişi var: ${dups.map((d) => `${d.person.name} (${d.why}${d.left ? ", silinmiş" : ""})`).join("; ")}. Yine de eklemek için “yine de ekle” de.`
    : " Kaydedeyim mi?";
  reply(`${lead}${summarySay(draft)}${warn}`, { person: personCard(personFlow.current), engine, expect: true }, viaVoice);
}

// Kişi ekleme sürerken gelen cümle. İşlendiyse true; başka bir istekse false (akış biter, cümle her zamanki yoldan gider).
export async function continuePerson(ctx, s, viaVoice) {
  const { personAccount, personCancel, personCard, personFlow, personOpenAccount, personSave, personUndo, personUndoAsk, reply, startPerson, stepPerson } = ctx;
  const f = personFlow.current;
  const t = s.toLocaleLowerCase("tr-TR").trim();
  const no = isNo(s) || /^(vazgeç|iptal|ekleme|kaydetme)/.test(t);
  const yes = (isYes(s) && !/^sil/.test(t)) || /^(kaydet|ekle|aç|hesap aç)\S*[\s.!]*$/.test(t);
  if (f.step === "saved") {
    if (undoLast(s) || /^(geri al|sil|kaldır)/.test(t)) return personUndoAsk(viaVoice), true;
    if (yes) return personAccount(viaVoice), true;
    if (no) return reply("Tamam, hesap açmadım. İstediğinde Kişiler sayfasından açabilirsin.", { person: personCard(f), engine: "local" }, viaVoice), true;
    personFlow.current = null;
    return false;
  }
  if (f.step === "account") {
    const login = loginIn(s);
    if (login) {
      if (!login.includes("@") && !validUsername(login)) return reply("Kullanıcı adı en az 3 karakter olmalı; harf, rakam ve nokta kullan.", { person: personCard(f), engine: "local", expect: true }, viaVoice), true;
      personFlow.current = { ...f, acc: { ...f.acc, login } };
      return reply(`Giriş ${login} olacak. Hesabı açayım mı?`, { person: personCard(personFlow.current), engine: "local", expect: true }, viaVoice), true;
    }
    if (yes || /hesabı aç/.test(t)) return personOpenAccount(viaVoice), true;
    personFlow.current = { ...f, step: "saved", acc: null };
    if (no) return reply("Tamam, hesap açmadım.", { person: personCard(personFlow.current), engine: "local" }, viaVoice), true;
    return false;
  }
  if (f.step === "opened") {
    personFlow.current = null;
    return false;
  }
  if (f.step === "undo") {
    if (yes || /^sil/.test(t)) return personUndo(viaVoice), true;
    personFlow.current = { ...f, step: "saved" };
    return reply("Tamam, silmedim.", { person: personCard(personFlow.current), engine: "local", expect: true }, viaVoice), true;
  }
  if (no) return personCancel(true, viaVoice), true;
  if (wantsPerson(s)) return startPerson(s, viaVoice), true; // baştan yeni kişi
  if (f.step === "confirm") {
    const anyway = /yine de (ekle|kaydet)/.test(t);
    if (yes || anyway) {
      if (f.dups.length && !anyway)
        return reply("Listede benzer kişi olduğu için emin olmak istiyorum: eklemek için “yine de ekle”, eklememek için “vazgeç” de.", { person: personCard(f), engine: "local", expect: true }, viaVoice), true;
      return personSave(viaVoice), true;
    }
  }
  const next = applyAnswer(f.draft, s, f.ask);
  if (!changes(f.draft, next)) {
    if (f.step === "ask" && !QUESTION.test(s) && s.split(/\s+/).length <= 6) return stepPerson(f.draft, viaVoice, "local", "Anlayamadım. "), true;
    personFlow.current = null; // başka bir istek
    return false;
  }
  stepPerson(next, viaVoice);
  return true;
}

export async function personSave(ctx, viaVoice) {
  const { isStaff, memoSet, personCard, personFlow, profile, reply, saveBirthday, setSteps, stepTo, stepsEnd, toast } = ctx;
  const f = personFlow.current;
  if (!f || f.step !== "confirm" || isStaff) return;
  const { draft } = f;
  personFlow.current = { ...f, step: "saving" };
  setSteps([]);
  stepTo("Kişi kaydediliyor");
  try {
    const uid = await createPerson(profile.uid, draft);
    if (draft.birth) {
      stepTo("Doğum günü takvime ekleniyor");
      saveBirthday({ name: draft.name, month: draft.birth.month, day: draft.birth.day, year: draft.birth.year, phone: draft.phone ? formatPhone(draft.phone) : "", memberUid: uid, note: KIND_LABEL[draft.kind] });
    }
    stepsEnd();
    navigator.vibrate?.([10, 40, 10]);
    toast(`${draft.name} eklendi`);
    personFlow.current = { draft, step: "saved", uid };
    memoSet("person", draft.name);
    reply(`Kaydettim, ${draft.name} kişilere eklendi. Uygulamaya girebilmesi için hesap da açalım mı?`, { person: personCard(personFlow.current), engine: "local", expect: true }, viaVoice);
  } catch {
    stepsEnd(false);
    personFlow.current = f;
    reply("Kaydedemedim; bağlantını kontrol edip tekrar dene.", { person: personCard(f), engine: "local", expect: true }, viaVoice);
  }
}

export function personCancel(ctx, fromText = false, viaVoice = false) {
  const { personFlow, reply, setTurns } = ctx;
  if (!fromText) setTurns((p) => [...p, { role: "user", text: "Vazgeç", chip: true }]);
  personFlow.current = null;
  reply("Tamam, kişiyi eklemedim.", { engine: "local" }, viaVoice);
}

// Hesap açma ayrı onay: önce önerilen giriş ve şifre kartta gösterilir ("kullanıcı adı … olsun" ile değişir), ikinci onayla açılır
export function personAccount(ctx, viaVoice = false) {
  const { allMembers, isStaff, members, personCard, personFlow, reply } = ctx;
  const f = personFlow.current;
  if (!f?.uid || isStaff) return;
  const acc = { login: suggestLogin(f.draft, allMembers || members), password: newPassword() };
  personFlow.current = { ...f, step: "account", acc };
  reply(`${f.draft.name} için giriş ${acc.login} olacak, şifre ekranda. Hesabı açayım mı? Kullanıcı adını değiştirmek için “kullanıcı adı … olsun” de.`, { person: personCard(personFlow.current), engine: "local", expect: true }, viaVoice);
}

export async function personOpenAccount(ctx, viaVoice = false) {
  const { isStaff, personCard, personFlow, reply, setSteps, stepTo, stepsEnd, toast } = ctx;
  const f = personFlow.current;
  if (!f?.uid || f.step !== "account" || isStaff) return;
  personFlow.current = { ...f, step: "opening" };
  setSteps([]);
  stepTo("Hesap açılıyor");
  try {
    await openAccount({ uid: f.uid, name: f.draft.name, kind: f.draft.kind, login: f.acc.login, password: f.acc.password });
    stepsEnd();
    navigator.vibrate?.([10, 40, 10]);
    toast("Hesap açıldı");
    personFlow.current = { ...f, step: "opened" };
    reply(`Hesabı açtım. Giriş bilgileri ekranda; ${f.draft.phone ? "WhatsApp ile gönderebilirsin" : "kişiye ilet"}.`, { person: personCard(personFlow.current), engine: "local" }, viaVoice);
  } catch (e) {
    stepsEnd(false);
    personFlow.current = f;
    reply(`${e.message} Başka bir kullanıcı adı söyleyebilir ya da vazgeçebilirsin.`, { person: personCard(f), engine: "local", expect: true }, viaVoice);
  }
}

// Düzenle: kaydedilmemiş bilgiler kişi formunda dolu açılır; kaydedildiyse kişinin kartı açılır
export function personEdit(ctx) {
  const { park, personFlow, reply, router } = ctx;
  const f = personFlow.current;
  if (!f) return;
  park();
  if (f.uid) {
    router.push(personPath(f.uid));
    return reply(`${f.draft.name} sayfasını açtım.`, { engine: "local" });
  }
  askOpen({ prefill: f.draft });
  router.push(`/people/${groupOfKind(f.draft.kind || "other")}`);
  reply("Kişi formunu doldurup açtım; kontrol edip “Ekle”ye bas.", { engine: "local" });
}

// Kişi sayfası: "Ali'nin sayfasını aç" (yalnız ana hesap). Kişilerde yoksa sporcu kartına bırakır (sporcu.js).
export function personOpenCmd(ctx, s, viaVoice) {
  const { leave, members, owner, park, router, showPage } = ctx;
  const po = owner ? personOpenCommand(s) : null;
  if (!po) return undefined;
  const list = (members || []).filter((m) => m.name && m.status !== "left");
  const hit = matchPerson(po.name, list.map((m) => m.name));
  const m = hit ? list.find((x) => x.name === hit) : null;
  if (!m) return undefined;
  park();
  router.push(personPath(m.uid));
  leave(`${m.name} sayfasını açtım.`, viaVoice);
  showPage?.();
  return true;
}

export function personUndoAsk(ctx, viaVoice = false) {
  const { allMembers, personCard, personFlow, reply } = ctx;
  const f = personFlow.current;
  if (!f?.uid) return;
  const m = (allMembers || []).find((x) => x.uid === f.uid);
  if (m && m.account !== false) return reply(`${f.draft.name} için hesap açıldığından buradan silmiyorum; Kişiler sayfasından silebilirsin.`, { engine: "local" }, viaVoice);
  personFlow.current = { ...f, step: "undo" };
  reply(`Az önce eklediğim ${f.draft.name} silinsin mi?`, { person: personCard(personFlow.current), engine: "local", expect: true }, viaVoice);
}

export async function personUndo(ctx, viaVoice = false) {
  const { allMembers, birthdays, deleteRecord, personFlow, profile, reply, toast } = ctx;
  const f = personFlow.current;
  if (!f?.uid) return;
  const m = (allMembers || []).find((x) => x.uid === f.uid);
  if (m && m.account !== false) return reply(`${f.draft.name} için hesap açıldığından buradan silmiyorum; Kişiler sayfasından silebilirsin.`, { engine: "local" }, viaVoice);
  try {
    await removePerson(profile.uid, f.uid);
    const b = birthdays.find((x) => x.memberUid === f.uid);
    if (b) deleteRecord("birthday", b.id);
    toast(`${f.draft.name} silindi`);
    personFlow.current = null;
    reply(`Geri aldım, ${f.draft.name} silindi.`, { engine: "local" }, viaVoice);
  } catch {
    reply("Silemedim; Kişiler sayfasından silebilirsin.", { engine: "local" }, viaVoice);
  }
}

export async function birthdayDeleteCmd(ctx, s, viaVoice) {
  const { askOk, birthdays, deleteRecord, done, reply } = ctx;
  // Doğum günü silme: "Ayşe'nin doğum gününü sil" (onayla)
  const bd = birthdayDeleteCommand(s);
  if (bd) {
    const hit = matchPerson(bd.name, birthdays.map((b) => b.name || ""));
    const b = hit ? birthdays.find((x) => x.name === hit) : null;
    if (!b) {
      reply(`${bd.name} için kayıtlı doğum günü bulamadım.`, { engine: "local" }, viaVoice);
      return true;
    }
    askOk(`${b.name} doğum günü silinsin mi?`, "Sil", (v) => {
      deleteRecord("birthday", b.id);
      done(`${b.name} doğum gününü sildim.`, { engine: "local" }, v);
    }, viaVoice, /^sil\p{L}*[\s.!]*$/iu);
    return true;
  }
}

export async function personDeleteCmd(ctx, s, viaVoice) {
  const { askOk, dataUid, done, members, owner, profile, reply } = ctx;
  // Kişi silme (ana hesap, hesabı olmayan kişi): "Ayşe Yılmaz'ı kişilerden sil" (onayla)
  const pd = owner ? personDeleteCommand(s) : null;
  if (pd) {
    const live = members.filter((m) => m.status !== "left");
    const hit = matchPerson(pd.name, live);
    const m = hit ? live.find((x) => x.name === hit) : null;
    if (!m) {
      reply(`${pd.name} kişilerde yok.`, { engine: "local" }, viaVoice);
      return true;
    }
    if (m.account !== false) {
      reply(`${m.name} uygulamada hesabı olan biri; hesabı kapatmayı Kişiler sayfasından onun kartında yap.`, { engine: "local", nav: "people" }, viaVoice);
      return true;
    }
    askOk(`${m.name} kişilerden silinsin mi?`, "Sil", async (v) => {
      try {
        await setDoc(doc(db, "orgs", dataUid || profile.uid, "members", m.uid), { status: "left", leftAt: new Date().toISOString() }, { merge: true });
        done(`${m.name} kişilerden silindi.`, { engine: "local" }, v);
      } catch {
        reply("Kişiyi silemedim.", { engine: "local" }, v);
      }
    }, viaVoice, /^sil\p{L}*[\s.!]*$/iu);
    return true;
  }
}
