import { replacements, northRegions, northBosses } from "./northvale.mjs";
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
export const bossOf = (g) => northBosses[g.dragon] || dragons[g.dragon];
export const regionOf = (g) => (g.northvale ? northRegions : regions)[g.region];
export const special = (g, id) =>
  replacements[id] && g.mages?.includes(replacements[id].mage);
export function cardOf(g, id) {
  if (!special(g, id)) return mageCards[id];
  const c = replacements[id];
  return { ...c, cardElement: c.levels[g.levels[id] || 1].background[0] };
}
export const face = (g, id) => cardOf(g, id)?.levels[g.levels[id]];
const background = (g, id) =>
  id == null
    ? null
    : g.fuse?.top === id
      ? g.fuse.element
      : g.colors?.[id] || cardOf(g, id).cardElement;
export function canFuse(g, a, b) {
  const printed = (id) =>
    face(g, id)?.background || [cardOf(g, id).cardElement];
  return printed(a).some((c) => c !== "colorless" && printed(b).includes(c));
}
const has = (e, trait) => e.ability === trait || e.abilities?.includes(trait);
export function shiftDirection(g) {
  if (
    g.levels[0] < 2 ||
    !special(g, 0) ||
    !g.hand.includes(0) ||
    g.region === 5
  )
    return 0;
  const role = g.roles.indexOf(0);
  return role === 1 || (role < 0 && g.levels[0] >= 4 && g.fuse?.bottom !== 0)
    ? -1
    : role === 2 || (role === 0 && g.levels[0] >= 3)
      ? 1
      : 0;
}
export const canSoak = (g, id) =>
  g.hand.includes(id) &&
  g.levels[id] > 0 &&
  !g.hurt.includes(id) &&
  !g.restricted?.includes(id);
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
  expansion = {},
) {
  if (!dragons[dragon] && !northBosses[dragon]) throw Error("Unknown dragon");
  const g = {
    dragon,
    mages: expansion.mages || [],
    northvale: !!northBosses[dragon],
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
  let armor = c.armorValue;
  if (!g.pierce && c.armorElement && c.armorElement === g.damageElement)
    armor = g.glass ? armor + 1 : armor * 2;
  return Math.max(0, armor + (!g.hurt.length ? g.firstArmor || 0 : 0));
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
  g.restricted = [];
  g.firstArmor = 0;
  g.pierce = false;
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
  g.colors = {};
  g.units = {};
  g.shift = false;
  g.convert = 0;
  g.etherChoice = {};
  g.seeing = "attack";
}
export function encounter(g) {
  if (g.region === 5) return bossOf(g);
  const k = face(g, g.deck[0]);
  const column =
    (k.encounterValue - 1 + (g.shift ? shiftDirection(g) : 0) + 4) % 4;
  return {
    ...regionOf(g)[k.encounterIcon === "enemy" ? "enemies" : "journeys"][
      column
    ],
    hard: k.hardship,
    number: column + 1,
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
  const reserve = reserves(g)[0];
  const active = (id) =>
    special(g, id) && g.hand.includes(id) && g.fuse?.bottom !== id;
  const rank = (id, values) => values[g.levels[id] - 1];
  const ether = (id) => face(g, id)?.enhanced;
  const chosenEther = (id) => g.etherChoice?.[id] || ether(id)?.element;
  const pursuer =
    g.region < 5 && [5, 15].some((id) => active(id) && g.roles[1] !== id);
  let power = 0,
    initiative = 0,
    firstArmor = 0,
    unitCost = 0;
  for (let i = 0; i < g.roles.length; i += 3) {
    const [spell, element, boost] = g.roles.slice(i, i + 3);
    if (spell === null) continue;
    const f = face(g, spell),
      el = background(g, element);
    const enhanced = (f.enhanced.colors || [f.enhanced.element]).includes(el);
    let a = enhanced ? f.enhanced : f.basic;
    let value = a.value,
      color = el;
    if (enhanced && spell === 5 && active(5) && el === "shadow")
      value = rank(5, [-2, 1, 3, 4]);
    if (enhanced && spell === 2 && active(2)) {
      const copied = ether(reserve);
      if (copied) {
        a = copied;
        color = chosenEther(reserve);
        value +=
          reserve === 5 && active(5) && color === "shadow"
            ? rank(5, [-2, 1, 3, 4])
            : a.value;
      } else value = 0;
    }
    const usesMove = a.type.includes("move") && (journey || has(e, "slow"));
    const matches = a.type.includes(action) || usesMove;
    if (enhanced && matches && (journey || !usesMove))
      enhancedElements.add(color);
    let bonus = face(g, boost)?.boost ?? 0;
    const speed = face(g, element)?.initiative ?? 0;
    if ([3, 8].includes(reserve) && active(reserve))
      bonus = Math.max(
        0,
        bonus - rank(reserve, reserve === 3 ? [3, 2, 2, 1] : [4, 3, 2, 2]),
      );
    if (e.hard === "night_travel") bonus = Math.max(0, bonus - speed);
    const quick = (!journey || pursuer) && g.speed[i / 3];
    initiative += speed + (quick ? bonus : 0);
    power += (matches ? value : 1) + (quick ? 0 : bonus);
    for (const id of [9, 11])
      if (active(id)) {
        if (element === id)
          power += rank(id, id === 9 ? [1, 2, 3, 3] : [2, 2, 3, 3]);
        else if (reserve === id && i === 0)
          power += rank(id, id === 9 ? [1, 1, 1, 2] : [0, 1, 1, 2]);
      }
    for (const id of [6, 14])
      if (active(id) && (spell === id || boost === id))
        initiative -= rank(id, id === 6 ? [4, 3, 2, 2] : [4, 3, 2, 1]);
    if (
      active(1) &&
      (g.region < 5 ||
        [spell, element, boost].includes(1) ||
        (reserve === 1 && i === 0))
    ) {
      const c = chosenEther(boost),
        n = rank(1, [4, 3, 2, 1]);
      if (c === "fire") firstArmor -= n;
      if (c === "lightning") initiative -= n;
      if (usesMove && ["water", "shadow"].includes(c)) power -= n;
    }
    if (active(12) && (spell === 12 || (reserve === 12 && i === 0))) {
      const type = face(g, boost)?.basic.type;
      const mode = type === "attack/move" ? g.seeing : type;
      if (mode === "attack" && !journey) power += rank(12, [1, 1, 2, 3]);
      if (mode === "move" && usesMove) power -= rank(12, [4, 2, 2, 1]);
    }
  }
  if (active(4)) {
    const c = chosenEther(reserve),
      n = rank(4, [0, 2, 3, 4]);
    if ((c === "fire" && !journey) || (c === "shadow" && journey)) power += n;
    if (c === "water") firstArmor += n;
    if (c === "lightning") initiative += n;
  }
  for (const id of [7, 13])
    if (active(id) && g.units?.[id] && g.levels[id] > 1) {
      const skill = g.units[id],
        n = rank(id, id === 7 ? [0, 2, 3, 4] : [0, 3, 3, 4]);
      if (skill === action) power += n;
      if (skill === "initiative") initiative += n;
      if (skill === "armor") firstArmor += n;
      const pos = g.roles.indexOf(id);
      unitCost += pos < 0 ? 4 : [2, 3, 1][pos % 3];
    }
  const rb = face(g, reserve)?.boost ?? 0,
    mpElement = e.mpElement ?? e.mpTiers?.[0][1];
  if (journey && enhancedElements.has(mpElement)) power += rb;
  const opposite = {
    fire: "water",
    water: "fire",
    lightning: "shadow",
    shadow: "lightning",
  };
  if (e.peril === "guarded" && enhancedElements.has(opposite[mpElement]))
    power -= g.region;
  if (!journey) {
    const armor = new Map((e.armor || []).map((a) => [a.element, a.value]));
    if (has(e, "adaptable"))
      for (const id of [g.roles[0], g.roles[2]])
        armor.set(background(g, id), e.armor[0].value);
    if (
      has(e, "fortified") &&
      ![g.roles[2], g.roles[5]].some((id) =>
        g.region === 5
          ? background(g, id) === e.armor[0].element
          : armor.has(background(g, id)),
      )
    )
      initiative -= g.region;
    for (const c of enhancedElements)
      if (armor.has(c))
        power -=
          armor.get(c) +
          (has(e, "evasive") ? Math.max(0, e.initiative - initiative) : 0);
  }
  power = Math.max(0, power);
  const convert = (damage) =>
    active(10) && g.roles.some((id, i) => id === 10 && i % 3 !== 2)
      ? Math.min(damage, g.convert || 0, rank(10, [1, 2, 2, 3]))
      : 0;
  const pierce = !journey && has(e, "pierce");
  if (g.region === 5) {
    const tiers = journey ? e.mpTiers : e.hpTiers,
      tier = tiers.filter((t) => power >= t[0]).at(-1);
    const combat =
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
      damage: combat - convert(combat) + (journey ? 0 : 2 * unitCost),
      element: journey ? null : e.earlyDamage.element,
      unitCost,
      firstArmor,
      pierce,
      restrict: pierce,
      bossPoison: !journey && has(e, "poison") ? 9 : 0,
    };
  }
  const land = regionOf(g),
    paired = land.enemies[e.number - 1];
  const target = journey
    ? e.mp + (e.peril === "steep" ? rb : 0)
    : e.hp + (pursuer ? Math.ceil(g.region / 2) : 0);
  const full = power >= target,
    win = power >= Math.ceil(target / 2);
  const early =
    !journey &&
    (initiative < e.initiative ||
      (has(e, "ranged") && !(g.evade && reserve !== undefined)));
  const combat = !journey && !full,
    hits = Number(early) + Number(combat);
  let time =
    (journey && !full ? e.timePenalty : 0) + (e.hard === "hazards" ? hits : 0);
  if (
    e.peril === "labyrinth" &&
    [0, 2].some(
      (n) =>
        land.journeys[(e.number + n) % 4].mpElement ===
        background(g, g.roles[2]),
    )
  )
    time++;
  const summoned =
    has(e, "summon") &&
    land.enemies.find((x) => x.attackElement === background(g, reserve));
  const attack = summoned ? summoned.attack : e.attack;
  const enemyDamage =
    (early
      ? (attack +
          (has(e, "aggressive") ? 1 : 0) -
          (has(e, "defensive") ? 1 : 0)) *
        (e.hard === "ambush" ? 2 : 1)
      : 0) + (combat ? attack : 0);
  const traded = convert(enemyDamage);
  const camp =
    journey &&
    !full &&
    e.peril === "camp" &&
    land.enemies.find((x) => x.attackElement === background(g, g.roles[0]));
  const chase = journey && pursuer && initiative < paired.initiative;
  const damage =
    enemyDamage -
    traded +
    (journey && !full && e.peril === "treacherous" ? 1 : 0) +
    (e.hard === "storm" ? time : 0) +
    (camp ? camp.attack : 0) +
    (chase ? paired.attack : 0);
  return {
    power,
    initiative,
    target,
    outcome: full ? "Complete victory" : win ? "Narrow victory" : "Loss",
    xp: (win ? e.xp : 0) + traded,
    time,
    damage,
    element:
      e.attackElement ||
      camp?.attackElement ||
      (chase ? paired.attackElement : null),
    poison: has(e, "poison") ? hits : 0,
    discard: (early && has(e, "freeze")) || (g.evade && has(e, "ranged")),
    unitCost,
    firstArmor,
    pierce,
    restrict: pierce && combat,
    pursuer,
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
    place: g.region === 5 ? g.stage : regionOf(g).name,
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
    if (g.hand.length && p.unitCost) {
      g.damage = 2 * p.unitCost;
      g.damageElement = null;
      g.phase = "damage";
      g.journeyDebt = true;
    }
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
  g.firstArmor = p.firstArmor;
  g.pierce = p.pierce;
  g.restricted = p.restrict ? g.roles.filter((id, i) => i % 3 === 0) : [];
  g.unitBill = g.region === 5 ? 0 : p.unitCost;
  g.bossPoison = p.bossPoison || 0;
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
  if (g.damage > 0 && g.hand.some((id) => canSoak(g, id))) {
    g.phase = "damage";
    return;
  }
  if (g.journeyDebt) {
    g.journeyDebt = false;
    g.hurt = [];
    if (g.damage > 0 || !g.hand.length)
      terminal(g, false, "Your remaining hand could not pay the units.");
    else g.phase = "play";
    return;
  }
  if (g.stage === "dragon") {
    if (!g.damage && g.bossPoison) {
      g.beforePoison = g.levels.reduce((a, b) => a + b, 0);
      g.damage = g.bossPoison;
      g.bossPoison = 0;
      g.hurt = [];
      g.restricted = [];
      g.firstArmor = 0;
      g.pierce = false;
      g.damageElement = null;
      afterDamage(g);
      return;
    }
    terminal(
      g,
      g.damage === 0,
      g.damage
        ? "The dragon broke through your armor."
        : "You survived the dragon’s last attack.",
    );
    if (g.won && g.beforePoison != null) g.score = g.beforePoison;
    return;
  }
  if (g.damage > 0) {
    for (const id of g.hand)
      if (!g.hurt.includes(id)) {
        g.levels[id]--;
        g.hurt.push(id);
      }
    g.hand = g.hand.filter((id) => g.levels[id] > 0);
    g.deck.splice(0, 4);
  }
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
  if (g.unitBill) {
    const debt = Math.max(0, g.unitBill - g.xp);
    g.xp = Math.max(0, g.xp - g.unitBill);
    g.unitBill = 0;
    if (debt) {
      g.previousHurt = [...g.hurt];
      g.hurt = [];
      g.restricted = [];
      g.firstArmor = 0;
      g.pierce = false;
      g.damageElement = null;
      g.damage = debt;
      afterDamage(g);
      return;
    }
  }
  if (g.previousHurt) {
    g.hurt = [...new Set([...g.hurt, ...g.previousHurt])];
    delete g.previousHurt;
  }
  g.phase = "upgrade";
}
export function soak(g, id) {
  if (g.phase !== "damage" || !g.hand.includes(id) || !canSoak(g, id)) return;
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
