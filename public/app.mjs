import { mages, northBosses, talents } from "./northvale.mjs";
import { openPrints, importPrints, printOf } from "./northvale-art.mjs";
import { mageArt, encounterArt, loadArt } from "./card-art.mjs";
import {
  cardOf,
  regionOf,
  shiftDirection,
  special,
  canSoak,
  canFuse,
  dragons,
  elements,
  face,
  newGame,
  encounter,
  train,
  difficulties,
  protection,
  assign,
  ready,
  preview,
  divert,
  regroup,
  resolve,
  soak,
  upgrade,
  cleanup,
} from "./game.mjs";

const app = document.querySelector("#app"),
  panel = document.querySelector("#panel"),
  details = document.querySelector("#details");
const key = "etchinstone.campaign.v1";
const glyph = {
  fire: "♨",
  water: "≈",
  lightning: "ϟ",
  shadow: "◈",
  colorless: "◇",
};
const title = (s) =>
  s.replaceAll("_", " ").replace(/^./, (x) => x.toUpperCase());
const role = ["Spell", "Element", "Boost"];
let options = {
  northvale: false,
  mages: [],
  difficulty: "Normal",
  cavalier: false,
  glass: false,
};
let game,
  slot = 0,
  dragon = "Red Dragon";
try {
  const value = JSON.parse(localStorage.getItem(key));
  if (
    value?.levels?.length === 16 &&
    (dragons[value.dragon] || northBosses[value.dragon])
  )
    game = value;
} catch {}
const save = () => {
  try {
    localStorage.setItem(key, JSON.stringify(game));
  } catch {
    document.querySelector("#status").textContent =
      "Storage unavailable. Keep this game open.";
  }
};
const btn = (action, label, value = "", classes = "", disabled = false) =>
  `<button data-action="${action}" data-value="${value}" class="${classes}" ${disabled ? "disabled" : ""}>${label}</button>`;
