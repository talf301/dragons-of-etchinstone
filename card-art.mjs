// Original print-and-play sheets and layout from beamer159/etchinstone.
const revision = "fb0d656638712b1a8f4dd11863ee73f4dfc1265e";
const base =
  "https://raw.githubusercontent.com/beamer159/etchinstone/" +
  revision +
  "/images/";
const sheets = ["powers", "enemies", "journeys"];

// Each suit occupies a 4-by-4 block. Even-level rows reverse card order.
const suits = {
  water: [
    0,
    0,
    ["Destruction", "Sword of Light", "Brute Force", "Frostfire Wall"],
  ],
  lightning: [
    4,
    0,
    ["Rain of Blood", "Fleet Footed", "Adapt", "River Swiftness"],
  ],
  fire: [
    0,
    4,
    ["Burning Bridges", "Motivated Flight", "Adapt", "Frostfire Wall"],
  ],
  shadow: [
    4,
    4,
    ["Rain of Blood", "Fleet Footed", "Determined March", "River Swiftness"],
  ],
};

function tile(sheet, x, y, grid) {
  return `<span aria-hidden="true" class="printed ${sheet}" style="background-position:${(100 * x) / (grid - 1)}% ${(100 * y) / (grid - 1)}%"></span>`;
}
export function mageArt(card, level) {
  const [col, row, names] = suits[card.cardElement];
  const pos = names.indexOf(card.name);
  if (pos < 0 || level < 1 || level > 4) return "";
  return tile("powers", col + (level % 2 ? pos : 3 - pos), row + level - 1, 8);
}
export function encounterArt(region, number, journey) {
  return tile(journey ? "journeys" : "enemies", number - 1, region - 1, 4);
}
async function loadSheet(sheet, cache) {
  const url = base + sheet + ".png";
  const cached = await cache?.match(url);
  const response =
    cached ||
    (await fetch(url, { credentials: "omit", referrerPolicy: "no-referrer" }));
  if (!response.ok) throw Error("Card image unavailable");
  const persist =
    !cached && cache ? cache.put(url, response.clone()).catch(() => {}) : null;
  const localURL = URL.createObjectURL(await response.blob());
  const image = new Image();
  image.src = localURL;
  try {
    await image.decode();
  } catch (error) {
    URL.revokeObjectURL(localURL);
    throw error;
  }
  document.documentElement.style.setProperty(
    "--" + sheet + "-image",
    `url("${localURL}")`,
  );
  document.documentElement.classList.add("has-" + sheet);
  await persist;
}
let pending;
export async function loadArt() {
  if (pending) return pending;
  pending = (async () => {
    let cache;
    try {
      cache = await caches.open("etchinstone-print-" + revision);
    } catch {}
    await Promise.allSettled(
      sheets
        .filter(
          (sheet) =>
            !document.documentElement.classList.contains("has-" + sheet),
        )
        .map((sheet) => loadSheet(sheet, cache)),
    );
    document.dispatchEvent(new Event("card-art-ready"));
  })();
  try {
    await pending;
  } finally {
    pending = null;
  }
}
