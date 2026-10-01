// Uygulama simgesindeki sayı: "Senin için"de bekleyen, henüz görülmemiş ya da karar bekleyen şeyler.
// Uygulama (DataProvider) ve sunucu (her bildirimle) aynı kuralla sayar; ikisi tutarlı kalır.
//   + okunmamış sohbet (sessize alınan hariç): sohbet başına 1
//   + başkasının eklediği/verdiği, henüz açılmamış kayıt (bitmiş görev hariç) ya da görülmemiş mesajı olan kayıt: kayıt başına 1
//   + ana hesap: bekleyen silme istekleri ve ödeme bekleyen fişler
//   + kişi: kendi fişi ödendi ama henüz görmedi
import { isNewFor, unseenNotes } from "./people.js";

export function badgeCount({ uid, owner, plans = [], tasks = [], notes = [], receipts = [], unreadChats = 0 }) {
  if (!uid) return 0;
  let n = unreadChats;
  for (const [k, list] of [["plan", plans], ["task", tasks], ["note", notes]])
    for (const r of list) {
      if (k === "task" && r.done) continue;
      if ((isNewFor(r, uid) && !r.doneBy?.[uid]) || unseenNotes(r, uid).length || (owner && r.deleteReq?.by && r.deleteReq.by !== uid)) n++;
    }
  for (const r of receipts) {
    if (owner) {
      if ((r.payStatus === "pending" && !r.deleteReq) || (r.deleteReq?.by && r.deleteReq.by !== uid)) n++;
    } else if (r.createdByUid === uid && r.payStatus === "paid" && !r.paySeenAt) n++;
  }
  return Math.min(n, 99);
}
