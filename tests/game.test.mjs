import test from "node:test";
import assert from "node:assert/strict";
import {
  newGame,
  mageCards,
  regions,
  dragons,
  face,
  encounter,
  assign,
  ready,
  preview,
  resolve,
  soak,
  upgrade,
  cleanup,
  divert,
  regroup,
  shuffle,
} from "../public/game.mjs";

test("all printed card positions are addressable", () => {
  assert.equal(mageCards.length, 16);
  for (const c of mageCards)
    for (let n = 1; n <= 4; n++) {
      const f = c.levels[n];
      assert.ok(
        f.armorValue > 0 && f.encounterValue <= 4 && f.encounterValue >= 1,
      );
      for (const r of Object.values(regions))
        assert.ok(
          r[f.encounterIcon === "enemy" ? "enemies" : "journeys"][
            f.encounterValue - 1
          ],
        );
    }
  assert.equal(Object.keys(dragons).length, 4);
});
test("divert spends the selected card and key without refilling", () => {
  const g = newGame("Red Dragon"),
    key = g.deck[1];
  divert(g, g.hand[1]);
  assert.equal(g.hand.length, 3);
  assert.equal(g.deck[0], key);
  divert(g, g.hand[1]);
  divert(g, g.hand[1]);
  assert.equal(g.hand.length, 2);
  assign(g, 0, g.hand[0]);
  assign(g, 2, g.hand[1]);
  assert.ok(ready(g));
});
test("red dragon final journey tiers and victory after soaking damage", () => {
  const g = newGame("Red Dragon");
  g.region = 5;
  g.stage = "approach";
  g.levels.fill(4);
  g.hand = [1, 3, 5, 13, 15, 14, 4];
  g.deck = [0, 2, 6, 7, 8, 9, 10, 11, 12];
  g.roles = [1, 3, 5, 13, 15, 14];
  assert.ok(ready(g));
  assert.ok(preview(g).power >= 28);
  resolve(g);
  assert.equal(g.stage, "dragon");
  assert.equal(g.hand.length, 8);
  g.roles = [0, 6, 2, 8, 12, 10];
  assert.ok(ready(g));
  assert.ok(preview(g).power >= 22);
  resolve(g);
  while (g.phase === "damage") {
    const id = g.hand
      .filter((c) => !g.hurt.includes(c))
      .sort((a, b) => face(g, b).armorValue - face(g, a).armorValue)[0];
    soak(g, id);
  }
  assert.ok(g.won);
  assert.equal(
    g.score,
    g.levels.reduce((a, b) => a + b),
  );
});
test("regroup preserves the unexamined deck order and discards exactly one card", () => {
  const g = newGame("Blue Dragon");
  g.region = 5;
  g.stage = "approach";
  g.hand = [0, 1, 2, 3, 4, 5, 6];
  g.deck = [7, 8, 9, 10, 11, 12, 13, 14, 15];
  regroup(g, 2);
  assert.deepEqual(g.hand, [7, 8, 9, 10, 11, 12, 13]);
  assert.equal(g.deck.length, 8);
  assert.ok(!g.deck.includes(2));
  const before = JSON.stringify(g);
  regroup(g, 7);
  assert.equal(JSON.stringify(g), before);
});
test("normal expeditions reach a terminal result for every dragon", () => {
  for (const boss of Object.keys(dragons))
    for (let run = 0; run < 6; run++) {
      const g = newGame(boss);
      for (let step = 0; g.phase !== "end" && step < 350; step++) {
        if (g.phase === "play") {
          const ids = shuffle(g.hand);
          const slots = g.region === 5 ? [0, 3, 1, 4, 2, 5] : [0, 1, 2];
          slots
            .slice(0, ids.length)
            .forEach((slot, i) => assign(g, slot, ids[i]));
          assert.ok(ready(g));
          assert.ok(encounter(g));
          resolve(g);
        } else if (g.phase === "damage") {
          soak(
            g,
            g.hand.find((c) => !g.hurt.includes(c)),
          );
        } else {
          for (const c of g.hand) upgrade(g, c);
          cleanup(g);
        }
        assert.ok(
          g.levels.every((l) => Number.isInteger(l) && l >= 0 && l <= 4),
        );
        assert.equal(
          new Set([...g.hand, ...g.deck]).size,
          g.hand.length + g.deck.length,
        );
      }
      assert.equal(g.phase, "end");
    }
});

test("difficulty setup restricts choices to the drawn cards and preserves levels", async () => {
  const { difficulties, train } = await import("../public/game.mjs");
  for (const [difficulty, delta] of Object.entries(difficulties)) {
    const g = newGame("Red Dragon", difficulty);
    if (delta) {
      assert.equal(g.phase, "training");
      for (const id of g.candidates.slice(0, Math.abs(delta))) train(g, id);
    }
    assert.equal(g.phase, "play");
    assert.equal(g.hand.length, 4);
    assert.equal(
      g.levels.reduce((a, b) => a + b),
      32 + delta,
    );
  }
});

test("reserve, initiative and enhanced attack on a Slow enemy", () => {
  const g = newGame("Red Dragon");
  g.region = 2;
  g.deck = [10, 12, 13, 14, 15];
  g.hand = [1, 2, 3, 4];
  g.roles = [1, 2, 3];
  assert.equal(encounter(g).ability, "slow");
  assert.equal(preview(g).power, face(g, 1).enhanced.value + face(g, 3).boost);
});
test("Poison carries to the new hand only if another encounter fits", () => {
  for (const end of [false, true]) {
    const g = newGame("Blue Dragon");
    g.region = 4;
    g.levels[10] = 1;
    g.deck = end ? [10] : [10, 5, 6, 7, 8, 9];
    g.hand = [1, 0, 3, 4];
    g.roles = [1, 0, 3];
    assert.equal(encounter(g).ability, "poison");
    const attack = preview(g);
    resolve(g);
    assert.equal(g.damage, attack.damage + (end ? attack.poison : 0));
    while (g.phase === "damage")
      soak(
        g,
        g.hand.find((id) => !g.hurt.includes(id)),
      );
    cleanup(g);
    if (end) assert.equal(g.region, 5);
    else {
      assert.equal(g.phase, "damage");
      assert.ok(g.poisoning);
      assert.equal(g.damage, attack.poison);
    }
  }
});
