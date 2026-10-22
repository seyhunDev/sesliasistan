// Yemek fotoğrafları: ücretsiz lisanslı Unsplash adresleri (images.unsplash.com, Unsplash License).
// Kendi fotoğrafların yüklenince ürünün `photo` alanı Firebase Storage adresi olur; bu yardımcı yalnız Unsplash kimliklerini açar.
export const PHOTOS = {
  pizza: "photo-1513104890138-7c749659a591",
  pizzaPep: "photo-1628840042765-356cda07504e",
  pizzaMarg: "photo-1574071318508-1cdbab80d002",
  pizzaVeg: "photo-1565299624946-b28f40a0ae38",
  burger: "photo-1568901346375-23c9450c58cd",
  burger2: "photo-1550547660-d9450f859349",
  burger3: "photo-1571091718767-18b5b1457add",
  fries: "photo-1573080496219-bb080dd4f877",
  sushi: "photo-1579871494447-9811cf80d66c",
  sushi2: "photo-1553621042-f6e147245754",
  pasta: "photo-1563379926898-05f4575a45d8",
  pasta2: "photo-1621996346565-e3dbc646d9a9",
  salad: "photo-1512621776951-a57141f2eefd",
  soup: "photo-1547592166-23ac45744acd",
  stew: "photo-1455619452474-d2be8b1e70cd",
  rice: "photo-1516684732162-798a0062be99",
  kebab: "photo-1529006557810-274b9b2fc783",
  doner: "photo-1561651823-34feb02250e4",
  fish: "photo-1519708227418-c8fd9a32b7a2",
  seafood: "photo-1565680018434-b513d5e5fd47",
  breakfast: "photo-1533089860892-a7c6f0a88666",
  dessert: "photo-1551024601-bec78aea704b",
  icecream: "photo-1563805042-7684c019e1cb",
  cake: "photo-1578985545062-69928b1d9587",
  drink: "photo-1544145945-f90425340c7e",
  lemonade: "photo-1621263764928-df1444c5e859",
};

// "pizza" → tam adres; zaten adres olan değer olduğu gibi döner. w: genişlik (liste 240, kapak 800)
export function photoUrl(key, w = 480) {
  if (!key) return "";
  if (/^https?:\/\//.test(key)) return key;
  const id = PHOTOS[key] || key;
  return `https://images.unsplash.com/${id}?w=${w}&q=70&auto=format&fit=crop`;
}
