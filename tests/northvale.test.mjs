import test from "node:test";
import assert from "node:assert/strict";
import {
  newGame,
  cardOf,
  canFuse,
  face,
  preview,
  encounter,
  shiftDirection,
  resolve,
  soak,
  canSoak,
  cleanup,
} from "../public/game.mjs";
import { northBosses, northRegions, mages } from "../public/northvale.mjs";
const start = (party = mages, boss = "Merinus") =>
  newGame(boss, "Normal", false, false, { mages: party });
test("each mage replaces four distinct slots for either landscape", () => {
  for (const boss of ["Red Dragon", ...Object.keys(northBosses)])
    for (const mage of mages) {
      const g = start([mage], boss);
      assert.equal(
        g.hand.concat(g.deck).filter((id) => cardOf(g, id).mage === mage)
          .length,
        4,
      );
      for (let l = 1; l <= 4; l++) {
        g.levels.fill(l);
        for (let id = 0; id < 16; id++) {
          const f = face(g, id);
          assert.ok(
            f.encounterValue >= 1 &&
              f.encounterValue <= 4 &&
              Number.isFinite(f.boost),
          );
          assert.ok(
            f.basic.type && Number.isFinite(f.basic.value) && f.armorValue > 0,
          );
        }
      }
    }
});
test("Windwalker wraps, pursuers use adjacent enemy, shifting does not spend key", () => {
  const g = start();
  g.hand = [3, 0, 5, 9];
  g.deck = [8, 4, 1, 2];
  g.roles = [3, 0, 9];
  assert.equal(shiftDirection(g), -1);
  assert.equal(encounter(g).number, 1);
  g.shift = true;
  assert.equal(encounter(g).number, 4);
  assert.equal(preview(g).target, 9);
  g.deck[0] = 3;
  assert.equal(preview(g).pursuer, true);
  g.roles = [0, 5, 9];
  assert.equal(preview(g).pursuer, false);
});
test("colorless cards cannot fuse, multicolor cards can match either background", () => {
  const g = start();
  assert.equal(canFuse(g, 6, 14), false);
  g.levels.fill(3);
  assert.equal(canFuse(g, 2, 10), true);
});
test("unpaid reserve unit can soak its bill independently", () => {
  const g = start(["Noramir"]);
  g.hand = [0, 1, 2, 7];
  g.roles = [0, 1, 2];
  g.deck = [9, 3, 4, 5, 6, 8, 10, 11, 12, 13, 14, 15];
  g.units[7] = "initiative";
  const p = preview(g);
  assert.equal(p.unitCost, 4);
  resolve(g);
  for (let n = 0; g.phase === "damage" && n < 20; n++)
    soak(
      g,
      g.hand.find((id) => canSoak(g, id)),
    );
  assert.equal(g.phase, "upgrade");
  assert.equal(g.xp, Math.max(0, p.xp - 4));
});
test("all four bosses and party combinations progress to a terminal outcome", () => {
  for (const boss of Object.keys(northBosses))
    for (const party of [[], ...mages.map((m) => [m]), mages]) {
      const g = start(party, boss);
      let steps = 0;
      while (g.phase !== "end" && steps++ < 500) {
        if (g.phase === "play") {
          g.roles =
            g.region === 5
              ? [
                  g.hand[0] ?? null,
                  g.hand[2] ?? null,
                  g.hand[4] ?? null,
                  g.hand[1] ?? null,
                  g.hand[3] ?? null,
                  g.hand[5] ?? null,
                ]
              : [0, 1, 2].map((i) => g.hand[i] ?? null);
          assert.ok(Number.isFinite(preview(g).power));
          resolve(g);
        } else if (g.phase === "damage")
          soak(
            g,
            g.hand.find((id) => canSoak(g, id)),
          );
        else cleanup(g);
      }
      assert.equal(g.phase, "end");
    }
  assert.equal(northRegions.length, 5);
});
test("Merinus prevents both spells from soaking even if fast, and ignores matching armor", () => {
  const g = start([]);
  g.levels.fill(4);
  g.region = 5;
  g.stage = "dragon";
  g.hand = [0, 6, 2, 8, 12, 10, 1, 3];
  g.roles = [0, 6, 2, 8, 12, 10];
  assert.notEqual(preview(g).outcome, "Defeat");
  resolve(g);
  assert.equal(g.phase, "damage");
  assert.equal(canSoak(g, 0), false);
  assert.equal(canSoak(g, 8), false);
  assert.equal(g.pierce, true);
});
test("Blight Rider lets previously hurt cards soak poison and scores before poison", () => {
  const g = start([], "Blight Rider");
  g.stage = "dragon";
  g.region = 5;
  g.phase = "damage";
  g.hand = [0, 1, 2, 3, 4, 5, 6];
  g.hurt = [0];
  g.damage = 1;
  g.bossPoison = 9;
  g.levels.fill(4);
  soak(g, 1);
  assert.equal(g.damage, 9);
  assert.equal(g.beforePoison, 63);
  assert.ok(canSoak(g, 0) && canSoak(g, 1));
  while (g.phase === "damage")
    soak(
      g,
      g.hand.find((id) => canSoak(g, id)),
    );
  assert.equal(g.won, true);
  assert.equal(g.score, 63);
});
