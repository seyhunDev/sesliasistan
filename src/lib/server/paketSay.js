// Ana hesabın sporcu sayısı (paket sınırı; lib/paket.js): orgs/{uid}/athletes belgeleri, arşivdekiler de sayılır
export const sayOf = (db, uid) =>
  db
    .collection("orgs")
    .doc(uid)
    .collection("athletes")
    .count()
    .get()
    .then((s) => s.data().count, () => 0);
