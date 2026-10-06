// Tüm yerel testler tek listede (canlı uygulama testi scripts/uygulama-test bunu kullanır)
import "./asistan.mjs";
import "./kisi.mjs";
import "./yonlendirme.mjs";
import "./ses.mjs";
import "./elle.mjs";
import "./yaris.mjs";
import { results, settle } from "./ortak.mjs";

await settle();
export default results;