function modal(html) {
  details.innerHTML = html;
  if (!panel.open) panel.showModal();
}
const names = {
  ...Object.fromEntries(Object.keys(northBosses).map((x) => [x, x])),
  "Red Dragon": "Rodving",
  "Blue Dragon": "Grimroch",
  "Gray Dragon": "Helsang",
  "Yellow Dragon": "Vuurhast",
};
function setup() {
  const bosses = options.northvale ? northBosses : dragons;
  const choices = Object.entries(bosses)
    .map(
      ([id, d]) =>
        `<button class="dragon ${d.earlyDamage.element}" data-action="dragon" data-value="${id}" aria-pressed="${id === dragon}"><span class="glyph">${glyph[d.earlyDamage.element]}</span> ${names[id]}</button>`,
    )
    .join("");
  const d = bosses[dragon];
  return `<section class="cover"><div><div class="over">A solo card adventure</div><h1>Dragons of Etchinstone</h1></div></section>
  <section class="section"><label>Campaign <select id="land"><option value="base">Etchinstone</option><option value="north" ${options.northvale ? "selected" : ""}>Northvale</option></select></label>
  <details ${options.northvale || options.mages.length ? "open" : ""}><summary>Ether mages · ${options.mages.join(", ") || "Base deck"}</summary>
  <p class="hint">Each mage replaces four cards. Choose several to travel as a party.</p>${mages.map((m) => `<label class="check"><input type="checkbox" data-mage="${m}" ${options.mages.includes(m) ? "checked" : ""}>${m}</label>`).join("")}
  <label>Personal Northvale card art <input id="north-prints" type="file" accept=".json,application/json"></label></details>
  <h2>Choose your ${options.northvale ? "boss" : "dragon"}</h2><p>Cross four regions, strengthen your spells, and face your dragon with the deck you build.</p><div class="dragons">${choices}</div><div class="hint">${title(d.earlyDamage.element)} · Journey ${d.mpTiers.map((t) => t[0]).join(" / ")} MP · Battle ${d.hpTiers.map((t) => t[0]).join(" / ")} HP</div>
  <details><summary>Difficulty · ${options.difficulty}</summary><label>Starting level adjustments <select id="difficulty">${Object.keys(
    difficulties,
  )
    .map(
      (d) =>
        "<option " +
        (d === options.difficulty ? "selected" : "") +
        ">" +
        d +
        "</option>",
    )
    .join("")}</select></label>
<label class="check"><input type="checkbox" id="cavalier" ${options.cavalier ? "checked" : ""}>Cavalier · disable fusion</label><label class="check"><input type="checkbox" id="glass" ${options.glass ? "checked" : ""}>Glass Cannon · matching armor adds only 1</label></details>
${btn("start", "Begin expedition", "", "primary")}</section><footer>Game design by Joe Klipfel · Unofficial digital adaptation</footer>`;
}
function printCard(id, c, level) {
  if (!c.mage) return mageArt(c, level);
  const src = printOf(id, level);
  return src ? `<img class="north-print" src="${src}" alt="">` : "";
}
function talentValue(id, level) {
  const at = (xs) => xs[level - 1];
  switch (id) {
    case 0:
      return level === 1
        ? "No shift at this level."
        : level === 2
          ? "Element or boost at this level."
          : level === 3
            ? "Element, boost or spell at this level."
            : "All four positions can shift.";
    case 1:
      return "Penalty: " + at([4, 3, 2, 1]) + ".";
    case 2:
      return "Copy bonus: +" + at([1, 2, 2, 3]) + ".";
    case 3:
    case 8:
      return (
        "Boost penalty: " + at(id === 3 ? [3, 2, 2, 1] : [4, 3, 2, 2]) + "."
      );
    case 4:
      return "Bonus: +" + at([0, 2, 3, 4]) + ".";
    case 6:
    case 14:
      return (
        "Initiative penalty: " +
        at(id === 6 ? [4, 3, 2, 2] : [4, 3, 2, 1]) +
        "."
      );
    case 7:
    case 13:
      return level === 1
        ? "No unit at this level."
        : "Skill value: " +
            at(id === 7 ? [0, 2, 3, 4] : [0, 3, 3, 4]) +
            ". Boost costs 1 XP, spell 2, element 3 and reserve 4.";
    case 9:
    case 11:
      return (
        "Element +" +
        at(id === 9 ? [1, 2, 3, 3] : [2, 2, 3, 3]) +
        ", reserve +" +
        at(id === 9 ? [1, 1, 1, 2] : [0, 1, 1, 2]) +
        "."
      );
    case 10:
      return "Convert up to " + at([1, 2, 2, 3]) + ".";
    case 12:
      return (
        "Attack +" + at([1, 1, 2, 3]) + ", move −" + at([4, 2, 2, 1]) + "."
      );
    default:
      return "";
  }
}
function faceText(f, id) {
  const e = f.enhanced,
    types = e.colors?.join(" / ") || e.element;
  let val = e.value;
  if (special(game, id) && id === 5)
    val += "/" + [-2, 1, 3, 4][game.levels[id] - 1];
  return `${title(types)} · ${title(e.type)} <b>${val}</b>`;
}
function card(id, action, disabled = false) {
  const c = cardOf(game, id),
    f = face(game, id),
    i = game.roles.indexOf(id);
  const desc = (a) =>
    a.type === "attack/move" ? "Attack or move" : title(a.type);
  let tag;
  if (game.phase === "training")
    tag = game.levels[id] === 2 ? "Choose card" : "Adjusted";
  else if (game.phase === "upgrade")
    tag = game.hurt.includes(id)
      ? "Downgraded"
      : game.levels[id] === 4
        ? "Max level"
        : "Upgrade · " + f.upgradeCost + " XP";
  else if (game.phase === "damage")
    tag = game.hurt.includes(id)
      ? "Already soaked"
      : "Soak " + protection(game, id);
  else if (game.fuse?.bottom === id) tag = "Fused";
  else if (i < 0) tag = ready(game) ? "Reserve" : "Unassigned";
  else
    tag =
      role[i % 3] +
      (game.region === 5 ? " " + (1 + Math.floor(i / 3)) : "") +
      (game.fuse?.top === id ? " · " + title(game.fuse.element) : "");
  const playButton = btn(
    action,
    `<span class="line"><span>${glyph[c.cardElement]} ${title(f.background?.join("/") || c.cardElement)}</span><span>Lv ${game.levels[id]}</span></span><span class="cname">${c.name}</span>
    ${printCard(id, c, game.levels[id])}
    <span class="numbers">${desc(f.basic)} <b>${f.basic.value}</b><br>${faceText(f, id)}<br>Initiative ${f.initiative} · Boost ${f.boost}<br>Armor ${f.armorValue}${f.armorElement ? " · " + title(f.armorElement) : ""}</span>
    <span class="tag">${tag}</span>`,
    id,
    "card " + c.cardElement,
    disabled,
  );
  return `<div class="card-pair">${playButton}<button type="button" class="enlarge" data-action="enlarge" data-value="${id}" aria-label="Enlarge ${title(c.cardElement)} ${c.name}, level ${game.levels[id]}" aria-haspopup="dialog"><span aria-hidden="true">⛶</span> Enlarge</button></div>`;
}
const traits = {
  pierce: "Armor loses its color bonus. Combat damage locks the spell cards.",
  adaptable: "The spell and boost backgrounds set the enemy’s shield colors.",
  evasive: "Each missing point of initiative adds one to every shield.",
  summon:
    "The reserve’s background selects the enemy whose attack value is used.",
  fortified:
    "Lose initiative equal to the region unless your boost matches a shield. Against Aqualis, either boost can match the first shield to avoid losing five.",
  aggressive: "Early damage increases by one.",
  defensive: "Early damage decreases by one.",
  guarded: "Opposite-color enhanced movement loses power equal to the region.",
  labyrinth:
    "Matching either neighboring journey with your boost costs one time.",
  camp: "A partial victory or loss takes the attack matching your spell background.",
  ambush: "Early damage is doubled.",
  hazards: "Lose one time for each enemy hit.",
  night_travel: "Subtract initiative from boost, to a minimum of zero.",
  storm: "Each time penalty also deals one damage.",
  freeze: "Early damage discards your reserve.",
  poison:
    "Each hit adds one damage to your next hand, or this hand at region end.",
  ranged:
    "Early damage applies even if you match initiative. Discard your reserve to ignore this ability.",
  slow: "Move spells can use their full value here.",
  steep: "Add the reserve boost to the journey target.",
  treacherous: "A narrow victory or loss also deals one damage.",
};
function info() {
  const e = encounter(game),
    final = game.region === 5;
  const journey = !!e.mp || game.stage === "approach";
  const label = final
    ? journey
      ? "Final journey"
      : "Final enemy"
    : (journey ? "Journey" : "Enemy") + " " + e.number;
  const armor = (e.armor || [])
    .map((a) => title(a.element) + " " + a.value)
    .join(" / ");
  const facts = final
    ? journey
      ? e.mpTiers.map((t) => t[0] + " MP → " + t[2] + " time")
      : e.hpTiers.map((t) => t[0] + " HP → " + t[1].value + " damage")
    : journey
      ? [
          e.mp + " " + e.mpElement + " MP",
          e.timePenalty + " time",
          e.xp + " XP",
        ]
      : [
          e.hp + " HP",
          e.initiative + " initiative",
          e.attack + " " + e.attackElement + " attack",
          e.xp + " XP",
        ];
  if (final && !journey)
    facts.push(
      e.initiative + " initiative",
      e.earlyDamage.value + " early damage",
    );
  if (!journey) facts.push("Armor · " + armor);
  if (final && journey) facts.push(title(e.mpTiers[0][1]) + " move");
  return `<div class="enc">${final || game.northvale ? "" : encounterArt(game.region, e.number, journey)}<div class="line"><h2>${label}</h2><small>${final ? names[game.dragon] : "Key · " + cardOf(game, game.deck[0]).name}</small></div><div class="stats">${facts.map((s) => '<span class="stat">' + s + "</span>").join("")}</div>${[
    e.hard,
    e.peril,
    ...(e.abilities || [e.ability]),
  ]
    .filter((t) => traits[t])
    .map(
      (t) =>
        '<p class="hint"><b>' +
        title(t) +
        "</b> · " +
        (final && t === "poison"
          ? "After regular damage, soak nine more damage with a fresh choice of cards. Score before poison."
          : traits[t]) +
        "</p>",
    )
    .join("")}</div>`;
}
function banner() {
  return `<div class="banner"><div><div class="over">${game.region < 5 ? "Region " + game.region + " of 4" : "Final battle"} · Turn ${game.turn}</div><h1>${game.region < 5 ? regionOf(game).name : names[game.dragon]}</h1></div></div>`;
}
function setBox(i, journey) {
  const buttons = game.roles
    .slice(i, i + 3)
    .map(
      (id, j) =>
        `<button class="slot" data-action="slot" data-value="${i + j}" aria-pressed="${slot === i + j}"><small>${role[j]}</small><span>${id === null ? "Choose card" : cardOf(game, id).name}</span></button>`,
    )
    .join("");
  return `${game.region === 5 ? "<h3>Set " + (1 + i / 3) + "</h3>" : ""}<div class="slots">${buttons}</div>${journey && !preview(game).pursuer ? "" : `<label class="check"><input type="checkbox" data-speed="${i / 3}" ${game.speed[i / 3] ? "checked" : ""}>Apply boost to initiative</label>`}`;
}
function mageControls() {
  const control = (label, field, id, choices, current) =>
    `<label>${label} <select data-plan="${field}" data-id="${id}">${choices.map(([v, t]) => `<option value="${v}" ${String(current) === String(v) ? "selected" : ""}>${t}</option>`).join("")}</select></label>`;
  const out = [];
  for (const id of game.hand) {
    if (!special(game, id) || game.fuse?.bottom === id) continue;
    const c = cardOf(game, id),
      f = face(game, id),
      l = game.levels[id],
      pos = game.roles.indexOf(id);
    const choices = (xs) => xs.map((x) => [x, title(x)]);
    if (f.background.length > 1)
      out.push(
        control(
          c.name + " background",
          "colors",
          id,
          choices(f.background),
          game.colors?.[id],
        ),
      );
    if (f.enhanced.colors.length > 1)
      out.push(
        control(
          c.name + " ether for card effects",
          "etherChoice",
          id,
          choices(f.enhanced.colors),
          game.etherChoice?.[id],
        ),
      );
    if ([7, 13].includes(id) && l > 1)
      out.push(
        control(
          c.name + " · unit",
          "units",
          id,
          [
            ["", "Rest"],
            ...choices(id === 7 ? ["move", "initiative"] : ["attack", "armor"]),
          ],
          game.units?.[id],
        ),
      );
    if (id === 0 && shiftDirection(game))
      out.push(
        control(
          "Windwalker",
          "shift",
          id,
          [
            [0, "Stay"],
            [1, shiftDirection(game) < 0 ? "Shift left" : "Shift right"],
          ],
          Number(game.shift),
        ),
      );
    if (id === 10 && pos >= 0 && pos % 3 !== 2)
      out.push(
        control(
          "Berserker · convert damage to XP",
          "convert",
          id,
          Array.from({ length: [1, 2, 2, 3][l - 1] + 1 }, (_, v) => [v, v]),
          game.convert,
        ),
      );
    if (id === 12)
      out.push(
        control(
          "Seeing Red · flexible boost",
          "seeing",
          id,
          choices(["attack", "move"]),
          game.seeing,
        ),
      );
  }
  return out.length ? `<div class="mage-options">${out.join("")}</div>` : "";
}
function play() {
  const p = preview(game),
    e = encounter(game),
    journey = !!e.mp || game.stage === "approach";
  return (
    banner() +
    info() +
    `<section class="section"><div class="line"><h2>Action set${game.region === 5 ? "s" : ""}</h2><small>${game.deck.length} in deck</small></div><p class="hint">Choose a role, then tap a card. Match the element to cast its enhanced spell.</p>
    ${setBox(0, journey)}${game.region === 5 ? setBox(3, journey) : ""}
    <div class="cards">${game.hand.map((id) => card(id, "assign")).join("")}</div>
    ${mageControls()}<div class="actions">${game.cavalier ? "" : btn("fusion", game.fuse ? "Edit fusion" : "Fuse cards")}${game.stage === "region" ? btn("divert", "Divert · " + (2 - game.diverts) + " left", "", "", game.diverts >= 2) : game.stage === "approach" ? btn("regroup", "Regroup", "", "", game.regrouped || game.hand.length + game.deck.length < 8) : ""}</div>
    ${e.ability === "ranged" || e.abilities?.includes("ranged") ? `<label class="check"><input id="evade" type="checkbox" ${game.evade ? "checked" : ""}>Discard reserve to ignore Ranged</label>` : ""}
    <div class="box"><div class="result">${p.power} ${journey ? "move" : "attack"}${journey ? "" : " · " + p.initiative + " initiative"}</div><p class="hint">${ready(game) ? p.outcome + " · Target " + p.target + " · " + p.xp + " XP · " + p.damage + " damage · " + p.time + " time" + (p.pursuer ? " · Pursuer" : "") + (p.unitCost ? " · Unit cost " + p.unitCost + (game.region === 5 ? " ×2 damage" : " XP") : "") : "Assign your cards to preview the outcome."}</p>${btn("resolve", "Resolve encounter", "", "primary", !ready(game))}</div></section>`
  );
}
function aftermath() {
  const damage = game.phase === "damage",
    p = game.last;
  return (
    banner() +
    `<section class="box"><div class="over">${game.poisoning || game.beforePoison != null ? "Poison" : game.journeyDebt || game.previousHurt ? "Unit payment" : p.outcome}</div><h2>${damage ? "Soak " + game.damage + " damage" : "Spend " + game.xp + " XP"}</h2><p>${damage ? "Choose a card to downgrade. Level 1 cards are trashed." : "Choose cards to upgrade. Unspent XP expires when you continue."}</p>
  <div class="hint">Resolved with ${p.power} power · ${p.initiative} initiative · ${p.time} time lost</div></section>
  <div class="cards">${game.hand.map((id) => card(id, damage ? "soak" : "upgrade", (damage && !canSoak(game, id)) || game.hurt.includes(id) || (!damage && (game.levels[id] === 4 || face(game, id).upgradeCost > game.xp)))).join("")}</div>
  ${damage ? "" : btn("cleanup", "Continue expedition", "", "primary")}`
  );
}
function render() {
  app.innerHTML = !game
    ? setup()
    : game.phase === "training"
      ? `<section class="box"><div class="over">${game.difficulty} difficulty</div><h2>Prepare your deck</h2><p>${game.direction > 0 ? "Upgrade" : "Downgrade"} ${game.remaining} more starting card${game.remaining === 1 ? "" : "s"} before the first shuffle.</p></section><div class="cards">${game.candidates.map((id) => card(id, "train", game.levels[id] !== 2)).join("")}</div>`
      : game.phase === "end"
        ? banner() +
          `<section class="box"><div class="over">Expedition complete</div><h2>${game.won ? (game.northvale ? "Boss defeated" : "Dragon defeated") : "The expedition falls"}</h2><p>${game.reason}</p><p>Final score · ${game.score}</p>${btn("restart", "New expedition", "", "primary")}</section>`
        : game.phase === "play"
          ? play()
          : aftermath();
}
function help() {
  modal(`<h2>How to play</h2>${game?.northvale || game?.mages?.length ? `<h3>Northvale</h3><p>Enlarge a mage card for its ability at the current level. Optional mage actions appear below the hand. Your preview includes active abilities.</p><label>Import personal Northvale card art <input id="north-prints" type="file" accept=".json,application/json"></label>` : ""}<h3>Build your hand</h3><p>The key card reveals the encounter. Assign a spell for attack or move, an element for initiative, and a boost for extra power or initiative. A fourth card stays in reserve.</p><h3>Choose a spell</h3><p>Match the element card to the element printed on the spell’s enhanced line to use that line. Otherwise use the basic line. An action of the wrong type is worth 1. Matching enhanced moves also add your reserve’s boost on a journey.</p><h3>Resolve and grow</h3><p>Reach the target for complete victory, or reach half (rounded up) for XP with a penalty. Slower initiative also takes early damage. Downgrade hand cards to absorb damage, then spend XP on undamaged cards.</p><h3>Face the dragon</h3><p>After four regions, use two action sets for the final journey. Your remaining deck then fights the dragon. Meet the first tier in both challenges and survive its damage to win.</p>
  <p><a style="color:var(--gold)" href="https://chiptheorygames.com/pages/support/dragons-of-etchinstone" target="_blank" rel="noopener">Publisher’s rulebooks ↗</a></p><h3>Play on iPhone</h3><p>In Safari, use Share → Add to Home Screen. Open the installed game once online before playing offline. Progress is saved on this device.</p>`);
}
function journal() {
  modal(
    `<h2>Expedition journal</h2>${game ? `<p>Hunting ${names[game.dragon]} · ${game.levels.filter(Boolean).length} surviving cards</p>${game.log.map((t) => `<div class="journal"><small>Turn ${t.turn} · ${t.place}</small><br>${t.outcome} · ${t.power} power · ${t.xp} XP</div>`).join("") || "<p>Your first encounter awaits.</p>"}${btn("confirmRestart", "Abandon expedition", "", "wide")}` : "<p>Begin an expedition to record your encounters here.</p>"}`,
  );
}
function fusion() {
  const pairs = [];
  for (const top of game.roles.filter((id) => id !== null))
    for (const bottom of game.hand.filter(
      (id) => !game.roles.includes(id) && id !== top && canFuse(game, id, top),
    ))
      pairs.push([top, bottom]);
  modal(
    `<h2>Fuse cards</h2><p>Pair an assigned card with a spare card of the same element. Choose its new element. Both cards are spent.</p>${pairs.length ? `<label>Card pair <select id="pair">${pairs.map(([a, b]) => `<option value="${a},${b}">${cardOf(game, a).name} + ${cardOf(game, b).name}</option>`).join("")}</select></label><p><label>New element <select id="ether">${elements.map((e) => '<option value="' + e + '">' + title(e) + "</option>").join("")}</select></label></p>${btn("applyFuse", "Apply fusion", "", "primary")}` : "<p>Assign a role and leave a matching card unassigned to fuse them.</p>"}${game.fuse ? btn("unfuse", "Remove fusion", "", "wide") : ""}`,
  );
}
function enlargeCard(id) {
  const c = cardOf(game, id),
    level = game.levels[id];
  document.querySelector("#card-title").textContent = c.name;
  document.querySelector("#card-level").textContent =
    title(c.cardElement) + " · Level " + level;
  document.querySelector("#print-face").innerHTML = c.mage
    ? printCard(id, c, level) +
      `<div class="box"><b>${c.mage} · ${title(face(game, id).background.join(" / "))}</b><p>${title(face(game, id).basic.type)} ${face(game, id).basic.value}<br>${faceText(face(game, id), id)}</p><p>Initiative ${face(game, id).initiative} · Boost ${face(game, id).boost} · Armor ${face(game, id).armorValue} ${face(game, id).armorElement || ""}</p><p>${talents[id]} ${talentValue(id, level)}</p><small>${face(game, id).encounterIcon} ${face(game, id).encounterValue} · Upgrade ${level === 4 ? "max" : face(game, id).upgradeCost + " XP"}</small></div>`
    : mageArt(c, level) + '<p class="art-wait">Loading printed card…</p>';
  document.querySelector("#card-view").showModal();
  loadArt();
}
document.addEventListener("card-art-ready", () => {
  const hint = document.querySelector(".art-wait");
  if (hint && !document.documentElement.classList.contains("has-powers"))
    hint.textContent =
      "Card image unavailable. Tap Enlarge while online to try again.";
});
window.addEventListener("online", loadArt);
loadArt();
document.querySelector("#help").onclick = help;
document.querySelector("#journal").onclick = journal;
document.addEventListener("click", (event) => {
  const b = event.target.closest("[data-action]");
  if (!b) return;
  const a = b.dataset.action,
    v = b.dataset.value,
    id = Number(v),
    oldPhase = game?.phase,
    oldTurn = game?.turn;
  if (a === "enlarge") {
    enlargeCard(id);
    return;
  }
  if (a === "dragon") dragon = v;
  if (a === "start") {
    game = newGame(
      dragon,
      options.difficulty,
      options.cavalier,
      options.glass,
      options,
    );
    slot = 0;
  }
  if (a === "train") train(game, id);
  if (a === "slot") slot = id;
  if (a === "assign") {
    assign(game, slot, id);
    const next = game.roles.findIndex((x) => x === null);
    if (next !== -1) slot = next;
  }
  if (a === "fusion") {
    fusion();
    return;
  }
  if (a === "applyFuse") {
    const [top, bottom] = document
      .querySelector("#pair")
      .value.split(",")
      .map(Number);
    game.fuse = {
      top,
      bottom,
      element: document.querySelector("#ether").value,
    };
    panel.close();
  }
  if (a === "unfuse") {
    game.fuse = null;
    panel.close();
  }
  if (a === "divert" || a === "regroup") {
    modal(
      `<h2>${title(a)}</h2><p>${a === "divert" ? "Discard a hand card and the key card to reveal a new encounter." : "Discard one card, cycle the rest of your hand to the back, then draw seven."}</p><div class="cards">${game.hand.map((c) => card(c, a + "Card")).join("")}</div>`,
    );
    return;
  }
  if (a === "divertCard" || a === "regroupCard") {
    (a === "divertCard" ? divert : regroup)(game, id);
    slot = 0;
    panel.close();
  }
  if (a === "resolve") resolve(game);
  if (a === "upgrade") upgrade(game, id);
  if (a === "soak") soak(game, id);
  if (a === "cleanup") {
    cleanup(game);
    slot = 0;
  }
  if (a === "confirmRestart") {
    modal(
      "<h2>Abandon expedition?</h2><p>Your current hand and campaign progress will be cleared.</p>" +
        btn("restart", "Abandon and start again", "", "wide"),
    );
    return;
  }
  if (a === "restart") {
    game = null;
    slot = 0;
    if (panel.open) panel.close();
  }
  if (oldTurn !== game?.turn) slot = 0;
  save();
  render();
  if (oldPhase !== game?.phase || oldTurn !== game?.turn) window.scrollTo(0, 0);
});
document.addEventListener("change", async (event) => {
  const t = event.target;
  if (t.id === "north-prints" && t.files[0]) {
    try {
      await importPrints(t.files[0]);
      render();
      modal(
        "<h2>Card art ready</h2><p>All 64 Northvale faces are saved on this device.</p>",
      );
    } catch {
      modal(
        "<h2>Could not import card art</h2><p>Choose the Northvale card art JSON pack.</p>",
      );
    }
    return;
  }
  if (!game && t.id === "land") {
    options.northvale = t.value === "north";
    dragon = options.northvale ? "Merinus" : "Red Dragon";
    if (options.northvale && !options.mages.length) options.mages = ["Voltak"];
    render();
    return;
  }
  if (!game && t.dataset.mage) {
    options.mages = t.checked
      ? [...options.mages, t.dataset.mage]
      : options.mages.filter((m) => m !== t.dataset.mage);
    render();
    return;
  }
  if (game && t.dataset.plan) {
    const f = t.dataset.plan;
    if (["colors", "units", "etherChoice"].includes(f))
      (game[f] ??= {})[t.dataset.id] = t.value;
    else
      game[f] =
        f === "shift"
          ? !!Number(t.value)
          : f === "convert"
            ? Number(t.value)
            : t.value;
    save();
    render();
    return;
  }
  if (!game) {
    const field = event.target.id;
    if (field === "difficulty") {
      options.difficulty = event.target.value;
      event.target.closest("details").querySelector("summary").textContent =
        "Difficulty · " + options.difficulty;
    }
    if (field === "glass" || field === "cavalier")
      options[field] = event.target.checked;
    return;
  }
  if (event.target.matches("[data-speed]"))
    game.speed[Number(event.target.dataset.speed)] = event.target.checked;
  else if (event.target.id === "evade") game.evade = event.target.checked;
  else return;
  save();
  render();
});
render();
openPrints()
  .then(render)
  .catch(() => {});
if ("serviceWorker" in navigator)
  navigator.serviceWorker.register("./sw.js").catch(() => {
    document.querySelector("#status").textContent =
      "Offline installation unavailable on this connection.";
  });
