## Nerede kaldım
- Ne yiyelim › "Siparişin" teslim edilmiş siparişi hâlâ "10 dk" diye gösteriyordu. Sebep: sipariş geçmişi oturumda bir kez okunup bellekte tutuluyor; restoran ya da kurye durumu değiştirince bu liste tazelenmiyordu (takip sayfası canlı dinlediği için orada doğru çıkıyordu). Artık açık sipariş `useOrder` ile canlı dinleniyor, `useOrder` bellekteki geçmişi de güncelliyor; teslim olunca alan kalkıyor.
## Sıradaki işler
- Telefonda dene: sipariş ver, Ne yiyelim'de bekle, Yönetim'den ya da kurye hesabından teslim et.
