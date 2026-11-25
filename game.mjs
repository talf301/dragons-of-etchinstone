import data from "./cards.mjs";
export const { mageCards, regions, dragons } = data;
export const elements = ["fire", "water", "lightning", "shadow"];
export function shuffle(items) {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export const face = (g, id) => mageCards[id]?.levels[g.levels[id]];
const living = (g) => g.levels.flatMap((l, i) => (l ? [i] : []));
export const difficulties = {
  Casual: 4,
  Easy: 2,
  Normal: 0,
  Hard: -2,
  Impossible: -5,
  "Don’t Even Try It": -7,
};
export function newGame(
  dragon,
  difficulty = "Normal",
  cavalier = false,
  glass = false,
) {
  if (!dragons[dragon]) throw Error("Unknown dragon");
  const g = {
    dragon,
    difficulty,
    cavalier,
    glass,
    levels: mageCards.map(() => 2),
    region: 1,
    log: [],
    turn: 0,
  };
  const change = difficulties[difficulty];
  if (change) {
    g.phase = "training";
    g.roles = [];
    g.candidates = shuffle(living(g)).slice(0, change === -7 ? 7 : 5);
    g.remaining = Math.abs(change);
    g.direction = Math.sign(change);
  } else enterRegion(g);
  return g;
}
export function train(g, id) {
  if (
    g.phase !== "training" ||
    !g.candidates.includes(id) ||
    g.levels[id] !== 2
  )
    return;
  g.levels[id] += g.direction;
  if (--g.remaining === 0) enterRegion(g);
}
export function protection(g, id) {
  const c = face(g, id);
  if (c.armorElement && c.armorElement === g.damageElement)
    return g.glass ? c.armorValue + 1 : c.armorValue * 2;
  return c.armorValue;
}
function enterRegion(g) {
  g.deck = shuffle(living(g));
  g.hand = g.deck.splice(0, g.region === 5 ? 7 : 4);
  g.stage = g.region === 5 ? "approach" : "region";
  g.poison = 0;
  if (g.region < 5 && !g.deck.length) {
    g.region++;
    enterRegion(g);
    return;
  }
  prepare(g);
  if (!g.hand.length)
    terminal(g, false, "No mage cards survived the expedition.");
}
function prepare(g) {
  g.phase = "play";
  g.turn++;
  g.diverts = 0;
  g.hurt = [];
  g.deadReserve = false;
  g.xp = 0;
  resetPlan(g);
}
export function resetPlan(g) {
  g.roles = Array(g.region === 5 ? 6 : 3).fill(null);
  g.speed = [false, false];
  g.fuse = null;
  g.evade = false;
}
export function encounter(g) {
  if (g.region === 5) return dragons[g.dragon];
  const k = face(g, g.deck[0]);
  return {
    ...regions[g.region][k.encounterIcon === "enemy" ? "enemies" : "journeys"][
      k.encounterValue - 1
    ],
    hard: k.hardship,
    number: k.encounterValue,
  };
}
export function reserves(g) {
  return g.hand.filter((id) => !g.roles.includes(id) && g.fuse?.bottom !== id);
}
export function assign(g, slot, id) {
  if (!g.hand.includes(id) || slot < 0 || slot >= g.roles.length) return;
  if (g.fuse?.bottom === id) g.fuse = null;
  const old = g.roles.indexOf(id);
  if (old !== -1) g.roles[old] = null;
  const displaced = g.roles[slot];
  g.roles[slot] = old === slot ? null : id;
  if (old !== -1 && old !== slot) g.roles[old] = displaced;
  if (g.fuse && !g.roles.includes(g.fuse.top)) g.fuse = null;
}
export function ready(g) {
  const count = Math.min(g.hand.length - (g.fuse ? 1 : 0), g.roles.length);
  return (
    g.roles.filter((id) => id !== null).length === count &&
    g.roles[0] !== null &&
    (g.region < 5 || count < 2 || g.roles[3] !== null)
  );
}
export function preview(g) {
  const e = encounter(g),
    journey = !!e.mp || g.stage === "approach";
  const action = journey ? "move" : "attack",
    enhancedElements = new Set();
  let power = 0,
    initiative = 0;
  for (let i = 0; i < g.roles.length; i += 3) {
    const [spell, element, boost] = g.roles.slice(i, i + 3);
    if (spell === null) continue;
    const f = face(g, spell),
      el =
        element === null
          ? null
          : g.fuse?.top === element
            ? g.fuse.element
            : mageCards[element].cardElement;
    const enhanced = f.enhanced.element === el;
    const a = enhanced ? f.enhanced : f.basic;
    const matches =
      a.type.includes(action) ||
      (e.ability === "slow" && a.type.includes("move"));
    // Slow enemies accept a Move directly. Their armor only resists Attacks.
    const usesMove =
      a.type.includes("move") && (journey || e.ability === "slow");
    if (enhanced && matches && (journey || !usesMove)) enhancedElements.add(el);
    const speed = face(g, element)?.initiative ?? 0;
    let bonus = face(g, boost)?.boost ?? 0;
    if (e.hard === "night_travel") bonus = Math.max(0, bonus - speed);
    const quick = !journey && g.speed[i / 3];
    initiative += speed + (quick ? bonus : 0);
    power += (matches ? a.value : 1) + (quick ? 0 : bonus);
  }
  const reserve = reserves(g)[0],
    rb = face(g, reserve)?.boost ?? 0;
  const mpElement = e.mpElement ?? e.mpTiers?.[0][1];
  if (journey && enhancedElements.has(mpElement)) power += rb;
  if (!journey)
    for (const a of e.armor ?? [])
      if (enhancedElements.has(a.element)) power -= a.value;
  power = Math.max(0, power);
  if (g.region === 5) {
    const tiers = journey ? e.mpTiers : e.hpTiers;
    const tier = tiers.filter((t) => power >= t[0]).at(-1);
    const damage =
      tier && !journey
        ? tier[1].value + (initiative < e.initiative ? e.earlyDamage.value : 0)
        : 0;
    return {
      power,
      initiative,
      target: tiers[0][0],
      outcome: tier ? "Tier " + (tiers.indexOf(tier) + 1) : "Defeat",
      xp: 0,
      time: journey && tier ? tier[2] : 0,
      damage,
      element: journey ? null : e.earlyDamage.element,
    };
  }
  const target = journey ? e.mp + (e.peril === "steep" ? rb : 0) : e.hp;
  const full = power >= target,
    win = power >= Math.ceil(target / 2);
  const early =
    !journey &&
    (initiative < e.initiative ||
      (e.ability === "ranged" && !(g.evade && reserve !== undefined)));
  const combat = !journey && !full,
    hits = Number(early) + Number(combat);
  const time =
    (journey && !full ? e.timePenalty : 0) + (e.hard === "hazards" ? hits : 0);
  const damage =
    (early ? e.attack * (e.hard === "ambush" ? 2 : 1) : 0) +
    (combat ? e.attack : 0) +
    (journey && !full && e.peril === "treacherous" ? 1 : 0) +
    (e.hard === "storm" ? time : 0);
  return {
    power,
    initiative,
    target,
    outcome: full ? "Complete victory" : win ? "Narrow victory" : "Loss",
    xp: win ? e.xp : 0,
    time,
    damage,
    element: e.attackElement,
    poison: e.ability === "poison" ? hits : 0,
    discard:
      (early && e.ability === "freeze") || (g.evade && e.ability === "ranged"),
  };
}
export function divert(g, id) {
  if (
    g.phase !== "play" ||
    g.region === 5 ||
    g.diverts >= 2 ||
    !g.hand.includes(id)
  )
    return;
  g.hand = g.hand.filter((c) => c !== id);
  g.deck.shift();
  g.diverts++;
  resetPlan(g);
  if (!g.deck.length) {
    g.region++;
    enterRegion(g);
  }
}
export function regroup(g, id) {
  if (
    g.stage !== "approach" ||
    g.regrouped ||
    !g.hand.includes(id) ||
    g.deck.length + g.hand.length - 1 < 7
  )
    return;
  g.regrouped = true;
  g.deck.push(...shuffle(g.hand.filter((c) => c !== id)));
  g.hand = g.deck.splice(0, 7);
  resetPlan(g);
}
function terminal(g, won, reason) {
  g.phase = "end";
  g.won = won;
  g.reason = reason;
  g.score = won ? g.levels.reduce((a, b) => a + b, 0) : 0;
}
export function resolve(g) {
  if (g.phase !== "play" || !ready(g)) return;
  const p = preview(g);
  g.last = p;
  g.log.unshift({
    turn: g.turn,
    place: g.region === 5 ? g.stage : regions[g.region].name,
    ...p,
  });
  if (g.region === 5 && p.outcome === "Defeat") {
    terminal(g, false, "Your action sets fell short of the first tier.");
    return;
  }
  const overflow = Math.max(0, p.time - g.deck.length);
  g.deck.splice(0, p.time);
  if (g.stage === "approach") {
    g.stage = "dragon";
    g.hand = g.deck.splice(0);
    prepare(g);
    if (!g.hand.length)
      terminal(g, false, "No mage cards remained to fight the dragon.");
    return;
  }
  g.xp = p.xp;
  g.deadReserve = !!p.discard;
  g.poison = p.poison || 0;
  g.reserve = reserves(g)[0] ?? null;
  g.damage = p.damage + overflow;
  g.damageElement = p.element;
  g.hurt = [];
  if (g.poison && nextRegionDue(g)) {
    g.damage += g.poison;
    g.poison = 0;
  }
  afterDamage(g);
}
function nextRegionDue(g) {
  return (
    g.deck.length +
      (g.reserve !== null && !g.deadReserve && g.levels[g.reserve] > 0
        ? 1
        : 0) <
    5
  );
}
function afterDamage(g) {
  if (
    g.damage > 0 &&
    g.hand.some((id) => g.levels[id] > 0 && !g.hurt.includes(id))
  ) {
    g.phase = "damage";
    return;
  }
  if (g.stage === "dragon") {
    terminal(
      g,
      g.damage === 0,
      g.damage
        ? "The dragon broke through your armor."
        : "You survived the dragon’s last attack.",
    );
    return;
  }
  if (g.damage > 0) g.deck.splice(0, 4);
  if (g.poisoning) {
    g.poisoning = false;
    g.hurt = [];
    g.damage = 0;
    if (!g.hand.some((id) => g.levels[id]) || !g.deck.length) {
      g.region++;
      enterRegion(g);
    } else g.phase = "play";
    return;
  }
  if (g.poison && nextRegionDue(g)) {
    g.damage = g.poison;
    g.poison = 0;
    afterDamage(g);
    return;
  }
  g.phase = "upgrade";
}
export function soak(g, id) {
  if (
    g.phase !== "damage" ||
    !g.hand.includes(id) ||
    g.hurt.includes(id) ||
    !g.levels[id]
  )
    return;
  g.damage = Math.max(0, g.damage - protection(g, id));
  g.levels[id]--;
  g.hurt.push(id);
  if (!g.levels[id]) g.hand = g.hand.filter((c) => c !== id);
  afterDamage(g);
}
export function upgrade(g, id) {
  if (
    g.phase !== "upgrade" ||
    !g.hand.includes(id) ||
    g.hurt.includes(id) ||
    g.levels[id] >= 4
  )
    return;
  const cost = face(g, id).upgradeCost;
  if (cost > g.xp) return;
  g.xp -= cost;
  g.levels[id]++;
}
export function cleanup(g) {
  if (g.phase !== "upgrade") return;
  if (nextRegionDue(g)) {
    g.region++;
    enterRegion(g);
    return;
  }
  g.hand =
    g.reserve !== null && !g.deadReserve && g.levels[g.reserve]
      ? [g.reserve]
      : [];
  g.hand.push(...g.deck.splice(0, 4 - g.hand.length));
  prepare(g);
  if (g.poison) {
    g.damage = g.poison;
    g.poison = 0;
    g.damageElement = null;
    g.poisoning = true;
    afterDamage(g);
  }
}
