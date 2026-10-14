# Runout

Pick two poker hands (and an optional board), deal a handful of runouts street by street, and compare what actually happened to exact equity from enumerating every possible board.

Open `index.html` in a browser. No build step, no dependencies.

## Layout

- `index.html` – page markup
- `styles.css` – all styles
- `js/util.js` – DOM and number-formatting helpers
- `js/engine.js` – hand evaluator, random runouts, exact enumeration (also run in a Web Worker)
- `js/cards.js` – card names, card faces, hand labels and descriptions
- `js/setup.js` – matchup panel: hands, board, card picker, runout count
- `js/runouts.js` – starting a matchup, exact-odds worker, street-by-street dealing animation
- `js/results.js` – results summary and verdict
- `js/main.js` – event wiring and first run

Scripts are plain (non-module) files loaded in that order and share globals, so the page still works opened straight from disk.
