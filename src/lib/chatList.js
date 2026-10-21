// Mesajlar listesi: sabit gruplar (Ekip, Aile, Sporcular) mesajı varsa diğer sohbetlerle birlikte listede, yoksa Tümü'nde
// üstte kısa yol kartı (her sohbet tek yerde). fixed: sabit grup kimlikleri, chats: { id, last }.
export const cardGroups = (groupIds = [], chats = []) => groupIds.filter((g) => !chats.find((x) => x.id === g)?.last);
export const listed = (c, fixed = []) => !(fixed.includes(c.id) && !c.last);
