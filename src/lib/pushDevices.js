// Bir kişinin kayıtlı cihazlarından (users/{uid}.push) gönderenin cihazlarını çıkarır. Aynı telefonda iki hesapla
// girilince cihazın aboneliği iki hesapta da kayıtlı kalıyor; kişi kendi mesajı için kendi telefonuna bildirim almasın.
export const otherDevices = (push, skip) => Object.fromEntries(Object.entries(push || {}).filter(([k]) => !skip?.has?.(k)));
