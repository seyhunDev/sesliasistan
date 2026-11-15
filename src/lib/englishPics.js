// İngilizce kalıpların resmi (Seyhun 2026-11-15: "insan harfleri değil şekilleri ezberler… portakal: yuvarlak, turuncu → orange").
// Her kalıbın bir sahnesi var: kalıbın anlamını ilk örnek cümleyle gösterir. Resmi yapay zeka bir kez çizer (/api/english-pic),
// orgs/{org}/englishPic/{kalıp id} belgesine kaydedilir ve bir daha değişmez (ana hesap "Yeniden çiz" demedikçe).
// Soyut kalıplar sabit bir işaretle çizilir: "eskiden" solmuş eski fotoğraf, "alışkın" aynı sahne üst üste, öneri uzatılan bir şey.
// Örnek: /mnt/project-files/ingilizce-kelime/sekil/ornek.html (onay "Yap", 2026-11-15).

// Bütün resimlerde aynı tarz: kalıbın şekli ve rengi hep aynı kalır, göz tanır
export const PIC_STYLE =
  "Flat vector illustration, simple bold geometric shapes, few warm saturated colors, soft plain light background, one clear subject in the center, " +
  "friendly adult cartoon characters without detailed faces, square composition, lots of empty space, no shadows, no gradients. " +
  "Absolutely no text, letters, numbers, signs with writing, speech bubbles with words or logos anywhere in the image.";

export const PICS = {
  "look-forward": "A person standing at a window smiling and looking toward a friend walking up the path from far away, arms open, heart-shaped little sparkle above, a calendar on the wall with one day circled.",
  "do-you-mind": "A person holding the back of an empty chair beside a seated stranger at a cafe table, one open palm gesturing politely toward the chair, asking permission.",
  "used-to": "The same small scene repeated three times side by side like a strip: a person getting out of bed at dawn with an alarm clock and the rising sun. Habit, every day the same.",
  "i-used-to": "An old faded sepia photograph with curled corners and a white border, showing a person on a balcony in a big city by the Bosphorus with a bridge and seagulls. Clearly an old memory from the past.",
  "how-about": "A hand reaching forward and offering a steaming cup of coffee toward the viewer, a second empty hand visible on the other side about to take it. A suggestion.",
  "can-you-help": "A person struggling to lift a heavy cardboard box and another person stepping in to hold the other side of the box, together.",
  "on-my-way": "A person walking briskly along a seaside road with a bag on their shoulder, a small sailing club with masts and flags ahead at the end of the road, motion lines behind the walker.",
  "dont-forget": "A phone on a table with a large string tied in a bow around one finger of a hand pointing at it. A reminder not to forget to call.",
  "it-depends": "A balance scale: on one side a sunny sky with a sailboat, on the other side a dark cloud with rain. The scale is undecided in the middle.",
  "im-not-sure": "A person standing at a fork in the road, shrugging, with a big question mark shape floating above made of simple dots (not a letter), a house far away down one path.",
  "i-feel-like": "A person sitting on a sofa looking longingly at an open door through which a bright sunny park and street are visible, a thought cloud showing themselves walking outside.",
  "worried-about": "A student at a desk with an exam paper with blank lines, biting nails, a small grey storm cloud over their head, a clock on the wall.",
  "its-worth": "A person taking a first bite of an unusual colorful dish, their eyes wide with delight, a small golden star shining above the plate. Worth a try.",
  "no-point": "A person sitting on a bench at an empty bus stop at night, the bus already far away, cobwebs on the bench and a long clock. Waiting is pointless.",
  "i-wish": "A person on a sunny beach holiday with a packed suitcase and a taxi waiting, looking back sadly at the sea and the sunset, wishing to stay longer.",
  "its-up-to": "One person holding out two different paths drawn on a map toward another person, palm open, letting them choose. The choice is yours.",
  "im-trying": "A person at a desk with a laptop wearing headphones, eyes closed in concentration, while small distractions (a ringing phone, a fly, a flashing notification shape) circle around them.",
  "im-in-charge": "A person holding a big piggy bank and a clipboard with coins stacked in neat columns on a table, a small badge on their chest, clearly the one responsible for money.",
  "lets-make-sure": "A person ticking a checklist on a whiteboard while a group of four people nod with thumbs up, everyone looking at the board.",
  "ill-get-back": "A person ending a phone call with a friendly wave, a desk calendar beside them with the next day's page shown and a curved arrow from today to tomorrow.",
  "were-running-out": "A big hourglass with almost no sand left in the top half, two people beside it hurrying with papers, sweat drops.",
  "it-takes": "A simple round kitchen timer next to a pot of boiling pasta, a short arc highlighted on the timer showing a little time passing.",
  "id-rather": "A person sitting comfortably in a cozy armchair with a blanket and a book, politely raising a hand to decline, while through the window a noisy rainy street is visible.",
  "as-soon-as": "A train arriving at a station platform, a person stepping off and immediately pressing a phone to send a message, a small flying envelope shape going from the phone.",
  "id-like": "A person at a restaurant entrance speaking politely to a waiter who points to an empty set table for two with a reserved small stand without writing.",
  "is-there": "A tourist with a backpack on a street corner looking around, holding a map, with a small green cross pharmacy shape (no letters) far down the street.",
  "how-long-does": "A taxi on a road leading to an airport with planes in the sky, a large clock face floating above the road, a traveler with a suitcase in the back seat.",
  "can-i-have": "A person at a restaurant table raising a hand to a waiter and making a writing-in-the-air gesture, empty plates on the table, waiter bringing a small tray with a folded paper.",
  "im-looking-for": "A traveler with a suitcase holding a magnifying glass and searching, a train station building with a clock tower partly hidden behind houses.",
  "whats-the-best-way": "A person studying three different paths (walking, bus, boat) drawn as colored lines leading to an old town with stone walls and a castle on a hill.",
  "my-flight": "An airport departure hall with a big board showing only red and yellow color bars (no writing), a traveler sitting on a suitcase sighing, a plane parked outside the window.",
  "keep-an-eye": "A sailing coach on a small motor boat watching the sea through binoculars, a wind arrow and wind lines over the water, small sailboats in the distance.",
  "get-better": "Three small sailboats crossing a start line marked by two buoys, the same boat shown three times getting further ahead each time, an upward arrow made of waves.",
  "make-sure-you": "A coach handing a bright orange life jacket to a young sailor standing next to a small sailboat on the beach, pointing at the jacket.",
  "its-time-to": "A person at the door putting on a jacket, a wall clock above the door, keys in hand, the door open toward the street.",
  "good-job-on": "A coach giving a high five to a smiling young sailor who has just come ashore from a small sailboat, the start buoys visible behind on the sea.",
  "were-short-of": "A small inflatable coach boat with an empty driver's seat at a pier, three people on the pier looking around for someone, one person raising a hand to volunteer.",
};

export const picScene = (id) => PICS[id] || "";

// Yapay zekaya giden tarif: tarz + sahne + kalıbın kendisi (anlam için; resimde yazı olmaz)
export function picPrompt(c) {
  const scene = picScene(c?.id);
  if (!scene) return "";
  const ex = c.fills?.[0] ? `${c.head} ${c.fills[0][0]}${c.tail ? ` ${c.tail}` : ""}`.replace(/\s+([?.!,])/g, "$1") : c.head;
  return `Create an illustration that helps a learner remember the English phrase "${ex}" by its picture.\nScene: ${scene}\nStyle: ${PIC_STYLE}`;
}
