// Kayıtla açılan hesap (users/{uid}.dogrula, lib/auth.js register) e-postasını doğrulamadan sporcu ekleyemez ve paket isteyemez
// (2026-11-27; uygulamada DogrulaGate). Eski hesaplarda ve kişi hesaplarında (sporcu, çalışan) işaret yok, etkilenmez.
export const DOGRULA = "Önce e-postanı doğrula.";
export const dogrulanmadi = (user, au) => user?.dogrula === true && !au?.verified;
