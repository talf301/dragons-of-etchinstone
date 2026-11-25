# Dragons of Etchinstone

[Play in Safari](https://talf301.github.io/dragons-of-etchinstone/)

An unofficial touch-first implementation of Joe Klipfel’s solo game. This standalone app runs in Safari, stores the current campaign on the device, and caches its interface, deck and original landscape art for offline play.

Serve the public directory over HTTPS. For local development, run `python3 -m http.server 8440 --bind 127.0.0.1 --directory public` and visit localhost:8440. On iPhone, open the served HTTPS address in Safari, choose Share → Add to Home Screen, and open the installed app online once. Campaign storage belongs to the browser or installed app and the exact origin.

## Rules and sources

The base campaign offers all six starting difficulties, Cavalier and Glass Cannon, four region passes, 16 mage cards with four levels each, and a two-part dragon battle. The player controls assignments, boost allocation, diversion, fusion, damage, upgrades and regrouping. Northvale adds the four original Ether Mages, optional parties, four regions and four bosses. Select the campaign and mages independently at setup. Each mage replaces four cards. The app resolves mage abilities, enemy abilities and journey perils during play.

- [Chip Theory Games rulebooks](https://chiptheorygames.com/pages/support/dragons-of-etchinstone)
- [Card statistics reference](https://github.com/Pelody/Dragons_of_Etchinstone/blob/HEAD/index.html)
- [Publisher-maintained digital rules](https://rules.dized.com/en/game/CskMrsIiT4S_UgD5seCOUQ/dragons-of-etchinstone)

- [Printed card reference used to reconcile numerical differences](https://github.com/beamer159/etchinstone/tree/HEAD/images)

Run the engine checks with `node --test tests/*.mjs`.

Publish changes from this repository with `git subtree push --prefix public origin gh-pages` after the tests pass.

Tap Enlarge on a mage card to see its original print-and-play face at its current level. The game fetches the three [pinned print sheets](https://github.com/beamer159/etchinstone/tree/fb0d656638712b1a8f4dd11863ee73f4dfc1265e/images) on first online use and caches them on the device for offline play. Northvale follows the original print-and-play cards and uses the app’s existing role names. Its 64 level faces are also available as a personal art pack. Select the JSON file under Ether mages during setup, or in Help during a Northvale expedition. The app stores the imported art on that device for offline play. Cards display their statistics and abilities before importing art.
