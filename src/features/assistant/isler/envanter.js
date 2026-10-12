// Asistanın işleri: AssistantSheet.jsx'ten taşındı (ctx: bileşenin durumu ve yardımcıları).
import { inventoryWork } from "@/lib/assistTasks";
import { loadInventories, lastInv, askInventory, createInventory, setLastInv, changeInventory } from "@/features/inventory/inventory";
import { pickInv, applyOps, statsText, itemLabel, dropItem } from "@/features/inventory/invModel";
import { dropInvFile } from "@/features/inventory/invFiles";

// Envanter: hedef envanter (cümlede adı geçen, açık sayfadaki, son kullanılan, yoksa kulüp) seçilir, yapay zeka işlemleri verir
export async function runInventory(ctx, s, viaVoice) {
  const { done, invFlow, invHere, myUid, profile, reply, runId, setPhase, setSteps, stepTo, stepsEnd, toast, waitFor } = ctx;
  const id = ++runId.current;
  const org = profile?.orgId || myUid;
  setPhase("thinking");
  setSteps([]);
  stepTo(inventoryWork(s));
  try {
    const list = await loadInventories(org);
    let inv = pickInv(s, list, { here: invHere, last: lastInv() });
    if (!inv) throw new Error("Envanter bulunamadı.");
    const r = await askInventory(s, inv, list.filter((x) => x.id !== inv.id).map((x) => x.name));
    if (id !== runId.current) return;
    if (r.newInv) {
      stepTo("Yeni envanter açılıyor");
      inv = await createInventory(org, r.newInv.name, r.newInv.kind, list.length + 1);
    }
    setLastInv(inv.id);
    const plan = applyOps(inv, r.ops, { by: profile?.name || "" });
    if (plan.changed) {
      stepTo("Envantere kaydediliyor");
      inv = await changeInventory(org, inv.id, (cur) => applyOps(cur, r.ops, { by: profile?.name || "" }).inv);
    }
    if (id !== runId.current) return;
    stepsEnd();
    const card = { id: inv.id, name: inv.name, kind: inv.kind, sub: statsText(inv) };
    const said = [r.newInv ? `Yeni envanter açtım: ${inv.name}.` : "", ...plan.lines].filter(Boolean).join(" ");
    if (plan.changed) {
      navigator.vibrate?.([10, 40, 10]);
      toast("Envanter kaydedildi");
    }
    if (plan.deletes.length) {
      waitFor("inv");
      invFlow.current = { org, id: inv.id, name: inv.name, kind: inv.kind, ask: plan.deletes };
      const q = `${plan.deletes.map((x) => `“${itemLabel(x)}”`).join(", ")} envanterden silinsin mi?`;
      return reply(`${said} ${q}`.trim(), { inv: { ...card, ask: plan.deletes }, engine: "ai", expect: true }, viaVoice);
    }
    if (!said) return reply(r.message || "Envanterde bir değişiklik yapmadım. Ne eklememi ya da çıkarmamı istersin?", { inv: card, engine: "ai", expect: !r.message }, viaVoice);
    done(`${said}${r.message && /\?\s*$/.test(r.message) ? ` ${r.message}` : ""}`, { inv: card, engine: "ai" }, viaVoice);
  } catch (e) {
    if (id !== runId.current) return;
    stepsEnd(false);
    reply(`${e.message || "Envanter işlenemedi."} Envanter sayfasından elle de ekleyebilirsin.`, { fail: true, engine: "local", nav: "inventory" }, viaVoice);
  } finally {
    if (id === runId.current) setPhase("idle");
  }
}

export async function invDelete(ctx, f, viaVoice = false) {
  const { done, invFlow, profile, reply, toast } = ctx;
  invFlow.current = null;
  try {
    const inv = await changeInventory(f.org, f.id, (cur) => f.ask.reduce((v, x) => dropItem(v, x.id, { by: profile?.name || "" }), cur));
    toast("Envanterden silindi");
    f.ask.flatMap((x) => x.files || []).forEach((m) => dropInvFile(f.org, m));
    done(`Sildim: ${f.ask.map((x) => x.name).join(", ")}.`, { inv: { id: f.id, name: inv.name, kind: inv.kind, sub: statsText(inv) }, engine: "local" }, viaVoice);
  } catch {
    toast("Silinemedi");
    reply("Silemedim, bağlantını kontrol edip tekrar dene.", { engine: "local" }, viaVoice);
  }
}
