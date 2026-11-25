# Dragons of Etchinstone

[Play in Safari](https://talf301.github.io/dragons-of-etchinstone/)

An unofficial touch-first implementation of Joe Klipfel’s solo game. This standalone app runs in Safari, stores the current campaign on the device, and caches its interface, deck and original landscape art for offline play.

Serve the public directory over HTTPS. For local development, run `python3 -m http.server 8440 --bind 127.0.0.1 --directory public` and visit localhost:8440. On iPhone, open the served HTTPS address in Safari, choose Share → Add to Home Screen, and open the installed app online once. Campaign storage belongs to the browser or installed app and the exact origin.

## Rules and sources

The base campaign offers all six starting difficulties, Cavalier and Glass Cannon, four region passes, 16 mage cards with four levels each, and a two-part dragon battle. The player controls assignments, boost allocation, diversion, fusion, damage, upgrades and regrouping. Optional multiplayer and expansion rules are outside this implementation.

- [Chip Theory Games rulebooks](https://chiptheorygames.com/pages/support/dragons-of-etchinstone)
- [Card statistics reference](https://github.com/Pelody/Dragons_of_Etchinstone/blob/main/index.html)
- [Publisher-maintained digital rules](https://rules.dized.com/en/game/CskMrsIiT4S_UgD5seCOUQ/dragons-of-etchinstone)

- [Printed card reference used to reconcile numerical differences](https://github.com/beamer159/etchinstone/tree/main/images)

Run the engine checks with `node --test tests/*.mjs`.
