## Nerede kaldım

- Ana hesabın eklediği antrenman planları sporcuya görünmüyordu: sporcu yalnız `people` listesinde olduğu planları okur (firestore.rules mine()), ana hesabın antrenman planında sporcular yoktu. Şimdi DataProvider (ana hesap açıkken) bugünkü ve ileriki antrenman planlarına (isTraining, fitness hariç, iptal değil, ana hesabın eklediği) uygulamada hesabı olan sporcu/öğrenci/velileri `people`'a ekler (`lib/sporcuPaylas.js` trainingShares). Sorumlu yapılmaz; sporcu salt okunur görür (ana sayfa, Takvim). Elle, sesle, asistanla eklenen hepsi. Kural değişmedi.
- Yan etki: sporcular artık bu antrenmanların plan hatırlatmalarını da alır (plan-reminders people'a bakar).
- Yarış: sporcu kulüp sporcusuna bağlıysa (athleteAtt athleteId) ve yarışın sporcu listesinde ise /api/my-races ile görür.

## Sıradaki işler

- Ana hesap uygulamayı bir kez açınca bugünkü antrenman sporcuya geçer; sporcu hesabında dene.
